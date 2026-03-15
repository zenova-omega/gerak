from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import get_settings
from .database import engine, Base
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


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


# Import routers (will be implemented in Phase 2.2)
# from .routers import auth, missions, users, admin, broadcast, settings as settings_router
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(missions.router, prefix="/api/missions", tags=["missions"])
# app.include_router(users.router, prefix="/api/users", tags=["users"])
# app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
# app.include_router(broadcast.router, prefix="/api/broadcast", tags=["broadcast"])
# app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
