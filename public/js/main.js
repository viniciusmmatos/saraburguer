const socket = io();
const tabela = document.getElementById('tabela-pedidos');
const form = document.getElementById('form-novo-pedido');
let precoUnitario = parseFloat(prompt("Informe o valor unitário do hamburguer:")) || 0;

// Exibe o campo de upload dento do forms + novo pedido
function mostrarCampoUpload() {
    document.getElementById('area-upload').classList.remove('hidden');
}
// Recebe os dados de XLSX e converte em JSON para subir na tabela
document.getElementById('form-importar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);

    const resp = await fetch(`/import?preco_unitario=${precoUnitario}`, {
        method: 'POST',
        body: data
    });

    alert(resp.ok ? '✅ Pedidos importados com sucesso!' : '❌ Erro ao importar pedidos.');
    document.getElementById('area-upload').classList.add('hidden');
    form.reset();
});

//Cria a tabela com base nos novos pedidos adicionados tanto manual quanto em massa (xlsx)
function renderizarTabela(pedidos) {
    tabela.innerHTML = '';
    pedidos.forEach(pedido => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td class="px-4 py-2 text-center"><input type="checkbox" class="selecionar-pedido" value="${pedido.id}"></td>
          <td class="px-4 py-2">#${pedido.id}</td>
          <td class="px-4 py-2">${pedido.nome_cliente}</td>
          <td class="px-4 py-2">${pedido.quantidade}</td>
          <td class="px-4 py-2">${pedido.item_pedido}</td>
          <td class="px-4 py-2">${pedido.descricao}</td>
          <td class="px-4 py-2">${pedido.vendedor}</td>
          <td class="px-4 py-2">${pedido.delivery}</td>
          <td class="px-4 py-2">${pedido.hora_retirada}</td>
          <td class="px-4 py-2">R$ ${pedido.preco}</td>
          <td class="px-4 py-2 text-center">${pedido.pago ? '✔️' : '❌'}</td>
          <td class="px-4 py-2">
            <select onchange="alterarStatus(${pedido.id}, this.value)" class="border rounded p-1 text-sm">
              <option value="em_preparo" ${pedido.status === 'em_preparo' ? 'selected' : ''}>Em Preparo</option>
              <option value="pronto" ${pedido.status === 'pronto' ? 'selected' : ''}>Pronto</option>
              <option value="entregue" ${pedido.status === 'entregue' ? 'selected' : ''}>Entregue</option>
              <option value="em_transito" ${pedido.status === 'em_transito' ? 'selected' : ''}>Em Trânsito</option>
            </select>
          </td>
          <td class="px-4 py-2 text-center">
            <button onclick="imprimirEtiqueta(${pedido.id})" class="bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-2 rounded text-sm">🖨️</button>
            <button onclick="deletarPedido(${pedido.id})" class="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-sm">🗑️</button>
            <button onclick="marcarComoPago(${pedido.id})" class="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-sm">💰</button>`;
        tabela.appendChild(linha);
    });
}

//gera a tabela
socket.on('pedidos_atualizados', renderizarTabela);
async function carregarPedidos() {
    const resp = await fetch('/pedidos');
    const dados = await resp.json();
    renderizarTabela(dados);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const quantidade = parseInt(formData.get("quantidade")) || 1;
    const precoTotal = quantidade * precoUnitario;

    const novoPedido = {
        nome_cliente: formData.get("nome_cliente"),
        telefone: formData.get("telefone"),
        endereco: formData.get("endereco"),
        equipe_vendedor: formData.get("equipe_vendedor"),
        vendedor: formData.get("vendedor"),
        item_pedido: formData.get("item_pedido"),
        descricao: formData.get("descricao"),
        quantidade: quantidade,
        hora_retirada: formData.get("hora_retirada"),
        delivery: formData.get("delivery"),
        metodo_pagamento: formData.get("metodo_pagamento"),
        troco_para: formData.get("troco_para"),
        preco: precoTotal
    };

    await fetch('/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPedido)
    });
    form.reset();
});

//alteração de status faz interação com o INDEX2 (tela de pedidos prontos e em preparo)
async function alterarStatus(id, novoStatus) {
    await fetch(`/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
    });
}

