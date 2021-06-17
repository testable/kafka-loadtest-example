// modules to use
const { Kafka } = require('kafkajs');
const randomstring = require('randomstring');
const { v4: uuidv4 } = require('uuid');
const testableUtils = require('testable-utils');
const axios = require('axios');

const log = testableUtils.log;
const results = testableUtils.results;
const params = testableUtils.params || {};

// some parameters that drive the script
const Topic = params['topic'] || 'test'; // kafka topic
const Broker = params['broker'] || process.argv[2]; // kafka broker
const MsgCountToPublish = params['msgCountToPublish'] || 10; // # of msgs to publish
const SleepMs = Number(params['sleepMs']) || 10; // ms to sleep between messages published

// kafka client
const kafka = new Kafka({
    clientId: 'test',
    brokers: [Broker]
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: uuidv4() });
const admin = kafka.admin();

// async friendly sleep function
function sleep(duration) {
    return new Promise(function (resolve) {
        setTimeout(resolve, duration);
    });
}

const run = async () => {
    try {
        // make sure the topic exists (can remove if publishing to existing topic)
        await admin.connect();
        await admin.createTopics({
            topics: [{ topic: Topic }]
        });

        // setup consumer first
        await consumer.connect();
        await consumer.subscribe({ topic: Topic });
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                results(topic).counter({ name: 'Msgs Consumed', val: 1, units: 'msgs' });
                results(topic).timing({ name: 'E2E Latency', val: Date.now() - Number(message.key), units: 'ms' });
                log.trace('Got message on topic: ' + topic);
            }
        });

        // then publish some messages
        await producer.connect();
        for (let i = 0; i < MsgCountToPublish; i++) {
            await producer.send({
                topic: Topic,
                messages: [
                    { key: Date.now().toString(), value: randomstring.generate(512) }
                ],
            });
            // count msgs produced as a counter metric in the test results grouped by topic name
            results(Topic).counter({ name: 'Msgs Produced', val: 1, units: 'msgs' });
            await sleep(SleepMs);
        }

        // example rest API request mixed in for demo purposes
        const response = await axios.get('http://sample.testable.io/stocks/IBM', { responseType: 'json ' });
        results().histogram({ name: 'Quotes By Exchange', key: response.data.exchange, val: 1 });

        // give enough time for the consumer to get the messages
        await sleep(30000);
    } finally {
        await admin.disconnect();
        await producer.disconnect();
        await consumer.disconnect();
    }
};

run().catch(console.error);