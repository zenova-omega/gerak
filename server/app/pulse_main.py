"""Standalone on-prem entrypoint: exposes PULSE only, never GERAK routes."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .database import Base, engine
from . import models  # noqa: F401 - register additive schema
from .routers import pulse, pulse_monitor, pulse_auth
from .routers import pulse_sources
from .routers import pulse_growth
from .routers import pulse_chat
from .routers import pulse_reviews
from .routers import pulse_reports
from .routers import pulse_evaluation
from .routers import pulse_response_analysis
from .routers import pulse_radar


@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from .services.pulse_migrate import add_missing_columns
        await conn.run_sync(add_missing_columns)
        from .models.pulse import SourceItem
        index = next(i for i in SourceItem.__table__.indexes if i.name == 'uq_pulse_topic_url')
        await conn.run_sync(lambda sync: index.create(sync, checkfirst=True))
    # Stored rows from before a rule existed. Its own transaction: a failed repair must not undo the schema step or stop the start.
    try:
        async with engine.begin() as conn:
            from .services.pulse_repair import repair_reposts
            repaired = await conn.run_sync(repair_reposts)
        if repaired:
            logging.getLogger(__name__).info('PULSE: %s repost rows no longer claim the original post\'s shares', repaired)
    except Exception:
        logging.getLogger(__name__).exception('PULSE: repost repair skipped')
    if get_settings().PULSE_MONITOR_ENABLED:
        from .services.scheduler import start_scheduler
        start_scheduler()
    yield


app = FastAPI(title='PULSE · Social Listening', docs_url=None, redoc_url=None, lifespan=lifespan)
app.state.pulse_only = True
app.add_middleware(CORSMiddleware, allow_origins=get_settings().CORS_ORIGINS,
                   allow_credentials=True, allow_methods=['GET', 'POST', 'PUT', 'DELETE'],
                   allow_headers=['Content-Type', 'X-Pulse-CSRF', 'X-Webhook-Secret'])
app.include_router(pulse_auth.router, prefix='/api/pulse/auth')
app.include_router(pulse_sources.router, prefix='/api/admin/pulse/sources')
app.include_router(pulse_growth.router, prefix='/api/admin/pulse')
app.include_router(pulse_reviews.router, prefix='/api/admin/pulse/reviews')
app.include_router(pulse_reports.router, prefix='/api/admin/pulse/reports')
app.include_router(pulse_evaluation.router, prefix='/api/admin/pulse')
app.include_router(pulse_response_analysis.router, prefix='/api/admin/pulse/response-analysis')
app.include_router(pulse_chat.router, prefix='/api/admin/pulse')
app.include_router(pulse_radar.router, prefix='/api/admin/pulse')
app.include_router(pulse.router, prefix='/api/admin/pulse')
app.include_router(pulse_monitor.router, prefix='/api/admin/pulse/monitor')


@app.get('/api/health')
async def health():
    return {'status': 'ok', 'product': 'PULSE'}
