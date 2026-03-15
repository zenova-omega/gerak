"""Test fixtures for SINAR API."""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db
from app.models import User, Mission, MissionType, MissionStatus
from app.middleware.auth import hash_password, create_access_token

# Use SQLite for tests (in-memory)
TEST_DB_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db(engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_user(db):
    user = User(
        id="test-admin", nrp="TESTADMIN", name="Test Admin",
        password_hash=hash_password("admin123"),
        role="admin", account_type="prajurit",
        satuan="Test Unit", rank=4, xp=99999, tier="Gold",
    )
    db.add(user)
    await db.flush()
    return user


@pytest.fixture
async def regular_user(db):
    user = User(
        id="test-user", nrp="TEST001", name="Test Prajurit",
        password_hash=hash_password("user1234"),
        role="prajurit", account_type="prajurit",
        satuan="Yonif 403", rank=1, xp=4820, tier="Silver",
    )
    db.add(user)
    await db.flush()
    return user


@pytest.fixture
async def sample_mission(db, admin_user):
    mission = Mission(
        id="test-mission", type=MissionType.EVENT,
        title="Test Mission", description="Test description",
        xp_reward=400, status=MissionStatus.TERBUKA,
        created_by=admin_user.id,
    )
    db.add(mission)
    await db.flush()
    return mission


@pytest.fixture
def admin_token(admin_user):
    return create_access_token(admin_user.id, "admin")


@pytest.fixture
def user_token(regular_user):
    return create_access_token(regular_user.id, "prajurit")
