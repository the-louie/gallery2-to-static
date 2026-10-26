#!/bin/sh
# lanbilder nightly (Sprint 15 T-09): fold the view counts into the pages, regenerate the changed
# branches, back up the data master (last 30 copies kept). Run as user lanbilder by lanbilder-nightly.timer.
set -e
A=/mnt/storage/lanbilder-app
DB=${GALLERY_DB:-$A/db/gallery.sqlite}
B=${BACKUP_DIR:-/mnt/storage/backup}
cd $A/backend
/usr/bin/node --no-warnings=ExperimentalWarning generate.ts --fold-views --db "$DB"
/usr/bin/node --no-warnings=ExperimentalWarning -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(process.argv[1]); db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close()" "$DB"
mkdir -p "$B"
cp -p "$DB" "$B/gallery-$(date +%Y%m%d-%H%M).sqlite"
ls -1t "$B"/gallery-*.sqlite | tail -n +31 | while read -r old; do mv "$old" "$B/.pruned-$(basename "$old")"; done
echo "nightly done: $(date -Is)"
