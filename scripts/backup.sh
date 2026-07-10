#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
echo "  → Dumping PostgreSQL database..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  -f "$BACKUP_DIR/db_$TIMESTAMP.dump" 2>&1 | tail -3

# Generate checksum
sha256sum "$BACKUP_DIR/db_$TIMESTAMP.dump" > "$BACKUP_DIR/db_$TIMESTAMP.sha256"

# Encrypt if encryption key is provided
if [ -n "$ENCRYPTION_KEY" ]; then
  echo "  → Encrypting backup..."
  openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "$BACKUP_DIR/db_$TIMESTAMP.dump" \
    -out "$BACKUP_DIR/db_$TIMESTAMP.enc" \
    -pass pass:"$ENCRYPTION_KEY"
  rm "$BACKUP_DIR/db_$TIMESTAMP.dump"
  rm "$BACKUP_DIR/db_$TIMESTAMP.sha256"
  sha256sum "$BACKUP_DIR/db_$TIMESTAMP.enc" > "$BACKUP_DIR/db_$TIMESTAMP.sha256"
  echo "  → Encrypted: db_$TIMESTAMP.enc"
else
  echo "  → Plain backup: db_$TIMESTAMP.dump"
fi

# Upload to S3/Cloud if configured
if [ -n "$S3_BUCKET" ] && [ -n "$S3_ACCESS_KEY" ]; then
  echo "  → Uploading to S3..."
  BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.${ENCRYPTION_KEY:+enc}${ENCRYPTION_KEY:-dump}"
  if command -v aws &>/dev/null; then
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(date +%Y/%m)/" \
      --endpoint-url="${S3_ENDPOINT:-https://s3.amazonaws.com}"
  elif command -v curl &>/dev/null; then
    echo "  → aws-cli not installed, skipping S3 upload"
  fi
fi

# Cleanup old backups
echo "  → Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db_*" -type f -mtime "+$RETENTION_DAYS" -delete 2>/dev/null

# Backup summary
echo "  → Backup completed:"
ls -lh "$BACKUP_DIR" | grep "$TIMESTAMP"

# Log to file
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed: db_$TIMESTAMP" >> "$BACKUP_DIR/backup_history.log"
