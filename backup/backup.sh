#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="tsk_rewards_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

echo "[$(date)] Starting backup..."

# Create backup
pg_dump | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Backup created: ${FILENAME}"

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "tsk_rewards_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"

# Optional remote sync
if [ -n "${BACKUP_REMOTE_PATH}" ]; then
  echo "[$(date)] Syncing to remote: ${BACKUP_REMOTE_PATH}"
  if command -v rclone > /dev/null 2>&1; then
    rclone copy "${BACKUP_DIR}/${FILENAME}" "${BACKUP_REMOTE_PATH}"
  elif command -v rsync > /dev/null 2>&1; then
    rsync -az "${BACKUP_DIR}/${FILENAME}" "${BACKUP_REMOTE_PATH}"
  else
    echo "[$(date)] WARNING: No rclone or rsync found, skipping remote sync"
  fi
fi

echo "[$(date)] Backup complete"
