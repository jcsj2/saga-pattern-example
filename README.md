## saga-pattern-example

### Para executar o exemplo serão necessários Docker e NodeJS/NPM instalados
- Instalar as dependencias com o `npm install`
- Executar comando docker para iniciar um container do RabbiqMQ: `docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.11-management`
- Executar os 3 scripts do package.json em terminais diferentes. Exemplo: `npm run clientes-dev`
OBS: - O arquivo api.http tem as rotas e payloads disponíveis nos exemplos para cada micro serviço
