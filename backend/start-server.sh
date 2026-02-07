#!/bin/bash

# Script to start MongoDB and Backend Server
# Usage: ./start-server.sh

echo "🚀 Starting JRC School Backend..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "📊 Starting MongoDB..."
    ./start-mongodb.sh
    sleep 2
fi

# Check if backend server is already running
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend server is already running on http://localhost:3000"
    exit 0
fi

# Start backend server
echo "🌐 Starting backend server..."
echo ""
echo "Server will start on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
