const express = require('express');
const crypto = require('crypto');
const { getConnection } = require('./rabbitmq');

const clientes = [];
const pedidos = [];
const exchCreateEditClientes = 'ex-create-edit-clientes';
const queuePedidosCriarEditarClientes = 'q-pedidos-criar-editar-clientes';

const exchCreatePedidos = 'ex-create-pedidos';

const setupRabbitMQ = async () => {
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await ch.assertQueue(queuePedidosCriarEditarClientes);
  await ch.bindQueue(queuePedidosCriarEditarClientes, exchCreateEditClientes, '');

  await ch.assertExchange(exchCreatePedidos, 'fanout');
};

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

async function doConsume() {
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await conn.createChannel();
  await ch.consume(queuePedidosCriarEditarClientes, (msg) => {
    const dadosClienteRecebido = JSON.parse(msg.content.toString());
    criarAtualizarCliente(dadosClienteRecebido);

    ch.ack(msg);
  }, { consumerTag: 'consumerPedidosCriarEditarClientes' });
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

  const conn = await getConnection();
  const ch = await conn.createChannel();
  await ch.publish(exchCreatePedidos, '', Buffer.from(JSON.stringify(novoPedido)));

  res.status(201).header('location', `http://localhost:3001/pedidos/${id}`).send();
};

app.route('/clientes').get(listarClientes);
app.route('/pedidos').post(criarPedido).get(listarPedidos);

setupRabbitMQ().then(() => {
  app.listen(3001, () => {
    doConsume();
    console.log('Serviço de pedidos inicalizado');
  });
}).catch((err) => {
  console.log(`Falha no setup do RabbitMQ ${err.message}`);
});
