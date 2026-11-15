"""What a refused provider request does to collection: a brief wait lifts by itself, an empty balance lifts once it
has been topped up, and only a credential problem waits for a person."""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import update

from app.models.pulse_monitor import WorkerPolicy
from app.models.pulse_sources import SourceAccount
from app.services import pulse_provider_block as block
from app.services.pulse_monitor import ensure_policies

NOW = datetime(2026, 11, 14, 9, 0)


async def policy(db, **values):
    await ensure_policies(db)
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == 'xpoz').values(**{'daily_limit': -1, 'blocked_reason': None, 'blocked_until': None, **values}))
    return await db.get(WorkerPolicy, 'xpoz', populate_existing=True)


def test_each_refusal_blocks_for_as_long_as_its_cause_lasts():
    assert block.block_values('rate_limited', NOW) == {'blocked_reason': 'rate_limited', 'blocked_until': NOW + timedelta(minutes=15)}
    assert block.block_values('pending', NOW) == {'blocked_reason': 'pending', 'blocked_until': NOW + timedelta(minutes=5)}
    assert block.block_values('access_or_quota_restricted', NOW) == {'blocked_reason': 'access_or_quota_restricted', 'blocked_until': None}
    assert block.block_values('authentication_failed', NOW) == {'blocked_reason': 'authentication_failed', 'blocked_until': None}
    assert block.block_values('timeout', NOW) is None and block.block_values('provider_error', NOW) is None    # retried, never a block


@pytest.mark.asyncio
async def test_a_brief_wait_lifts_by_itself_and_nothing_else_does(db):
    await policy(db, **block.block_values('rate_limited', NOW))
    assert await block.lift_expired(db, NOW + timedelta(minutes=14)) == 0
    assert (await db.get(WorkerPolicy, 'xpoz', populate_existing=True)).blocked_reason == 'rate_limited'
    assert await block.lift_expired(db, NOW + timedelta(minutes=15)) == 1
    row = await db.get(WorkerPolicy, 'xpoz', populate_existing=True)
    assert row.blocked_reason is None and row.blocked_until is None
    await policy(db, **block.block_values('authentication_failed', NOW))
    assert await block.lift_expired(db, NOW + timedelta(days=30)) == 0            # a rejected key waits for a person


@pytest.mark.asyncio
async def test_an_empty_balance_lifts_only_after_a_top_up(db):
    account = lambda credits, extra=0: {'status': 'verified', 'credits_remaining': credits, 'extra_credits_remaining': extra}
    await policy(db, **block.block_values('access_or_quota_restricted', NOW))
    assert await block.lift_after_top_up(db, account(0), account(0)) is False       # still empty
    assert await block.lift_after_top_up(db, account(40), account(40)) is False     # some credit left but the request was refused: nothing changed
    assert await block.lift_after_top_up(db, account(40), account(31)) is False     # going down is not a top-up
    assert await block.lift_after_top_up(db, None, account(7500)) is False          # no earlier reading: no proof of a top-up
    assert (await db.get(WorkerPolicy, 'xpoz', populate_existing=True)).blocked_reason == 'access_or_quota_restricted'
    assert await block.lift_after_top_up(db, account(0), account(0, extra=500)) is True     # extra credit counts
    assert (await db.get(WorkerPolicy, 'xpoz', populate_existing=True)).blocked_reason is None
    await policy(db, **block.block_values('plan_restricted', NOW))
    assert await block.lift_after_top_up(db, account(3), account(7503)) is True
    await policy(db, **block.block_values('authentication_failed', NOW))
    assert await block.lift_after_top_up(db, account(0), account(7500)) is False    # more credit does not fix a rejected key
    await policy(db, **block.block_values('rate_limited', NOW))
    assert await block.lift_after_top_up(db, account(0), account(7500)) is False    # that one lifts by the clock


@pytest.mark.asyncio
async def test_the_balance_status_says_when_to_top_up_and_never_names_the_provider(db):
    await policy(db)
    snapshot = await db.get(SourceAccount, 'xpoz')
    if snapshot is None:
        snapshot = SourceAccount(provider='xpoz')
        db.add(snapshot)
    snapshot.checked_at, snapshot.detail = NOW, {'status': 'verified', 'plan': 'Pro', 'credits_remaining': 5832, 'extra_credits_remaining': 0}
    await db.flush()
    status = await block.balance_status(db)
    assert status == {'state': 'ok', 'credits_remaining': 5832, 'checked_at': NOW, 'until': None}

    snapshot.detail = {'status': 'verified', 'plan': 'Pro', 'credits_remaining': 0, 'extra_credits_remaining': 0}
    await db.flush()
    assert (await block.balance_status(db))['state'] == 'empty'                      # the balance itself reads zero

    snapshot.detail = {'status': 'verified', 'plan': 'Pro', 'credits_remaining': 12, 'extra_credits_remaining': 0}
    await policy(db, **block.block_values('access_or_quota_restricted', NOW))
    await db.flush()
    assert (await block.balance_status(db))['state'] == 'empty'                      # a little is left, but the provider refuses requests

    await policy(db, **block.block_values('authentication_failed', NOW))
    assert (await block.balance_status(db))['state'] == 'access'
    await policy(db, **block.block_values('rate_limited', NOW))
    paused = await block.balance_status(db)
    assert paused['state'] == 'paused' and paused['until'] == NOW + timedelta(minutes=15)
    assert 'xpoz' not in str(await block.balance_status(db)).lower()


def test_a_daily_api_quota_lifts_by_the_clock_not_by_a_top_up():
    # YouTube's units come back every day; no balance reading will ever say so.
    assert block.block_values('access_or_quota_restricted', NOW, 'youtube') == {'blocked_reason': 'access_or_quota_restricted', 'blocked_until': NOW + timedelta(hours=6)}
    assert block.block_values('access_or_quota_restricted', NOW, 'xpoz') == {'blocked_reason': 'access_or_quota_restricted', 'blocked_until': None}
    assert block.block_values('authentication_failed', NOW, 'youtube')['blocked_until'] is None
