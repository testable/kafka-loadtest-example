const kafka = require('kafka-node');
const Set = require('collections/set');
const randomstring = require('randomstring');
const moment = require('moment');
const testableUtils = require('testable-utils');

const log = testableUtils.log;
const results = testableUtils.results;
const params = testableUtils.params || {};
const info = testableUtils.info;
const smoke = testableUtils.isLocal || testableUtils.isSmokeTest;

// from params
const kafkaHost = testableUtils.isLocal ? process.argv[2] : params['kafkaHost'];
const topics = Number(params['topics']) || 1;
const producersPerTopic = Number(params['producersPerTopic']) || 1;
const consumersPerTopic = Number(params['consumersPerTopic']) || 1;
const numUsers = info.execution.concurrentClients || 1;
const msgFrequencyMsPerTopic = Number(params['msgFrequencyMsPerTopic']) || 500;
const user = info.globalClientIndex || 0;
const execution = info.execution.id;
const minMsgSize = Number(params['minMsgSize']) || 100;
const maxMsgSize = Number(params['maxMsgSize']) || 200;

// calculated
const testDuration = smoke ? 5000 : (info.execution.durationSecs || 60) * 1000;
const myDuration = smoke ? 5000 : testDuration - (Date.now() - moment(info.executionRegion.startedAt).valueOf()) + 10000; // only 5 seconds of msgs during smoke test or local testing
const startedAt = Date.now();
const producersPerUser = Math.ceil(topics * producersPerTopic / numUsers);
const consumersPerUser = Math.ceil(topics * consumersPerTopic / numUsers);

const producerTopics = [];
for (var i = 0; i < producersPerUser; i++)
  producerTopics.push('topic.' + ((user * producersPerUser + i) % topics));
log.trace('Producer topics: ', producerTopics);

const consumerTopics = [];
for (var i = 0; i < consumersPerUser; i++)
  consumerTopics.push('topic.' + ((user * consumersPerUser + i) % topics));
log.trace('Consumer topics: ', consumerTopics);

const topicsToCreate = new Set();
topicsToCreate.addEach(producerTopics);
topicsToCreate.addEach(consumerTopics);

testableUtils.execute(function(done) {
  const client = new kafka.KafkaClient({ 
    kafkaHost: kafkaHost
  });
  const admin = new kafka.Admin(client);
  admin.createTopics(topicsToCreate.map(t => ({ topic: t, partitions: 1, replicationFactor: 1 })), (err, res) => {
    if (err)
      log.error('Error creating topic', err);
    else {
      const producer = new kafka.Producer(new kafka.KafkaClient({
        kafkaHost: kafkaHost
      }));
      
      producer.on('ready', function(err) {
        if (err)
          log.error('Error waiting for producer to be ready', err)
        else {
          log.info('Producer ready');
          produce();
        }
      });

      function produce() {
        for (var j = 0; j < producersPerUser; j++) {
          log.trace('Sending msg');
          const topic = producerTopics[j % producerTopics.length];
          const msgLength = Math.ceil((maxMsgSize - minMsgSize) * Math.random()) + minMsgSize;
          results(topic).counter({ namespace: 'User', name: 'Msgs Produced', val: 1, units: 'msgs' });
          producer.send([ {
            topic: topic,
            messages: [ randomstring.generate(msgLength) ],
            key: '' + Date.now()
          } ], function(err) {
            if (err) {
              log.error(`Error occurred`, err);
            }
          });
        }
        if (Date.now() - startedAt < myDuration)
          setTimeout(produce, msgFrequencyMsPerTopic);
        else
          setTimeout(complete, 5000);
      }

      const consumer = new kafka.ConsumerGroup({
        groupId: execution + '.user.' + info.globalClientIndex,
        kafkaHost: kafkaHost,
        autoCommit: true,
        autoCommitIntervalMs: 1000,
      }, consumerTopics);
      
      consumer.on('message', function(message) {
        results(message.topic).counter({ namespace: 'User', name: 'Msgs Consumed', val: 1, units: 'msgs' });
        results(message.topic).timing({ namespace: 'User', name: 'E2E Latency', val: Date.now() - Number(message.key), units: 'ms' });
        log.trace('Got message on topic: ' + message.topic);
      });
      
      function complete() {
        producer.close(function() {});
        consumer.close(function() {});
        client.close(function() {});
        done();
      }
    }
  });
});