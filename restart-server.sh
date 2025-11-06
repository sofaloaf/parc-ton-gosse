#!/bin/bash
echo "🔍 Finding server processes on port 4000..."
PID=$(lsof -ti:4000)
if [ -z "$PID" ]; then
  echo "✅ No server running on port 4000"
else
  echo "🛑 Killing server process(es): $PID"
  kill -9 $PID 2>/dev/null
  sleep 1
fi

echo "🚀 Starting server..."
cd server
npm run dev
