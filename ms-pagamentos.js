const express = require('express');
const crypto = require('crypto');
const {
  RabbitMQUtils, exchanges, queues,
} = require('./rabbitmq');

const clientes = [];
const pagamentos = [];

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

    RabbitMQUtils.getConnection().then(async (conn) => {
      const ch = await conn.createChannel();
      await ch.publish(exchanges.exchPagamentoExecutado, '', Buffer.from(JSON.stringify(pagamentos[indicePagamento])));
    });
  }, 10000);
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
  const conn = await RabbitMQUtils.getConnection();
  const ch = await conn.createChannel();
  await conn.createChannel();
  await ch.consume(queues.queuePagamentosCriarEditarClientes, (msg) => {
    const dadosClienteRecebido = JSON.parse(msg.content.toString());
    criarAtualizarCliente(dadosClienteRecebido);

    ch.ack(msg);
  }, { consumerTag: 'consumerPagamentosCriarEditarClientes' });

  await ch.consume(queues.queuePagamentosCriar, (msg) => {
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

RabbitMQUtils.setup().then(() => {
  app.listen(3002, () => {
    doConsume();
    console.log('Serviço de pagamentos inicializado');
  });
}).catch((err) => {
  console.log(`Falha no setup do RabbitMQ ${err.message}`);
});
