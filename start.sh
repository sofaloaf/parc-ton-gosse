#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Parc Ton Gosse Application...${NC}\n"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start server in background
echo -e "${GREEN}Starting backend server...${NC}"
cd "$SCRIPT_DIR/server"
PORT=${PORT:-4000} npm run dev &
SERVER_PID=$!
echo -e "${GREEN}✓ Backend server starting (PID: $SERVER_PID) on http://localhost:4000${NC}\n"

# Wait a bit for server to start
sleep 3

# Start client in background
echo -e "${GREEN}Starting frontend client...${NC}"
cd "$SCRIPT_DIR/client"
npm install 2>/dev/null
npm run dev &
CLIENT_PID=$!
echo -e "${GREEN}✓ Frontend client starting (PID: $CLIENT_PID) on http://localhost:5173${NC}\n"

# Wait for client to be ready
sleep 5

# Open browser
echo -e "${YELLOW}Opening browser...${NC}"
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:5173
elif command -v start &> /dev/null; then
    # Windows (Git Bash)
    start http://localhost:5173
fi

echo -e "\n${GREEN}✓ Application is running!${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:4000"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "\n${YELLOW}Press Ctrl+C to stop both servers${NC}\n"

# Wait for Ctrl+C
trap "echo -e '\n${YELLOW}Stopping servers...${NC}'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT

# Keep script running
wait

