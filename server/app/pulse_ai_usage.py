"""Print what the hosted model has cost, per day and lane of work: `cd server && ../.venv/bin/python -m app.pulse_ai_usage [days]`."""
import asyncio
import sys
from datetime import datetime, timedelta

from sqlalchemy import select

from .database import async_session
from .models.pulse_ai_usage import AIUsageDay


async def main(days):
    since = (datetime.utcnow() - timedelta(days=days - 1)).strftime('%Y-%m-%d')
    async with async_session() as db:
        rows = (await db.execute(select(AIUsageDay).where(AIUsageDay.day >= since).order_by(AIUsageDay.day.desc(), AIUsageDay.lane))).scalars().all()
    if not rows:
        print('Belum ada pemakaian tercatat.')
    print(f"{'hari':<11}{'jalur':<16}{'model':<30}{'panggilan':>10}{'masuk':>12}{'cache':>10}{'keluar':>10}{'nalar':>9}{'USD':>9}")
    total = 0
    for row in rows:
        cost = row.cost_ticks / 10_000_000_000
        total += cost
        print(f'{row.day:<11}{row.lane:<16}{row.model:<30}{row.calls:>10}{row.input_tokens:>12}{row.cached_tokens:>10}{row.output_tokens:>10}{row.reasoning_tokens:>9}{cost:>9.3f}')
    print(f'Jumlah USD {total:.3f}')


if __name__ == '__main__':
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 7))
