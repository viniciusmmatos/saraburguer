const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');

const pedidosController = require('./controllers/pedidosController');
const exportController = require('./controllers/exportController');
const backupController = require('./controllers/backupController');
const settingController = require('./controllers/settingController');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'upload/' });

app.get ('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public','admin.html'))
})

app.get('/pedidos', (req, res) => {
  res.json(pedidosController.getPedidos());
});

app.post('/pedidos', (req, res) => {
  const novoPedido = pedidosController.adicionarPedidos(req.body);
  io.emit('pedidos_atualizados', pedidosController.getPedidos());
  io.emit('notificacao_novo_pedido', { mensagem: 'novo pedido adicionado!' });
  res.json(novoPedido);
});

app.put('/pedidos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const atualizado = pedidosController.atualizarPedido(id, req.body);
  if (atualizado) {
    io.emit('pedidos_atualizados', pedidosController.getPedidos());
    res.json(atualizado);
  } else {
    res.status(404).json({ erro: 'Pedido não encontrado' });
  }
});

app.delete('/pedidos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  pedidosController.deletarPedido(id);
  io.emit('pedidos_atualizados', pedidosController.getPedidos());
  res.json({ sucesso: true });
});

app.post('/import', upload.single('arquivo'), (req, res) => {
  try {
    const precoUnitario = parseFloat(req.query.preco_unitario) || 0;
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    pedidosController.importarPedidos(data, precoUnitario);

    io.emit('pedidos_atualizados', pedidosController.getPedidos());
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao importar pedidos', err);
    res.status(500).json({ erro: 'Erro ao importar pedidos.' });
  }
});


app.get('/exportar', (req, res) => {
  ;
  req.pedidos = pedidosController.getPedidos();
  exportController.exportarPedidos(req, res);
})
app.get('/exportar-pdf', (req, res) => {
  req.pedidos = pedidosController.getPedidos();
  exportController.exportarPDF(req, res);
})

let configuracoes = {
  qrcode_pix: '',
  preco_unitario: 0
}
app.post('/configuracoes', express.json(), settingController.salvarConfiguracoes);

app.get('/configuracoes', settingController.obterConfiguracoes);

setInterval(() => {
  backupController.salvarBackup(pedidosController.getPedidos());
}, 2 * 60 * 1000);

io.on('connection', (socket) => {
  console.log('Cliente conectado');
  socket.emit('pedidos_atualizados', pedidosController.getPedidos());
});

server.listen(3000, () => {
  console.log('Servidor ouvindo a porta 3000');
});