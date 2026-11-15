"""What a refused provider request does to collection, and what lifts it again.

Collection is not held back by a local allowance. It stops only when the provider itself refuses, and for as long as the
cause lasts: a request to wait lifts by the clock, an empty balance lifts once the balance has been topped up, and a
rejected credential waits for a person. Analysis runs on stored data and never depends on any of this."""
from datetime import timedelta

from sqlalchemy import select, update

from ..models.pulse_monitor import WorkerPolicy
from ..models.pulse_sources import SourceAccount

HUMAN = ('authentication_failed', 'not_configured')          # someone has to fix the credential
QUOTA = ('access_or_quota_restricted', 'plan_restricted')    # balance or plan: lifts once the balance has grown
BRIEF = {'rate_limited': 15 * 60, 'pending': 5 * 60}         # the provider asked us to wait: seconds until we ask again
DAILY = {'youtube': 6 * 3600}                              # a quota the provider refills every day: ask again after this long
BLOCKING = HUMAN + QUOTA + tuple(BRIEF)


def block_values(code, now, provider=None):
    """Column values for a policy after a refusal with `code`, or None when that refusal does not block the lane."""
    if code in BRIEF:
        return {'blocked_reason': code, 'blocked_until': now + timedelta(seconds=BRIEF[code])}
    if code in QUOTA and provider in DAILY:
        return {'blocked_reason': code, 'blocked_until': now + timedelta(seconds=DAILY[provider])}
    if code in HUMAN or code in QUOTA:
        return {'blocked_reason': code, 'blocked_until': None}
    return None


async def lift_expired(db, now):
    """Clear waits whose time has passed. Reads first: an UPDATE that changes nothing still takes SQLite's single write lock."""
    due = (await db.execute(select(WorkerPolicy.provider).where(WorkerPolicy.blocked_until.is_not(None), WorkerPolicy.blocked_until <= now))).scalars().all()
    if due:
        await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider.in_(due)).values(blocked_reason=None, blocked_until=None))
    return len(due)


def balance_of(detail):
    """Credits the account can still spend, or None when the reading is not a verified one."""
    if not isinstance(detail, dict) or detail.get('status') != 'verified':
        return None
    values = [detail.get(key) for key in ('credits_remaining', 'extra_credits_remaining')]
    known = [value for value in values if isinstance(value, int) and not isinstance(value, bool)]
    return sum(known) if known else None


async def lift_after_top_up(db, before, after, provider='xpoz'):
    """Reopen a lane closed for balance or plan once two readings show the balance has grown.
    More credit is the evidence of a top-up; a balance that only fell, or a first reading, proves nothing and changes nothing."""
    was, now_has = balance_of(before), balance_of(after)
    if was is None or now_has is None or now_has <= was:
        return False
    policy = await db.get(WorkerPolicy, provider, populate_existing=True)
    if policy is None or policy.blocked_reason not in QUOTA:
        return False
    await db.execute(update(WorkerPolicy).where(WorkerPolicy.provider == provider).values(blocked_reason=None, blocked_until=None))
    return True


async def balance_status(db, provider='xpoz'):
    """What the app shell needs to tell people about collection, without naming the provider.
    `empty`: top up to continue. `access`: an administrator has to check the connection. `paused`: a short wait that ends at `until`."""
    policy = await db.get(WorkerPolicy, provider, populate_existing=True)
    account = await db.get(SourceAccount, provider, populate_existing=True)
    balance = balance_of(account.detail if account else None)
    reason = policy.blocked_reason if policy else None
    state = 'access' if reason in HUMAN else 'empty' if reason in QUOTA or balance == 0 else 'paused' if reason in BRIEF else 'ok'
    return {'state': state, 'credits_remaining': balance, 'checked_at': account.checked_at if account else None,
            'until': policy.blocked_until if policy and state == 'paused' else None}
