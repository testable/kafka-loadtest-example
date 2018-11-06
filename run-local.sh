#!/bin/bash

if [ $# -eq 0 ]
then
    echo "Usage: run-local.sh [kafka-bootstrap-url]"
    exit 0
fi

echo "Running script locally as 1 user..."

echo "Install dependencies..."
npm install

echo "Running node test.js"
node test.js $1

echo "Script finished running"