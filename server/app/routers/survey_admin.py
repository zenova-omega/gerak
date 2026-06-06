from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.mission import Mission, MissionType, MissionStatus
from ..models.survey import Survey, SurveyQuestion, SurveyResponse, SurveyAnswer
from ..schemas import SurveyCreate, SurveyUpdate
from ..middleware.auth import require_admin
from ..services.survey import survey_dict, aggregate_results

router = APIRouter()


async def _response_count(db: AsyncSession, survey_id: str) -> int:
    return (await db.execute(
        select(func.count()).select_from(SurveyResponse).where(SurveyResponse.survey_id == survey_id)
    )).scalar() or 0


async def _load(db: AsyncSession, survey_id: str) -> Survey:
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id).options(selectinload(Survey.questions))
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey tidak ditemukan")
    return survey


def _add_questions(db: AsyncSession, survey: Survey, questions):
    for idx, q in enumerate(questions):
        db.add(SurveyQuestion(
            survey_id=survey.id, order=q.order or idx, type=q.type, text=q.text,
            options=q.options, rating_max=q.rating_max, required=q.required,
        ))


@router.get("")
async def list_surveys(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(
        select(Survey).order_by(Survey.created_at.desc()).options(selectinload(Survey.questions))
    )
    surveys = result.scalars().all()
    return [survey_dict(s, await _response_count(db, s.id)) for s in surveys]


@router.post("")
async def create_survey(req: SurveyCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    survey = Survey(title=req.title, description=req.description, closes_at=req.closes_at, created_by=admin.id)
    db.add(survey)
    await db.flush()
    _add_questions(db, survey, req.questions)
    await db.flush()
    survey = await _load(db, survey.id)
    return survey_dict(survey, 0)


@router.get("/{survey_id}")
async def get_survey(survey_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    survey = await _load(db, survey_id)
    return survey_dict(survey, await _response_count(db, survey_id))


@router.put("/{survey_id}")
async def update_survey(survey_id: str, req: SurveyUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    survey = await _load(db, survey_id)
    data = req.model_dump(exclude_unset=True)
    for field in ("title", "description", "status", "closes_at"):
        if field in data:
            setattr(survey, field, data[field])
    if req.questions is not None:
        for q in survey.questions:
            await db.delete(q)
        await db.flush()
        _add_questions(db, survey, req.questions)
    await db.flush()
    survey = await _load(db, survey_id)
    return survey_dict(survey, await _response_count(db, survey_id))


@router.delete("/{survey_id}")
async def delete_survey(survey_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    survey = await _load(db, survey_id)
    await db.delete(survey)
    return {"deleted": survey_id}


@router.post("/{survey_id}/publish")
async def publish_survey(survey_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    survey = await _load(db, survey_id)
    survey.status = "open"
    if not survey.mission_id:
        mission = Mission(
            type=MissionType.SURVEY, title=survey.title,
            description=survey.description or "Isi survey ini", xp_reward=50,
            status=MissionStatus.TERBUKA, created_by=admin.id,
            type_config={"survey_id": survey.id},
        )
        db.add(mission)
        await db.flush()
        survey.mission_id = mission.id
    await db.flush()
    return survey_dict(survey, await _response_count(db, survey_id))


@router.get("/{survey_id}/results")
async def survey_results(survey_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    survey = await _load(db, survey_id)
    answers = (await db.execute(
        select(SurveyAnswer)
        .join(SurveyResponse, SurveyAnswer.response_id == SurveyResponse.id)
        .where(SurveyResponse.survey_id == survey_id)
    )).scalars().all()
    answers_by_q: dict = {}
    for a in answers:
        val = (a.value or {}).get("value")
        answers_by_q.setdefault(a.question_id, []).append(val)
    return {
        "survey_id": survey.id,
        "title": survey.title,
        "response_count": await _response_count(db, survey_id),
        "questions": aggregate_results(survey.questions, answers_by_q),
    }
