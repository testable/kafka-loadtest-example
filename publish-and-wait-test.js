// modules to use
const { Kafka } = require('kafkajs');
const randomstring = require('randomstring');
const testableUtils = require('testable-utils');
const axios = require('axios');

const log = testableUtils.log;
const results = testableUtils.results;
const params = testableUtils.params || {};

// some parameters that drive the script
const Topic = params['topic'] || 'test'; // kafka topic
const Broker = params['broker'] || process.argv[2]; // kafka broker
const ConsumerGroupId = params['consumerGroupId'] || process.argv[3]; // consumer group id to monitor after publish
const MsgCountToPublish = params['msgCountToPublish'] || 10; // # of msgs to publish
const SleepMs = Number(params['sleepMs']) || 10; // ms to sleep between messages published
const MaxWaitTimeMinutes = 5;
const LagCheckFrequencyMs = 1000;

// kafka client
const kafka = new Kafka({
    clientId: 'test',
    brokers: [Broker]
});
const producer = kafka.producer();
const admin = kafka.admin();

// async friendly sleep function
function sleep(duration) {
    return new Promise(function (resolve) {
        setTimeout(resolve, duration);
    });
}

function calculateLag(consumerOffsets, topicOffsets) {
    const consumerOffsetsByPartition = byPartition(consumerOffsets);
    const topicOffsetsByPartition = byPartition(topicOffsets);
    let lag = 0;
    for (const partition in topicOffsetsByPartition) {
        lag += topicOffsetsByPartition[partition] - (consumerOffsetsByPartition[partition] || 0);
    }
    return lag;
}

function byPartition(offsets) { 
    const answer = {};
    offsets.forEach((info) => {
        answer[info.partition] = info.offset;
    });
    return answer;
}

const run = async () => {
    try {
        // publish some messages
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

        // wait for lag on topic consumers to reach zero or max wait time to pass
        await admin.connect();
        const start = Date.now();
        let lag;
        do {
            const consumerOffsets = await admin.fetchOffsets({ groupId: ConsumerGroupId, topic: Topic });
            const topicOffsets = await admin.fetchTopicOffsets(Topic);
            lag = calculateLag(consumerOffsets, topicOffsets);
            log.trace(`Current lag: ${lag}`);
            results().metered({ name: 'Consumer Lag', key: ConsumerGroupId, val: lag, units: 'msgs' });
            await sleep(LagCheckFrequencyMs);
        } while (lag > 0 && Date.now() - start < MaxWaitTimeMinutes * 60000);

        // example rest API request to perform after lag reaches zero for demo purposes
        const response = await axios.get('http://sample.testable.io/stocks/IBM', { responseType: 'json ' });
        results().histogram({ name: 'Quotes By Exchange', key: response.data.exchange, val: 1 });
    } finally {
        await admin.disconnect();
        await producer.disconnect();
    }
};

run().catch(console.error);