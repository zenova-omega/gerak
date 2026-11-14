"""Operator workflow, separate from alert acknowledgment and collection state."""
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, update

from ..models.pulse_monitor import PulseAlert


def workflow_dict(alert):
    # Legacy alerts remain unchanged on reads, including previously acknowledged alerts.
    return (alert.detail or {}).get('workflow') or {
        'status': 'new', 'assignee': None, 'revision': 0, 'history': [],
    }


async def update_workflow(db, alert_id, *, status, assignee, expected_revision, actor):
    # Acquire a write lock BEFORE reading JSON. A no-op UPDATE works on SQLite
    # (which ignores FOR UPDATE) and PostgreSQL. Held until the caller commits.
    locked = await db.execute(update(PulseAlert).where(PulseAlert.id == alert_id)
                              .values(id=PulseAlert.id).execution_options(synchronize_session=False))
    if not locked.rowcount:
        raise HTTPException(404, 'Alert not found')
    alert = (await db.execute(select(PulseAlert).where(PulseAlert.id == alert_id)
                              .execution_options(populate_existing=True))).scalar_one()
    current = workflow_dict(alert)
    if expected_revision != current['revision']:
        raise HTTPException(409, 'Alert telah diubah pengguna lain. Muat ulang status sebelum menyimpan.')
    before = {key: current[key] for key in ('status', 'assignee')}
    after = {'status': status, 'assignee': assignee.strip() or None if assignee is not None else None}
    if before != after:
        event = {'actor': actor, 'timestamp': datetime.now(timezone.utc).isoformat(),
                 'from': before, 'to': after}
        workflow = {**after, 'revision': current['revision'] + 1,
                    'history': [*current['history'], event]}
        alert.detail = {**(alert.detail or {}), 'workflow': workflow}
        await db.flush()
    return alert
