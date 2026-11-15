from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import get_settings
from .database import engine, Base
import logging
import os

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount uploads as static files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from .services.pulse_migrate import add_missing_columns
        await conn.run_sync(add_missing_columns)
        # Additive index migration for existing prototype databases. Never delete
        # duplicate source rows automatically; duplicate legacy data must be resolved explicitly.
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
    if settings.PULSE_MONITOR_ENABLED:
        from .services.scheduler import start_scheduler
        start_scheduler()


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


# Import and register routers
from .routers import auth, missions, users, admin, pulse, survey, survey_admin, studio, scheduler, rally, rally_admin, campaign
from .routers import pulse_monitor
from .routers import pulse_reports
from .routers import pulse_evaluation
app.include_router(pulse_reports.router, prefix='/api/admin/pulse/reports')
app.include_router(pulse_evaluation.router, prefix='/api/admin/pulse')
from .routers import pulse_auth
from .routers import pulse_sources
from .routers import pulse_response_analysis
from .routers import pulse_chat
from .routers import pulse_radar
app.include_router(pulse_response_analysis.router, prefix="/api/admin/pulse/response-analysis", tags=["pulse-response-analysis"])
app.include_router(pulse_sources.router, prefix="/api/admin/pulse/sources", tags=["pulse-sources"])
app.include_router(pulse_auth.router, prefix="/api/pulse/auth", tags=["pulse-auth"])

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(missions.router, prefix="/api/missions", tags=["missions"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(pulse_chat.router, prefix="/api/admin/pulse", tags=["pulse-chat"])
app.include_router(pulse_radar.router, prefix="/api/admin/pulse", tags=["pulse-radar"])
app.include_router(pulse.router, prefix="/api/admin/pulse", tags=["pulse"])
app.include_router(pulse_monitor.router, prefix="/api/admin/pulse/monitor", tags=["pulse-monitor"])
app.include_router(survey_admin.router, prefix="/api/admin/surveys", tags=["survey-admin"])
app.include_router(survey.router, prefix="/api/surveys", tags=["survey"])
app.include_router(studio.router, prefix="/api/admin/studio", tags=["studio"])
app.include_router(scheduler.router, prefix="/api/admin/scheduler", tags=["scheduler"])
app.include_router(rally_admin.router, prefix="/api/admin/rally", tags=["rally-admin"])
app.include_router(rally.router, prefix="/api/rally", tags=["rally"])
app.include_router(campaign.router, prefix="/api/admin/campaigns", tags=["campaigns"])