// Deleta um pedido
async function deletarPedido(id) {
    if (confirm('Deseja deletar este pedido?')) {
        await fetch(`/pedidos/${id}`, { method: 'DELETE' });
    }
}

//etiquetas começam aqui
function gerarEtiqueta(pedido) {
    const janela = window.open('', '', 'width=380,height=500');
    janela.document.write(`<html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              text-align: left;
              font-size: 16px;
              background-color: #f3f3f3;
              padding: 8px;
              border-bottom: 1px solid #ccc;
            }
            td {
              padding: 6px 8px;
              border-bottom: 1px solid #eee;
            }
            .titulo {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="titulo">🍔 Pedido #${pedido.id}</div>
          <table>
            <tr><th>Equipe</th><td>${pedido.equipe_vendedor}</td></tr>
            <tr><th>Vendedor</th><td>${pedido.vendedor}</td></tr>
            <tr><th>Cliente</th><td>${pedido.nome_cliente}</td></tr>
            <tr><th>Telefone</th><td>${pedido.telefone}</td></tr>
            <tr><th>Endereço</th><td>${pedido.endereco}</td></tr>
            <tr><th>Item</th><td>${pedido.quantidade}x ${pedido.item_pedido}</td></tr>
            <tr><th>Descrição</th><td>${pedido.descricao}</td></tr>
            <tr><th>Entrega</th><td>${pedido.delivery}</td></tr>
            <tr><th>Hora retirada</th><td>${pedido.hora_retirada}</td></tr>
            <tr><th>Pagamento</th><td>${pedido.metodo_pagamento}</td></tr>${pedido.metodo_pagamento === 'dinheiro' && pedido.troco_para ? `<tr><th>Troco para</th><td>R$ ${pedido.troco_para}</td></tr><tr><th>Troco a devolver</th><td>R$ ${(pedido.troco_para - pedido.preco).toFixed(2)}</td></tr>` : ''}
            <tr><th>Valor total pedido</th><td>R$ ${pedido.preco}</td></tr>
          </table>
          <script>
            window.print();
            window.onafterprint = function() { window.close(); };
          <\/script>
        </body>
        </html>
      `);
    janela.document.close();
}

async function imprimirEtiqueta(id) {
    const resp = await fetch('/pedidos');
    const pedidos = await resp.json();
    const pedido = pedidos.find(p => p.id === id);
    if (pedido) gerarEtiqueta(pedido);
}

function imprimirSelecionados() {
    const selecionados = Array.from(document.querySelectorAll('.selecionar-pedido:checked')).map(cb => parseInt(cb.value));
    fetch('/pedidos').then(res => res.json()).then(pedidos => {
        selecionados.forEach(id => {
            const pedido = pedidos.find(p => p.id === id);
            if (pedido) gerarEtiqueta(pedido);
        });
    });
}

function imprimirTodosEmPreparo() {
    fetch('/pedidos').then(res => res.json()).then(pedidos => {
        pedidos.filter(p => p.status === 'em_preparo').forEach(p => gerarEtiqueta(p));
    });
}
// fim etiquetas

//tag pago
async function marcarComoPago(id) {
    const resp = await fetch('/pedidos');
    const pedidos = await resp.json();
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;

    const novoPago = !pedido.pago;

    await fetch(`/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago: !pedido.pago })
    });
}


carregarPedidos();

//mostra o formulario
function alterarFormulario() {
    document.getElementById('bloco-formulario').classList.toggle('hidden');
}

//backup em formato xlsx
function exportarBackup() {
    window.location.href = '/exportar';
}