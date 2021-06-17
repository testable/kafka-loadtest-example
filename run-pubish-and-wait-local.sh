#!/bin/bash

if [ $# -lt 2 ]
then
    echo "Usage: run-publish-and-wait-local.sh [kafka-bootstrap-url] [consumer-group-id]"
    exit 0
fi

echo "Running script locally as 1 user..."

echo "Install dependencies..."
npm install

echo "Running node publish-and-wait-test.js"
node publish-and-wait-test.js $1 $2

echo "Script finished running"