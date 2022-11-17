const express = require('express');
const crypto = require('crypto');
const { getConnection } = require('./rabbitmq');

const clientes = [];

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
  const q = 'q-pedidos-criar-editar-clientes';
  await conn.createChannel();
  await ch.consume(q, (msg) => {
    const dadosClienteRecebido = JSON.parse(msg.content.toString());
    criarAtualizarCliente(dadosClienteRecebido);

    ch.ack(msg);
  }, { consumerTag: 'myconsumer' });
}

const app = express();
app.use(express.json());

const listarClientes = (req, res) => {
  res.json(clientes);
};

app.route('/clientes').get(listarClientes);

app.listen(3001, () => {
  doConsume();
  console.log('Serviço de pedidos inicalizado');
});
