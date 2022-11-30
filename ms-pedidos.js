const express = require('express');
const crypto = require('crypto');
const {
  RabbitMQUtils, exchanges, queues,
} = require('./rabbitmq');

const clientes = [];
const pedidos = [];

const criarAtualizarCliente = (dadosCliente) => {
  const indiceCliente = clientes.findIndex((c) => c.id === dadosCliente.id);
  const cliente = {
    id: dadosCliente.id,
    nome: dadosCliente.nome,
    telefone: dadosCliente.telefone,
    endereco: dadosCliente.endereco,
  };
  if (indiceCliente === -1) {
    clientes.push(cliente);
  } else {
    clientes[indiceCliente] = cliente;
  }
};

const atualizarStatusPagamentoNoPedido = (dadosPagamento) => {
  const indicePedido = pedidos.findIndex((p) => p.id === dadosPagamento.idPedido);
  pedidos[indicePedido].status = dadosPagamento.status;
};

async function doConsume() {
  const conn = await RabbitMQUtils.getConnection();
  const ch = await conn.createChannel();
  await conn.createChannel();
  await ch.consume(queues.queuePedidosCriarEditarClientes, (msg) => {
    const dadosClienteRecebido = JSON.parse(msg.content.toString());
    criarAtualizarCliente(dadosClienteRecebido);

    ch.ack(msg);
  }, { consumerTag: 'consumerPedidosCriarEditarClientes' });

  await ch.consume(queues.queuePedidosAtualizarAposPagamento, (msg) => {
    const dadosPagamento = JSON.parse(msg.content.toString());
    atualizarStatusPagamentoNoPedido(dadosPagamento);

    ch.ack(msg);
  }, { consumerTag: 'consumerPedidosAtualizarAposPagamento' });
}

const app = express();
app.use(express.json());

const listarClientes = (req, res) => {
  res.json(clientes);
};

const listarPedidos = (req, res) => {
  res.json(pedidos);
};

const criarPedido = async (req, res) => {
  const { body } = req;
  const id = crypto.randomUUID();
  const novoPedido = {
    id,
    valorTotal: Math.floor(Math.random() * 10) + 1,
    dataHora: new Date(),
    status: 'PENDENTE_CONFIRMACAO_PAGAMENTO',
    ...body,
  };
  pedidos.push(novoPedido);

  const conn = await RabbitMQUtils.getConnection();
  const ch = await conn.createChannel();
  await ch.publish(exchanges.exchCreatePedidos, '', Buffer.from(JSON.stringify(novoPedido)));

  res.status(201).header('location', `http://localhost:3001/pedidos/${id}`).send();
};

app.route('/clientes').get(listarClientes);
app.route('/pedidos').post(criarPedido).get(listarPedidos);

RabbitMQUtils.setup().then(() => {
  app.listen(3001, () => {
    doConsume();
    console.log('Serviço de pedidos inicalizado');
  });
}).catch((err) => {
  console.log(`Falha no setup do RabbitMQ ${err.message}`);
});
