#!/bin/bash

if [ $# -eq 0 ]
then
    echo "Usage: run-testable.sh [kafka-bootstrap-url]"
    exit 0
fi

if [[ -z "${TESTABLE_KEY}" ]]; then
	echo "TESTABLE_KEY must be set as an environment variable to a valid Testable API key"
	exit 0
fi

echo "Running on Testable with a step profile from 5-50 concurrent users during 10 minutes on 1 t2.large instance in AWS N. Virginia..."

execution_id=$(curl -s -F "code=@test.js" \
  -F "start_concurrent_users_per_region=5" \
  -F "step_per_region=5" \
  -F "concurrent_users_per_region=50" \
  -F "duration_mins=15" \
  -F "params[kafkaHost]=$1" \
  -F "params[topics]=10" \
  -F "params[producersPerTopic]=5" \
  -F "params[consumersPerTopic]=5" \
  -F "params[msgFrequencyMsPerTopic]=500" \
  -F "params[minMsgSize]=100" \
  -F "params[maxMsgSize]=500" \
  -F "conf_testrunners[0].regions[0].name=us-east-1" \
  -F "conf_testrunners[0].regions[0].instance_type=t2.large" \
  -F "testcase_name=Kafka Load Test" \
  -F "conf_name=5-50 Concurrents 1 Instance" \
  -F "scenario_name=Node.js Script" \
  -F "view=@kafka-view.json" \
  https://api.testable.io/start?key=$TESTABLE_KEY)

echo "Test is running on Testable. View results at https://a.testable.io/results/$execution_id"