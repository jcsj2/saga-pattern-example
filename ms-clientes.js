const express = require('express');
const crypto = require('crypto');
const { RabbitMQUtils, exchanges } = require('./rabbitmq');

const clientes = [];

const app = express();
app.use(express.json());

const listarClientes = (req, res) => {
  res.json(clientes);
};

const detalharCliente = (req, res) => {
  const { params: { id } } = req;

  const cliente = clientes.find((c) => c.id === id);
  if (!cliente) res.sendStatus(404);
  res.json(cliente);
};

const enviarDadosClienteParaExchangeCriarEditar = async (dadosCliente) => {
  const conn = await RabbitMQUtils.getConnection();
  const ch = await conn.createChannel();
  await ch.publish(exchanges.exchCreateEditClientes, '', Buffer.from(JSON.stringify(dadosCliente)));
};

const criarCliente = async (req, res) => {
  const { body } = req;
  const id = crypto.randomUUID();
  const novoCliente = {
    id,
    ...body,
  };
  clientes.push(novoCliente);

  await enviarDadosClienteParaExchangeCriarEditar(novoCliente);

  res.status(201).header('location', `http://localhost:3000/clientes/${id}`).send();
};

const atualizarCliente = async (req, res) => {
  const { params: { id }, body } = req;

  const indiceCliente = clientes.findIndex((c) => c.id === id);
  if (indiceCliente === -1) return res.sendStatus(404);

  const dadosCliente = { id, ...body };
  clientes[indiceCliente] = dadosCliente;
  await enviarDadosClienteParaExchangeCriarEditar(dadosCliente);

  return res.send();
};

app.route('/clientes').get(listarClientes).post(criarCliente);
app.route('/clientes/:id').get(detalharCliente).put(atualizarCliente);

RabbitMQUtils.setup().then(() => {
  app.listen(3000, () => {
    console.log('Serviço de clientes inicalizado');
  });
}).catch((err) => {
  console.log(`Falha no setup do RabbitMQ ${err.message}`);
});
