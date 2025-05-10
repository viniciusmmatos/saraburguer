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
const PdfPrinter = require('pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts');

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
            if (typeof horaRetirada === 'number') {
                const date = new Date(Math.round((horaRetirada - 25569) * 86400 * 1000));
                const horas = String(date.getUTCHours()).padStart(2, '0');
                const minutos = String(date.getUTCMinutes()).padStart(2, '0');
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
    io.emit('notificacao_novo_pedido', { mensagem: 'novo pedido adicionado!' })
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

const fonts = {
  Roboto: {
    normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
    italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);

app.get('/exportar-pdf', async (req, res) => {
  try {
    // Cálculos de resumo
    const resumo = {
      totalPedidos: pedidos.length,
      totalHamburgueres: pedidos.reduce((soma, p) => soma + (p.quantidade || 0), 0),
      totalPago: pedidos.filter(p => p.pago).reduce((soma, p) => soma + (p.preco || 0), 0),
      totalPendente: pedidos.filter(p => !p.pago).reduce((soma, p) => soma + (p.preco || 0), 0)
    };

    // Organização por equipe
    const porEquipe = {};
    let equipeTop = null;
    let maiorQtd = 0;
    let vendedorTop = '---';

    for (const p of pedidos) {
      const eq = p.equipe_vendedor || 'Outros';
      if (!porEquipe[eq]) {
        porEquipe[eq] = { quantidade: 0, valorPago: 0, valorPendente: 0, vendedores: {} };
      }
      porEquipe[eq].quantidade += p.quantidade;
      porEquipe[eq].valorPago += p.pago ? p.preco : 0;
      porEquipe[eq].valorPendente += !p.pago ? p.preco : 0;

      const vendedor = p.vendedor || 'Desconhecido';
      porEquipe[eq].vendedores[vendedor] = (porEquipe[eq].vendedores[vendedor] || 0) + p.quantidade;

      if (porEquipe[eq].quantidade > maiorQtd) {
        maiorQtd = porEquipe[eq].quantidade;
        equipeTop = eq;
        vendedorTop = Object.entries(porEquipe[eq].vendedores).sort((a, b) => b[1] - a[1])[0][0];
      }
    }

    // Monta a tabela resumo por equipe
    const tabelaResumo = [
      ['Equipe', 'Qtd', 'Valor Pago', 'Valor Pendente'],
      ...Object.entries(porEquipe).map(([equipe, dados]) => [
        equipe,
        dados.quantidade,
        `R$ ${dados.valorPago.toFixed(2)}`,
        `R$ ${dados.valorPendente.toFixed(2)}`
      ])
    ];

    // Monta a tabela de pedidos
    const tabelaPedidos = [
      ['ID', 'Cliente', 'Equipe', 'Qtd', 'Valor', 'Pago'],
      ...pedidos.map(p => [
        `#${p.id}`,
        p.nome_cliente,
        p.equipe_vendedor,
        p.quantidade.toString(),
        `R$ ${p.preco.toFixed(2)}`,
        p.pago ? 'Pago' : 'Pendente'
      ])
    ];

    // Definição do conteúdo do PDF
    const docDefinition = {
      content: [
        { text: 'Relatório Sara Almirante', style: 'header', alignment: 'center' },
        { text: `Gerado em: ${new Date().toLocaleString()}`, style: 'small', alignment: 'center' },
        { text: '\nVendas por Equipe', style: 'subheader' },
        { table: { body: tabelaResumo }, layout: 'lightHorizontalLines' },
        { text: `Equipe destaque: ${equipeTop}  |  Vendedor: ${vendedorTop}\n\n`, style: 'normal' },
        { text: 'Extrato de Pedidos', style: 'subheader' },
        { table: { body: tabelaPedidos }, layout: 'lightHorizontalLines' },
        { text: '\nResumo Geral', style: 'subheader' },
        {
          ul: [
            `Hamburgueres vendidos: ${resumo.totalHamburgueres}`,
            `Pedidos realizados: ${resumo.totalPedidos}`,
            `Faturamento total: R$ ${(resumo.totalPago + resumo.totalPendente).toFixed(2)}`
          ]
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] },
        normal: { fontSize: 12 },
        small: { fontSize: 10, color: 'gray' }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    // Gerando PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename=relatorio_saraburguer.pdf');
      res.send(pdfBuffer);
    });

    pdfDoc.end();
  } catch (err) {
    console.error('Erro ao gerar PDF', err);
    res.status(500).json({ erro: 'Erro ao gerar relatório em PDF' });
  }
});

app.get('/teste-pdf', (req, res) => {
    const PDFDocument = require('pdfkit');
    const { table } = require('pdfkit-table');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="teste.pdf"');
        res.send(pdfData);
    });

    // Conteúdo simples
    doc.fontSize(18).text('Teste de PDF com Tabela', { align: 'center' });

    const exemploTabela = {
        title: 'Exemplo de Tabela',
        headers: ['Coluna 1', 'Coluna 2'],
        rows: [
            ['Valor 1', 'Valor 2'],
            ['Outro 1', 'Outro 2']
        ]
    };

    doc.table(exemploTabela, { width: 500 });

    doc.end();
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