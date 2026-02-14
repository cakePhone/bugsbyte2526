#!/usr/bin/env sh
set -e

RETRIES=12
SLEEP=3
i=0

echo "entrypoint: attempting 'npx prisma generate' and 'npx prisma db push' (up to $RETRIES attempts)"
while [ $i -lt $RETRIES ]; do
  if npx prisma generate && npx prisma db push; then
    echo "Prisma commands succeeded"
    break
  fi
  i=$((i+1))
  echo "Prisma attempt $i/$RETRIES failed; sleeping $SLEEP seconds..."
  sleep $SLEEP
done

if [ $i -ge $RETRIES ]; then
  echo "Warning: Prisma commands failed after $RETRIES attempts. Proceeding to start the app; database may be unavailable."
fi

# If no command supplied, default to Next dev server
if [ "$#" -eq 0 ]; then
  set -- npm run dev -- -H 0.0.0.0 -p 3000
fi

exec "$@"
