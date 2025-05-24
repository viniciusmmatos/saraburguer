const { utils, writeFile } = require('xlsx');

let pedidos = [];
let pedidoId = 1;

function getPedidos() {
    return pedidos;
}

function adicionarPedidos(novoPedido) {
    const pedido = { ...novoPedido, id: pedidoId++, status: 'em_preparo', pago: false };
    pedidos.push(pedido);
    return pedido;
}

function atualizarPedido(id, dadosAtualizados) {
    const index = pedidos.findIndex(p => p.id === id)
    if (index !== -1) {
        pedidos[index] = { ...pedidos[index], ...dadosAtualizados };
        return pedidos[index];
    }
    return null
}

function deletarPedido(id){
    pedidos = pedidos.filter(p => p.id !== id);
}

function importarPedidos(data, percoUnitario) {
    data.forEach((linha) => {
        const quantidade = parseInt(linha.quantidade) || 1;
        const precoTotal = quantidade * percoUnitario;
        let horaRetirada = linha.hora_retirada || '';
        if (typeof horaRetirada === 'number') {
            const date = new Date(Math.round((horaRetirada - 25569) * 86400 * 1000));
            const horas = String(date.getUTCHours()).padStart(2, '0');
            const minutos = String(date.getUTCMinutes()).padStart(2, '0');
            horaRetirada = `${horas}:${minutos}`;

        }

        pedidos.push({
            id: pedidoId++,
            nome_cliente: linha.nome_cliente || 'Não preenchido',
            telefone: linha.telefone || '',
            endereco: linha.endereco || 'Igreja',
            equipe_vendedor: linha.equipe_vendedor || 'igreja',
            vendedor: linha.vendedor || 'igreja',
            item_pedido: linha.item_pedido || 'hamburguer',
            descricao: linha.descricao || 'Todos completos',
            quantidade,
            hora_retirada: horaRetirada,
            delivery: linha.delivery || 'Não',
            preco: precoTotal,
            metodo_pagamento: linha.metodo_pagamento || '',
            pago: String(linha.pago).toLowerCase() === 'sim',
            status: linha.status || 'em_fila',
            observacao: linha.observacao || '',
<<<<<<< HEAD
            valor_delivery: linha.valor_delivery || 0
=======
            valor_delivery: linha.valor_delivery || '0'
>>>>>>> 89d5440 (CORREÇÃO: Bug da etiqueta em pedidos no formulario)
        });
    });
}

module.exports = {
    getPedidos,
    adicionarPedidos,
    atualizarPedido,
    deletarPedido,
    importarPedidos
};
