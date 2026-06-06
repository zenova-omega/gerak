import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Boolean, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | open | closed
    mission_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("missions.id"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    questions = relationship(
        "SurveyQuestion", back_populates="survey",
        cascade="all, delete-orphan", order_by="SurveyQuestion.order",
    )
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")


class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    order: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String(20))  # single | multiple | rating | yesno | text
    text: Mapped[str] = mapped_column(Text, default="")
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    rating_max: Mapped[int] = mapped_column(Integer, default=5)
    required: Mapped[bool] = mapped_column(Boolean, default=True)

    survey = relationship("Survey", back_populates="questions")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    __table_args__ = (UniqueConstraint("survey_id", "user_id", name="uq_survey_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    survey = relationship("Survey", back_populates="responses")
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    response_id: Mapped[str] = mapped_column(String(36), ForeignKey("survey_responses.id"))
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("survey_questions.id"))
    # Stored wrapped as {"value": <x>} so the column is always a dict.
    # value by question type: single->{"value":"opt"}; multiple->{"value":["a","b"]};
    #   rating->{"value":3}; yesno->{"value":true}; text->{"value":"..."}
    value: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    response = relationship("SurveyResponse", back_populates="answers")
