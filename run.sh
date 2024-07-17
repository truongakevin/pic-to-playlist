#!/bin/bash

# Kill processes on specified ports before starting new ones
lsof -t -i:8081 | xargs -r kill -9
lsof -t -i:33333 | xargs -r kill -9
lsof -t -i:52525 | xargs -r kill -9

# Start the server processes
cd server
node server.js &
NODE_PID=$!
python app.py &
PYTHON_PID=$!
cd ../client
npm start

# Kill processes on specified ports before starting new ones
lsof -t -i:8081 | xargs -r kill -9
lsof -t -i:33333 | xargs -r kill -9
lsof -t -i:52525 | xargs -r kill -9