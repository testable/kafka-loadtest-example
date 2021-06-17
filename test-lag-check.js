// USAGE: node test-consumer.js [broker] [consumer-group-id]

// Get the current total lag across all partitions for this consumer group

// modules to use
const { Kafka } = require('kafkajs');
const util = require('util');

const Topic = 'test'; // kafka topic to consume
const Broker = process.argv[2]; // kafka broker
const ConsumerGroupId = process.argv[3]; // consumer group id to use

// kafka client
const kafka = new Kafka({
    clientId: 'test',
    brokers: [Broker]
});
const admin = kafka.admin();

// async friendly sleep function
const sleep = function (duration) {
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
        await admin.connect();
        const consumerOffsets = await admin.fetchOffsets({ groupId: ConsumerGroupId, topic: Topic });
        const topicOffsets = await admin.fetchTopicOffsets(Topic);
        const lag = calculateLag(consumerOffsets, topicOffsets);
        console.log(`Consumer offsets: ${util.inspect(consumerOffsets)}`);
        console.log(`Topic offsets: ${util.inspect(topicOffsets)}`);
        console.log(`Current lag: ${lag}`);
    } finally {
        await admin.disconnect();
    }
};

run().catch(console.error);