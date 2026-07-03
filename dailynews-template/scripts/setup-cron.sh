#!/bin/bash
# Sets up a daily cron job to crawl news at 8:00 AM and 8:00 PM
# Usage: bash scripts/setup-cron.sh

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRON_CMD="0 8,20 * * * cd $SCRIPT_DIR && /usr/local/bin/npm run crawl >> logs/crawl.log 2>&1"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_DIR"; then
  echo "Cron job already exists for this project."
else
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo "Cron job installed. Runs daily at 8:00 and 20:00."
fi
