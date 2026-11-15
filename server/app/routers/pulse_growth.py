"""Mount with prefix /admin/pulse (or /api/admin/pulse in GERAK)."""
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.pulse import WatchTopic
from ..services.pulse_growth import pulse_growth
from ..services.pulse_measures import period_closed_bounds
from ..services.pulse_identity import require_pulse_access


class MetricGrowth(BaseModel):
    previous: int | None
    latest: int | None
    delta: int | None
    rate_per_hour: float | None
    reset_detected: bool


class PostAvailability(BaseModel):
    growth: bool
    acceleration: bool
    first_observed_growth: bool
    reason: str | None


class PostGrowth(BaseModel):
    id: str
    topic_id: str
    platform: str
    url: str
    title: str | None
    author: str | None
    published_at: str | None
    snapshot_count: int
    distinct_observation_count: int
    previous_observed_at: str | None
    latest_observed_at: str | None
    delta_engagement: int | None
    elapsed_hours: float | None
    rate_per_hour: float | None
    acceleration_per_hour_squared: float | None
    engagement_metrics: list[str]
    reset_detected: bool
    first_observed_growth_at: str | None
    metrics: dict[str, MetricGrowth]
    availability: PostAvailability


class GrowthAvailability(BaseModel):
    source: str
    total_posts: int
    posts_with_snapshots: int
    posts_with_growth: int
    posts_with_acceleration: int
    posts_with_first_observed_growth: int
    deduplicated_posts: int
    growth_start_basis: str


class GrowthResponse(BaseModel):
    topic_id: str | None
    period: dict[str, str | None]
    posts: list[PostGrowth]
    availability: GrowthAvailability


router = APIRouter(dependencies=[Depends(require_pulse_access)])


@router.get('/growth', response_model=GrowthResponse)
async def get_growth(
    topic_id: str | None = Query(None, min_length=1),
    date_from: date | None = Query(None, alias='from'),
    date_to: date | None = Query(None, alias='to'),
    db: AsyncSession = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, 'from must be on or before to')
    if topic_id and await db.get(WatchTopic, topic_id) is None:
        raise HTTPException(404, 'Topic not found')
    start, end = period_closed_bounds(date_from, date_to)
    result = await pulse_growth(db, topic_id, start=start, end=end)
    result['period'] = {'from': date_from.isoformat() if date_from else None,
                        'to': date_to.isoformat() if date_to else None,
                        'timezone': 'Asia/Jakarta', 'basis': 'published_at'}
    return result
