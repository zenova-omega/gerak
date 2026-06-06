from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..database import get_db
from ..models.user import User
from ..models.xp import XPTransaction
from ..models.survey import Survey, SurveyResponse, SurveyAnswer
from ..schemas import SurveyRespondRequest
from ..middleware.auth import get_current_user
from ..services.survey import survey_dict

router = APIRouter()

SURVEY_XP = 50


@router.get("/active")
async def active_surveys(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    surveys = (await db.execute(
        select(Survey).where(Survey.status == "open").options(selectinload(Survey.questions))
    )).scalars().all()
    answered = set((await db.execute(
        select(SurveyResponse.survey_id).where(SurveyResponse.user_id == user.id)
    )).scalars().all())
    return [survey_dict(s) for s in surveys if s.id not in answered]


@router.get("/{survey_id}")
async def get_survey(survey_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    survey = (await db.execute(
        select(Survey).where(Survey.id == survey_id).options(selectinload(Survey.questions))
    )).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey tidak ditemukan")
    return survey_dict(survey)


@router.post("/{survey_id}/respond")
async def respond(survey_id: str, req: SurveyRespondRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    survey = (await db.execute(select(Survey).where(Survey.id == survey_id))).scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey tidak ditemukan")
    if survey.status != "open":
        raise HTTPException(status_code=400, detail="Survey tidak aktif")

    existing = (await db.execute(
        select(SurveyResponse).where(SurveyResponse.survey_id == survey_id, SurveyResponse.user_id == user.id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Anda sudah mengisi survey ini")

    resp = SurveyResponse(survey_id=survey_id, user_id=user.id)
    db.add(resp)
    await db.flush()
    for a in req.answers:
        db.add(SurveyAnswer(response_id=resp.id, question_id=a.question_id, value={"value": a.value}))

    user.xp += SURVEY_XP
    db.add(XPTransaction(
        user_id=user.id, amount=SURVEY_XP, source="survey",
        mission_id=survey.mission_id, description=f"Survey: {survey.title}",
    ))
    await db.flush()
    return {"response_id": resp.id, "xp_awarded": SURVEY_XP}
