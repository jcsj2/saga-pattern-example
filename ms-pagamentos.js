const express = require('express');
const crypto = require('crypto');
const { getConnection } = require('./rabbitmq');

const clientes = [];
const pagamentos = [];
const exchCreateEditClientes = 'ex-create-edit-clientes';
const queuePagamentosCriarEditarClientes = 'q-pagamentos-criar-editar-clientes';

const exchCreatePedidos = 'ex-create-pedidos';
const queuePagamentosCriar = 'q-pagamentos-criar';

const exchPagamentoExecutado = 'ex-pagamento-executado';

const setupRabbitMQ = async () => {
  const conn = await getConnection();
  const ch = await conn.createChannel();
  await ch.assertQueue(queuePagamentosCriarEditarClientes);
  await ch.bindQueue(queuePagamentosCriarEditarClientes, exchCreateEditClientes, '');

  await ch.assertQueue(queuePagamentosCriar);
  await ch.bindQueue(queuePagamentosCriar, exchCreatePedidos, '');

  await ch.assertExchange(exchPagamentoExecutado, 'fanout');
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

const simularPagamento = (pagamento) => {
  setTimeout(() => {
    const indicePagamento = pagamentos.findIndex((p) => p.id === pagamento.id);
    pagamentos[indicePagamento].status = pagamento.dadosCartao
    === '000000' ? 'PAGAMENTO_RECUSADO' : 'PAGAMENTO_CONCLUIDO';

    getConnection().then(async (conn) => {
      const ch = await conn.createChannel();
      await ch.publish(exchPagamentoExecutado, '', Buffer.from(JSON.stringify(pagamentos[indicePagamento])));
    });
  }, 30000);
};

const criarPagamento = (dadosPedido) => {
  const pagamento = {
    id: crypto.randomUUID(),
    idPedido: dadosPedido.id,
    idCliente: dadosPedido.nome,
    dataHora: dadosPedido.dataHora,
    valorTotal: dadosPedido.valorTotal,
    dadosCartao: dadosPedido.dadosCartao,
    status: 'EM_ANDAMENTO',
  };

  pagamentos.push(pagamento);
  simularPagamento(pagamento);
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

  await ch.consume(queuePagamentosCriar, (msg) => {
    const dadosPedidoRecebido = JSON.parse(msg.content.toString());
    criarPagamento(dadosPedidoRecebido);

    ch.ack(msg);
  }, { consumerTag: 'consumerPagamentosCriarPagamentos' });
}

const app = express();
app.use(express.json());

const listarClientes = (req, res) => {
  res.json(clientes);
};

const listarPagamentos = (req, res) => {
  res.json(pagamentos);
};

app.route('/clientes').get(listarClientes);

app.route('/pagamentos').get(listarPagamentos);

setupRabbitMQ().then(() => {
  app.listen(3002, () => {
    doConsume();
    console.log('Serviço de pagamentos inicializado');
  });
}).catch((err) => {
  console.log(`Falha no setup do RabbitMQ ${err.message}`);
});
