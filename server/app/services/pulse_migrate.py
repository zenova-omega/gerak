"""Additive schema changes for databases created before a column existed. Never drops or rewrites data."""
from sqlalchemy import inspect, text

ADDED_COLUMNS = (
    ('pulse_response_analysis_jobs', 'comment_rank', 'INTEGER'),
)


def add_missing_columns(connection):
    """Run inside `conn.run_sync`, after `create_all`. Table and column names come from the list above, never from input."""
    inspector = inspect(connection)
    for table, column, kind in ADDED_COLUMNS:
        if inspector.has_table(table) and column not in {row['name'] for row in inspector.get_columns(table)}:
            connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {kind}'))
