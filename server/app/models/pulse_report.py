import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class PulseReport(Base):
    __tablename__='pulse_reports'
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    topic_id: Mapped[str]=mapped_column(String(36),ForeignKey('watch_topics.id'),index=True)
    title: Mapped[str]=mapped_column(String(160))
    version: Mapped[int]=mapped_column(Integer,default=1)
    created_by: Mapped[str]=mapped_column(String(36))
    created_at: Mapped[datetime]=mapped_column(DateTime,default=datetime.utcnow)
    snapshot: Mapped[dict]=mapped_column(JSON)
