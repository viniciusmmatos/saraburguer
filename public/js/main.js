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
let pedidosCache = [];

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
// filtro
function aplicarFiltro(){

  const nomeFiltro = document.getElementById('filtro-nome').value.toLowerCase();
  const statusFiltro = document.getElementById('filtro-status').value;
  const deliveryFiltro = document.getElementById('filtro-delivery').value;
  
  const pedidosFiltrados = pedidosCache.filter(p => {
    const nomeMatch = p.nome_cliente.toLowerCase().includes(nomeFiltro);
    const statusMatch = !statusFiltro || p.status === statusFiltro;
    const deliveryMatch = !deliveryFiltro || p.delivery === deliveryFiltro;
    return nomeMatch && statusMatch && deliveryMatch;
  });
  
  renderizarTabela(pedidosFiltrados)

}

document.getElementById('filtro-nome').addEventListener('input', aplicarFiltro);
document.getElementById('filtro-status').addEventListener('change', aplicarFiltro);
document.getElementById('filtro-delivery').addEventListener('change',aplicarFiltro);

socket.on('pedidos_atualizados', (dados) => {
  pedidosCache = dados;
  aplicarFiltro();
})

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
  const troco_para = parseFloat(formData.get("troco_para")) || 0;
  const troco = troco_para - precoTotal; //Calculo troco

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
    troco_para: troco_para,
    preco: precoTotal,
    troco: troco
  };

  await fetch('/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoPedido)
  });
  form.reset();
  mostrarNotificacao();
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
  const janela = window.open('', '', 'width=380,height=600');
  const valorTotal = (pedido.preco || 0).toFixed(2);
  const trocoTexto = (pedido.metodo_pagamento === 'dinheiro' && pedido.troco) ?
    `<div><strong>Troco:</strong> R$: ${parseFloat(pedido.troco).toFixed(2)}</div>` : '';

  janela.document.write(`<html>
        <head>
          <style>
            body{
              font-family:monospace;
              padding: 10px;
            }
            .center{
                text-align: center;
            }
            .bold{
                font-weight: bold;
            }
            .separator {
                border-top: 1px dashed #000;
                margin: 10px 0;
            }
            .qrcode {
                margin-top: 10px;
                text-align: center;
            }
            .qrcode img {
                width: 150px;
                height: 150px;
            }
          </style>
        </head>
        <body>
            <div class="center bold">Sara Almirante</div>
            <div class="center">R. José Milek Filho,297</div>
            <div class="center">Campina do Arruda - Alm. Tamandaré/PR</div>

            <div class="separator"></div>

            <div class="bold">Pedido #${pedido.id}</div>
            <div class="bold">Horario retirada / entrega: ${pedido.hora_retirada}</div>
            <div><strong>Delivery: ${pedido.delivery}</strong></div>
            <br>
            <div><strong>${pedido.quantidade} x</strong> ${pedido.item_pedido}</div>
            <div>${pedido.descricao || ''}</div>
            <br>

            <div class="bold">Valor total: R$ ${valorTotal}</div>
            ${trocoTexto}
            <div>Mtd pagamento: ${pedido.metodo_pagamento}</div>
            <div>Pago: ${pedido.pago ? 'Sim' : 'Não'} </div>
            <div class="separator"></div>
            <div class="center bold">--Dados para entrega--</div>
            <br>
            <div>Cliente:${pedido.nome_cliente}</div>
            <div>Vendedor:${pedido.vendedor} EQUIPE: ${pedido.equipe_vendedor}</div>
            <div>Endereço:${pedido.endereco}</div>
            <div>Telefone:${pedido.telefone}</div>

            <div class="separator"></div>
            <div class="center bold">Vai pagar no dinheiro ou Debito? Faz no PIX! 💗</div>
            <div class="qrcode">
                <img src="https://api.qrserver.com/v1/create-qr-code/?data=COLOCAR_QR_CODE_COIPIA_E_COLA_OU_GERARPIX.COM.BR&size=150x150" alt="QR code pix">
            </div>
          <script>
            window.print();
            window.onafterprint = function() { window.close(); };
          <\/script>
        </body>
        </html>`);
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

//notificação novo pedido
function mostrarNotificacao(mensagem = 'Novo pedido criado!') {
  const box = document.getElementById('notificacao');
  box.querySelector('.texto-notificacao').innerText = mensagem;
  box.classList.remove('hidden');
  box.classList.add('animate-fade-in');

  setTimeout(() => {
    box.classList.add('hidden');
  }, 4000);
}

function fecharNotificacao() {
  const box = document.getElementById('notificacao');
  box.classList.add('hidden');
}

socket.on('notificacao_novo_pedido', (dados) => {
  mostrarNotificacao(dados.mensagem);
})

//backup em formato xlsx
function exportarBackup() {
  window.location.href = '/exportar';
}