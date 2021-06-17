## Kafka Load Test Examples

This project contains example tests for a Kafka cluster that can be run on the Testable platform. There are two basic tests:

1. `e2e-test.js`: Publish messages on a topic and then consume them in a new consumer group while capturing custom metrics for the number of messages published, consumed, and the E2E latency.
2. `publish-and-wait-test.js`: Publish messages on a topic, wait for the lag for the specified consumer group id to go to zero, and then perform a follow up step. In this case we capture number of messages published and lag as custom metrics.

## Running Locally

To run locally you must have <a target="blank" href="https://nodejs.org/en/download/">Node.js 12.x or later.</a> Locally only 1 concurrent user will be executed.

```
./run-e2e-local.sh [kafka-bootstrap-url]
./run-publish-and-wait-local.sh [kafka-bootstrap-url] [consumer-group-id]
```

Any metrics captured will be output to the console as JSON.

## Running on Testable

To run on Testable you must have `curl` installed and have <a target="_blank" href="https://a.testable.io/register">created a Testable account.</a> The number of concurrent users in our example is setup to fit within the limits of the free account.

**Step 1: Get a Testable API Key**

<a target="_blank" href="https://a.testable.io/login">Login to Testable</a> and go to Organization => API Keys. Copy an API key an set it locally as the `TESTABLE_KEY` environment variable (`export TESTABLE_KEY=xxxx`).

**Step 2: Start the load test**

Check and update the parameters set in `run-[...]-testable.sh` before starting the test. This includes number of concurrent users, topic, message frequency, regions to generate load, instance type, etc.

```
./run-e2e-testable.sh [kafka-bootstrap-url]
./run-publish-and-wait-testable.sh [kafka-bootstrap-url] [consumer-group-id]
```

Use the test run URL to follow progress in real-time. This example project includes custom views (`kafka-e2e-view.json` and `kafka-publish-and-wait-view.json`) that will also get uploaded to Testable and set as the default for this test case. The custom view features the key metrics this test captures.

![Results](results.png)