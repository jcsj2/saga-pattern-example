const amqplib = require('amqplib');

const rabbitMQUrl = 'amqp://localhost:5672';

const exchanges = {
  exchCreateEditClientes: 'ex-create-edit-clientes',
  exchPagamentoExecutado: 'ex-pagamento-executado',
  exchCreatePedidos: 'ex-create-pedidos',
};

const queues = {
  queuePagamentosCriarEditarClientes: 'q-pagamentos-criar-editar-clientes',
  queuePagamentosCriar: 'q-pagamentos-criar',
  queuePedidosCriarEditarClientes: 'q-pedidos-criar-editar-clientes',
  queuePedidosAtualizarAposPagamento: 'q-pedidos-atualizar-apos-pagamento',
};

class RabbitMQUtils {
  static connection;

  static setupExecuted = false;

  static getConnection = async () => {
    if (RabbitMQUtils.connection) return RabbitMQUtils.connection;
    RabbitMQUtils.connection = await amqplib.connect(rabbitMQUrl, 'heartbeat=60');
    return RabbitMQUtils.connection;
  };

  static setup = async () => {
    if (RabbitMQUtils.setupExecuted) return;
    const conn = await RabbitMQUtils.getConnection();
    const ch = await conn.createChannel();
    const exchangeTypeFanout = 'fanout';

    await ch.assertExchange(exchanges.exchCreateEditClientes, exchangeTypeFanout);
    await ch.assertExchange(exchanges.exchPagamentoExecutado, exchangeTypeFanout);
    await ch.assertExchange(exchanges.exchCreatePedidos, exchangeTypeFanout);

    await ch.assertQueue(queues.queuePagamentosCriarEditarClientes);
    await ch.bindQueue(queues.queuePagamentosCriarEditarClientes, exchanges.exchCreateEditClientes, '');

    await ch.assertQueue(queues.queuePagamentosCriar);
    await ch.bindQueue(queues.queuePagamentosCriar, exchanges.exchCreatePedidos, '');

    await ch.assertQueue(queues.queuePedidosCriarEditarClientes);
    await ch.bindQueue(queues.queuePedidosCriarEditarClientes, exchanges.exchCreateEditClientes, '');

    await ch.assertQueue(queues.queuePedidosAtualizarAposPagamento);
    await ch.bindQueue(queues.queuePedidosAtualizarAposPagamento, exchanges.exchPagamentoExecutado, '');

    RabbitMQUtils.setupExecuted = true;
  };
}

module.exports = {
  RabbitMQUtils, queues, exchanges,
};
