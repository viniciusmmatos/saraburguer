const { utils, writeFile } = require('xlsx');

let pedidos = [];
let pedidoId = 1;

function getPedidos() {
  return pedidos;
}

function calcularPrecoTotal(pedido, precoUnitario) {
  const quantidade = parseInt(pedido.quantidade) || 1;
  const valorHamburguer = (quantidade * precoUnitario);
  const descontoEspecial = Number(pedido.desconto_especial) || 0;

  let precoFinal = valorHamburguer - descontoEspecial;
  let desconto_aplicado = false;

  const deliveryFormatado = String(pedido.delivery).trim().toLowerCase();
  if (deliveryFormatado === 'não' || deliveryFormatado === 'nao') {
    precoFinal *= (1 - 0.1364); 
    desconto_aplicado = true;
  }

  return {
    preco: parseFloat(precoFinal.toFixed(2)),
    desconto_aplicado,
  };
}

function adicionarPedidos(novoPedido) {
  const precoUnitario = parseFloat(novoPedido.preco_unitario || 0);
  const { preco, desconto_aplicado} = calcularPrecoTotal(novoPedido, precoUnitario);

  const pedido = {
    ...novoPedido,
    id: pedidoId++,
    status: 'em_fila',
    pago: false,
    preco,
    desconto_aplicado
  };

  pedidos.push(pedido);
  return pedido;
}

function atualizarPedido(id, dadosAtualizados) {
    const index = pedidos.findIndex(p => p.id === id);
    if (index === -1) return null;

    const pedidoAtual = pedidos[index];
    const pedidoAtualizado = { ...pedidoAtual, ...dadosAtualizados };

    // Recalcular apenas se houver mudança relevante
    const camposParaRecalcular = ['quantidade', 'delivery', 'valor_delivery'];
    const deveRecalcular = camposParaRecalcular.some(campo => campo in dadosAtualizados);

    if (deveRecalcular) {
        const precoUnitario = parseFloat(pedidoAtualizado.preco_unitario || 0) || 0;
        const { preco, desconto_aplicado, valor_delivery } = calcularPrecoTotal(pedidoAtualizado, precoUnitario);
        pedidoAtualizado.preco = preco;
        pedidoAtualizado.desconto_aplicado = desconto_aplicado;
        pedidoAtualizado.valor_delivery = valor_delivery;
    }

    pedidos[index] = pedidoAtualizado;
    return pedidos[index];
}

function deletarPedido(id) {
  pedidos = pedidos.filter(p => p.id !== id);
}

function importarPedidos(data, precoUnitario) {
  data.forEach((linha) => {
    const quantidade = parseInt(linha.quantidade) || 1;
    const delivery = linha.delivery || 'nao';
    const valor_delivery = parseFloat(linha.valor_delivery) || 0;

    let horaRetirada = linha.hora_retirada || '';
    if (typeof horaRetirada === 'number') {
      const date = new Date(Math.round((horaRetirada - 25569) * 86400 * 1000));
      const horas = String(date.getUTCHours()).padStart(2, '0');
      const minutos = String(date.getUTCMinutes()).padStart(2, '0');
      horaRetirada = `${horas}:${minutos}`;
    }

    const basePedido = {
      nome_cliente: linha.nome_cliente || 'Não preenchido',
      telefone: linha.telefone || '',
      endereco: linha.endereco || 'Igreja',
      equipe_vendedor: linha.equipe_vendedor || 'igreja',
      vendedor: linha.vendedor || 'igreja',
      item_pedido: linha.item_pedido || 'hamburguer',
      descricao: linha.descricao || 'Todos completos',
      quantidade,
      hora_retirada: horaRetirada,
      delivery,
      metodo_pagamento: linha.metodo_pagamento || '',
      pago: String(linha.pago).toLowerCase() === 'sim',
      status: linha.status || 'em_fila',
      observacao: linha.observacao || '',
      valor_delivery,
      desconto_especial: linha.desconto_especial
    };

    const { preco, desconto_aplicado } = calcularPrecoTotal(basePedido, precoUnitario);

    pedidos.push({
      id: pedidoId++,
      ...basePedido,
      preco,
      desconto_aplicado
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
