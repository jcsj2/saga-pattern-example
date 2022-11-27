const express = require('express');
const crypto = require('crypto');
const { getConnection } = require('./rabbitmq');

const clientes = [];
const pagamentos = [];
const exchCreateEditClientes = 'ex-create-edit-clientes';
const queuePagamentosCriarEditarClientes = 'q-pagamentos-criar-editar-clientes';

const exchCreatePedidos = 'ex-create-pedidos';
const queuePagamentosCriarPedidos = 'q-pagamentos-criar-pedidos';

const setupRabbitMQ = async () => {
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await ch.assertQueue(queuePagamentosCriarEditarClientes);
  await ch.bindQueue(queuePagamentosCriarEditarClientes, exchCreateEditClientes, '');

  await ch.assertQueue(queuePagamentosCriarPedidos);
  await ch.bindQueue(queuePagamentosCriarPedidos, exchCreatePedidos, '');
};

const criarAtualizarCliente = (dadosCliente) => {
  const indiceCliente = clientes.findIndex((c) => c.id === dadosCliente.id);
  const cliente = {
    id: dadosCliente.id,
    nome: dadosCliente.nome,
    email: dadosCliente.email,
    enderecoCobranca: dadosCliente.enderecoCobranca,
    documentoIdentificacao: dadosCliente.documentoIdentificacao,
  };
  if (indiceCliente === -1) {
    clientes.push(cliente);
  } else {
    clientes[indiceCliente] = cliente;
  }
};

const criarPedido = (dadosPedido) => {
  const pagamento = {
    id: crypto.randomUUID(),
    idPedido: dadosPedido.id,
    idCliente: dadosPedido.nome,
    dataHora: dadosPedido.dataHora,
    valorTotal: dadosPedido.valorTotal,
    dadosCartao: dadosPedido.dadosCartao,
  };

  pagamentos.push(pagamento);
};

async function doConsume() {
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await conn.createChannel();
  await ch.consume(queuePagamentosCriarEditarClientes, (msg) => {
    const dadosClienteRecebido = JSON.parse(msg.content.toString());
    criarAtualizarCliente(dadosClienteRecebido);

    ch.ack(msg);
  }, { consumerTag: 'consumerPagamentosCriarEditarClientes' });

  await ch.consume(queuePagamentosCriarPedidos, (msg) => {
    const dadosPedidoRecebido = JSON.parse(msg.content.toString());
    criarPedido(dadosPedidoRecebido);

    ch.ack(msg);
  }, { consumerTag: 'consumerPagamentosCriarPedidos' });
}

const app = express();
app.use(express.json());

const listarClientes = (req, res) => {
  res.json(clientes);
};

app.route('/clientes').get(listarClientes);

setupRabbitMQ().then(() => {
  app.listen(3002, () => {
    doConsume();
    console.log('Serviço de pagamentos inicializado');
  });
}).catch((err) => {
  console.log(`Falha no setup do RabbitMQ ${err.message}`);
});
