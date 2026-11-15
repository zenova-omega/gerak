"""Mount router at /admin/pulse (standalone and embedded API prefixes handled by parent)."""
import re
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from ..database import get_db
from ..services.pulse_evaluation import evaluate_sentiment
from ..services.pulse_identity import require_pulse_access
from ..services.pulse_measures import period_closed_bounds

router = APIRouter(dependencies=[Depends(require_pulse_access)])


def date_bound(raw, name, *, end=False):
    if raw is None:
        return None, None
    try:
        if not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}', raw):
            raise ValueError
        day = date.fromisoformat(raw)
        utc = period_closed_bounds(None, day)[1] if end else period_closed_bounds(day, None)[0]
        return day, utc
    except (ValueError, OverflowError):
        raise HTTPException(422, f'{name} must be a representable YYYY-MM-DD date') from None


@router.get('/evaluation')
async def get_evaluation(topic_id: str = Query(..., min_length=1, max_length=36),
                         from_date: str | None = Query(None), to_date: str | None = Query(None),
                         platforms: str | None = Query(None, max_length=500), db=Depends(get_db)):
    first, start = date_bound(from_date, 'from_date')
    last, end = date_bound(to_date, 'to_date', end=True)
    if first and last and first > last:
        raise HTTPException(422, 'from_date must be on or before to_date')
    selected = None if platforms is None else sorted({p.strip() for p in platforms.split(',') if p.strip()})
    result = await evaluate_sentiment(db, topic_id, start=start, end=end, platforms=selected)
    result['period'] = {'from': from_date, 'to': to_date, 'timezone': 'Asia/Jakarta', 'basis': 'published_at'}
    return result
