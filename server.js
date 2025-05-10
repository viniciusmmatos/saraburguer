//importando dependecias
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const fs = require('fs');
const { utils, writeFile, write } = xlsx;
const PDFdocument = require('pdfkit');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
//definição de array para memoria volatil e contador de pedidos (sequencia 1,2,3,...)
let pedidos = [];
let pedidoId = 1;

//multer para subir o arquivo em xlsx
const upload = multer({ dest: 'upload/' });
app.post('/import', upload.single('arquivo'), (req, res) => {
    try {
        const precoUnitario = parseFloat(req.query.preco_unitario) || 0;
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        if (!sheet) {
            return res.status(400).json({ erro: 'Planilha vazia ou inválida.' });
        }
        // transforma xlsx em JSON
        const data = xlsx.utils.sheet_to_json(sheet);

        data.forEach((linha, index) => {
            const quantidade = parseInt(linha.quantidade) || 1;
            const precoTotal = quantidade * precoUnitario;
            let horaRetirada = linha.hora_retirada || '';
            if(typeof horaRetirada === 'number') {
                const date = new Date (Math.round((horaRetirada - 25569) * 86400 * 1000));
                const horas = String(date.getUTCHours()).padStart(2,'0');
                const minutos = String(date.getUTCMinutes()).padStart(2,'0');
                horaRetirada = `${horas}:${minutos}`;
            }
            pedidos.push({
                id: pedidoId++,
                nome_cliente: linha.nome_cliente || 'Desconhecido',
                telefone: linha.telefone || '',
                endereco: linha.endereco || '',
                equipe_vendedor: linha.equipe_vendedor || 'Igreja',
                vendedor: linha.vendedor || 'Igreja',
                item_pedido: linha.item_pedido || 'hamburguer',
                descricao: linha.descricao || 'Todos completos',
                quantidade: quantidade,
                hora_retirada: horaRetirada,
                delivery: linha.delivery || '',
                preco: precoTotal,
                metodo_pagamento: linha.metodo_pagamento || '',
                pago: linha.pago || false,
                status: linha.status || 'em_preparo'
            });
        });

        io.emit('pedidos_atualizados', pedidos);
        res.json({ sucesso: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao processar planilha.' });
    }
});

//exportar pedidos
app.get('/exportar', (req, res) => {
    try {
        const exportarPedidos = pedidos.map(p => ({
            ...p,
            pago: p.pago ? 'Sim' : 'Não' 
          }));
        const ws = utils.json_to_sheet(pedidos);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Pedidos');

        const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=backup_pedidos.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error('Erro ao gerar o backup', err);
        res.status(500).json({ erro: 'Erro ao exportar pedidos' });
    }
});

//backup automatico
function salvarBackup() {
    try {
        const exportarPedidos = pedidos.map(p => ({
            ...p,
            pago: p.pago ? 'Sim' : 'Não'
          }));
        const ws = utils.json_to_sheet(pedidos);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Pedidos');
        writeFile(wb, 'backup_automatico.xlsx');
        console.log('[✓] backup automatico realizado com sucesso')
    } catch (err) {
        console.error('[X] Erro ao salvar o backup automatico', err);
    }
}

//listar os pedidos
app.get('/pedidos', (req, res) => {
    res.json(pedidos);
});

//criação de um novo pedido
app.post('/pedidos', (req, res) => {
    const novoPedido = { ...req.body, id: pedidoId++, status: 'em_preparo', pago: false }
    pedidos.push(novoPedido);
    salvarBackup();
    io.emit('pedidos_atualizados', pedidos);
    io.emit('notificacao_novo_pedido', {mensagem: 'novo pedido adicionado!'})
    res.json(novoPedido);
})

//atualização dos pedidos
app.put('/pedidos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
        pedidos[index] = { ...pedidos[index], ...req.body };
        io.emit('pedidos_atualizados', pedidos);
        res.json(pedidos[index]);
    } else {
        res.status(404).json({ erro: 'pedido não encontrado' });
    }
});

//deletar um pedido
app.delete('/pedidos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    pedidos = pedidos.filter(p => p.id !== id);
    io.emit('pedidos_atualizados', pedidos);
    res.json({ sucesso: true });
});

//exportar relatorio em PDF
app.get('/exportar-pdf', (req, res) => {
    try {
        const doc = new PDFdocument();
        const filename = `relatorio_pedidos.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Relatorio de pedidos 🍔', { aling: 'center' });
        doc.moveDown();

        pedidos.forEach(pedido =>{
            doc.fontSize(12).text(`pedido #${pedido.id}`);
            doc.text(`Cliente: ${pedido.nome_cliente}`);
            doc.text(`Telefone: ${pedido.telefone}`);
            doc.text(`Endereço: ${pedido.endereco}`);
            doc.text(`Equipe: ${pedido.equipe_vendedor}`);
            doc.text(`Vendedor: ${pedido.vendedor}`);
            doc.text(`Item: ${pedido.item_pedido} x${pedido.quantidade}`);
            doc.text(`Descrição: ${pedido.descricao}`);
            doc.text(`Hora Retirada: ${pedido.hora_retirada}`);
            doc.text(`Delivery: ${pedido.delivery}`);
            doc.text(`Preço: R$ ${pedido.preco.toFixed(2)}`);
            doc.text(`Status: ${pedido.status}`);
            doc.moveDown();
        });

        doc.end();
    } catch (err) {
        console.error('Erro ao gerar PDF',err);
        res.status(500).json({erro: 'Erro ao gerar relatorio em PDF'})
    }
});

//temporizador para backup automatico 2 em 2 minutos
setInterval(() => {
    salvarBackup();
}, 2 * 60 * 1000);

io.on('connection', (socket) => {
    console.log('novo cliente conectado');
    socket.emit('pedidos_atualizados', pedidos);
});

server.listen(3000, () => console.log('Servidor ouvindo a porta 3000'))