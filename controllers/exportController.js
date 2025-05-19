const { utils, write } = require('xlsx');
const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

const fonts = {
    Roboto: {
        normal: path.join(__dirname, '../fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '../fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../fonts/Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

function exportarPedidos(req, res) {
    try {
        const pedidos = req.pedidos;
        const ws = utils.json_to_sheet(pedidos.map(p => ({ ...p, pago: p.pago ? 'Sim' : 'Não' })));
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Pedidos');
        const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=backup_pedidos.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error('Erro ao exportar pedidos', err);
        res.status(500).json({ erro: 'Erro ao exportar pedidos' });
    }
}

function exportarPDF(req, res) {
    try {
        const pedidos = req.pedidos;

        // Cálculos de resumo
        const resumo = {
            totalPedidos: pedidos.length,
            totalHamburgueres: pedidos.reduce((soma, p) => soma + (p.quantidade || 0), 0),
            totalPago: pedidos.filter(p => p.pago).reduce((soma, p) => soma + (p.preco || 0), 0),
            totalPendente: pedidos.filter(p => !p.pago).reduce((soma, p) => soma + (p.preco || 0), 0)
        };

        //tabela por metodo de pagamento x recebido (logica)
        const totalPix = pedidos
            .filter(p => p.pago && (p.metodo_pagamento || '').toLowerCase().includes('pix'))
            .reduce((soma, p) => soma + (p.preco || 0), 0);

        const totalDinheiro = pedidos
            .filter(p => p.pago && (p.metodo_pagamento || '').toLowerCase().includes('dinheiro'))
            .reduce((soma, p) => soma + (p.preco || 0), 0);

        const totalCartao = pedidos
            .filter(p => p.pago && (p.metodo_pagamento || '').toLowerCase().includes('cartão'))
            .reduce((soma, p) => soma + (p.preco || 0), 0);

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

        // Tabelas
        const tabelaResumo = [
            ['Equipe', 'Qtd', 'Valor Pago', 'Valor Pendente'],
            ...Object.entries(porEquipe).map(([equipe, dados]) => [
                equipe,
                dados.quantidade,
                `R$ ${dados.valorPago.toFixed(2)}`,
                `R$ ${dados.valorPendente.toFixed(2)}`
            ])
        ];

        const tabelaPedidos = [
            [
                { text: 'ID', bold: true },
                { text: 'Cliente', bold: true },
                { text: 'Equipe', bold: true },
                { text: 'QTD', bold: true },
                { text: 'Método', bold: true },
                { text: 'Valor', bold: true },
                { text: 'Pago', bold: true }
            ],
            ...pedidos.map(p => {
                const cor = p.pago ? '#d4edda' : '#f8d7da'; // Verde claro ou vermelho claro
                return [
                    { text: `#${p.id}`, fillColor: cor },
                    { text: p.nome_cliente, fillColor: cor },
                    { text: p.equipe_vendedor, fillColor: cor },
                    { text: p.quantidade, fillColor: cor },
                    { text: p.metodo_pagamento || '---', fillColor: cor },
                    { text: `R$ ${p.preco.toFixed(2)}`, fillColor: cor },
                    { text: p.pago ? 'Pago' : 'Pendente', fillColor: cor }
                ];
            })
        ];

        const tabelaPagamentos = [
            ['Metodo de pagamento', 'Total recebido'],
            ['PIX', `R$ ${totalPix.toFixed(2)}`],
            ['Dinheiro', `R$ ${totalDinheiro.toFixed(2)}`],
            ['Cartão', `R$ ${totalCartao.toFixed(2)}`]
        ];

        // Conteúdo do PDF
        const docDefinition = {
            content: [
                { text: 'Relatório Sara Almirante', style: 'header', alignment: 'center' },
                { text: `Gerado em: ${new Date().toLocaleString()}`, style: 'small', alignment: 'center' },
                { text: '\n' },
                { text: '\nResumo Geral', style: 'subheader' },
                {
                    table: {
                        widths: ['*', '*', '*'],
                        body: [[
                            { text: ` Hamburgueres vendidos:\n${resumo.totalHamburgueres}`, style: 'infoBox', alignment: 'center' },
                            { text: ` Pedidos realizados:\n${resumo.totalPedidos}`, style: 'infoBox', alignment: 'center' },
                            { text: ` Faturamento total:\nR$ ${(resumo.totalPago + resumo.totalPendente).toFixed(2)}`, style: 'infoBox', alignment: 'center' }
                        ]]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 10]
                },
                { text: 'Entradas por Método de Pagamento', style: 'subheader' },
                { table: { body: tabelaPagamentos }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 10] },
                { text: '\nVendas por Equipe', style: 'subheader' },
                { text: `Equipe destaque: ${equipeTop}  |  Vendedor: ${vendedorTop}\n\n`, style: 'normal' },
                { table: { body: tabelaResumo }, layout: 'lightHorizontalLines' },
                { text: 'Extrato de Pedidos', style: 'subheader' },
                {
                    table: {
                        headerRows: 1,
                        width: ['auto', '*', '*', 'auto', '*', 'auto', 'auto'],
                        body: tabelaPedidos
                    }, layout: 'lightHorizontalLines',
                    fontSize: 11,
                    margin: [0, 0, 0, 20]
                }
            ],
            styles: {
                header: { fontSize: 18, bold: true },
                subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] },
                normal: { fontSize: 12 },
                small: { fontSize: 10, color: 'gray' },
                infoBox: {
                    fontSize: 12,
                    bold: true,
                    margin: [5, 5, 5, 5],
                }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        // Geração do PDF
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
}

module.exports = {
    exportarPedidos,
    exportarPDF
}