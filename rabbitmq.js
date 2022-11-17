const amqplib = require('amqplib');

const rabbitMQUrl = 'amqp://localhost:5672';
let connection;

const getConnection = async () => {
  if (connection) return connection;
  connection = await amqplib.connect(rabbitMQUrl, 'heartbeat=60');
  return connection;
};

module.exports = { getConnection };
