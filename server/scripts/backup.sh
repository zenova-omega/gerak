#!/bin/bash
# SINAR Database Backup Script
# Run daily via cron: 0 2 * * * /opt/sinar/scripts/backup.sh

set -e

BACKUP_DIR="/data/backups"
DB_CONTAINER="sinar-db"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump PostgreSQL
docker exec "$DB_CONTAINER" pg_dump -U sinar sinar | gzip > "$BACKUP_DIR/sinar_${DATE}.sql.gz"

echo "[$(date)] Backup saved: sinar_${DATE}.sql.gz"

# Clean old backups
find "$BACKUP_DIR" -name "sinar_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Old backups cleaned (>${RETENTION_DAYS} days)"
echo "[$(date)] Backup complete."
