"""Mount at /api/admin/pulse/response-analysis; GET never queues inference."""
from fastapi import APIRouter, Depends, Query
from ..database import get_db
from ..services.pulse_identity import require_pulse_access
from ..services.pulse_response_analysis import results

router=APIRouter(dependencies=[Depends(require_pulse_access)])


@router.get('')
async def get_response_analysis(topic_id: str = Query(...,min_length=1),
                                from_date: str | None = Query(None,alias='from'),
                                to_date: str | None = Query(None,alias='to'),
                                platform: str | None = None, db=Depends(get_db)):
    return await results(db,topic_id,from_date,to_date,platform)
