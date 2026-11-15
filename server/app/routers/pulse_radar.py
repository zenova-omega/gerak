"""Beranda: the issue radar and the project rows. Reading is open to every signed-in role and never starts a
collection; starting a refresh by hand is for those who may change settings (the access check refuses the rest)."""
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session, get_db
from ..services.pulse_identity import require_pulse_access
from ..services.pulse_radar import held, issue_detail, latest, refresh

router = APIRouter(dependencies=[Depends(require_pulse_access)])


@router.get('/radar')
async def radar(db: AsyncSession = Depends(get_db)):
    return await latest(db, datetime.utcnow())


@router.get('/radar/issues/{key}')
async def radar_issue(key: str, db: AsyncSession = Depends(get_db)):
    detail = await issue_detail(db, key[:40])
    if detail is None:
        raise HTTPException(404, 'Isu tidak ada pada pembaruan ini.')
    return detail


@router.post('/radar/refresh')
async def radar_refresh(background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    if await held(db, datetime.utcnow()):
        raise HTTPException(409, 'Pembaruan sedang berjalan.')
    background.add_task(refresh, async_session, force=True, fresh_x=True)
    return {'state': 'started'}


@router.get('/home/projects')
async def home_projects(db: AsyncSession = Depends(get_db)):
    from ..services.pulse_home import project_rows
    return await project_rows(db, datetime.utcnow())
