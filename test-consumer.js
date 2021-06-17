// USAGE: node test-consumer.js [broker] [consumer-group-id]

// A dummy consumer to run as a separate process if trying out publish-and-wait-test.js

// modules to use
const { Kafka } = require('kafkajs');

const Topic = 'test'; // kafka topic to consume
const Broker = process.argv[2]; // kafka broker
const ConsumerGroupId = process.argv[3]; // consumer group id to use

// kafka client
const kafka = new Kafka({
    clientId: 'test',
    brokers: [Broker]
});
const consumer = kafka.consumer({ groupId: ConsumerGroupId });

// async friendly sleep function
const sleep = function (duration) {
    return new Promise(function (resolve) {
        setTimeout(resolve, duration);
    });
}

const run = async () => {
    try {
        // setup consumer first
        await consumer.connect();
        await consumer.subscribe({ topic: Topic });
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log('got msg');
                await sleep(10);
            }
        });

        // give enough time for the consumer to get the messages
        await sleep(300000000);
    } finally {
        await consumer.disconnect();
    }
};

run().catch(console.error);