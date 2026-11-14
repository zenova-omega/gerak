from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from ..database import get_db
from ..services.pulse_identity import session_identity, optional_bearer, require_pulse_access
from ..models.pulse_identity import PulseAudit
from ..services.pulse_review import list_reviews, save_review


async def require_review_access(request: Request, credentials=Depends(optional_bearer), db=Depends(get_db)):
    if credentials and not getattr(request.app.state, 'pulse_only', False):
        return await require_pulse_access(request, credentials, db)
    user = await session_identity(request, db)
    if request.method == 'PUT':
        if user.role not in ('owner', 'admin', 'analyst'):
            raise HTTPException(403, 'Analyst access required')
        db.add(PulseAudit(user_id=user.id, action='PUT ' + request.url.path[:70]))
    return user


router = APIRouter(dependencies=[Depends(require_review_access)])


class ReviewUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    relevance: Literal['relevant', 'irrelevant', 'unreviewed'] = 'unreviewed'
    manual_sentiment: Literal['positive', 'neutral', 'negative'] | None = None
    review_needed: bool = False
    analyst_note: str | None = Field(default=None, max_length=2000)

    @model_validator(mode='after')
    def has_changes(self):
        if not self.model_fields_set:
            raise ValueError('Supply at least one review field')
        return self


@router.get('')
async def get_reviews(topic_id: str = Query(..., min_length=1), db=Depends(get_db)):
    return await list_reviews(db, topic_id)


@router.put('/{post_id}')
async def put_review(post_id: str, body: ReviewUpdate, topic_id: str = Query(..., min_length=1),
                     db=Depends(get_db), actor=Depends(require_review_access)):
    return await save_review(db, topic_id, post_id, body.model_dump(exclude_unset=True), actor.id)
