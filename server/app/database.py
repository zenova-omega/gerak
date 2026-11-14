from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)

if settings.DATABASE_URL.startswith('sqlite'):
    from sqlalchemy import event

    @event.listens_for(engine.sync_engine, 'connect')
    def _sqlite_concurrency(connection, _record):
        # SQLite has one writer. Write-ahead logging lets readers and that writer work side by side, and the
        # timeout makes a second writer wait its turn instead of failing at once with "database is locked".
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL')
        cursor.execute('PRAGMA busy_timeout=30000')
        cursor.close()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
