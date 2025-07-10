const socket = io();
const tabela = document.getElementById('tabela-pedidos');
const form = document.getElementById('form-novo-pedido');

//Cria a tabela com base nos novos pedidos adicionados tanto manual quanto em massa (xlsx)
let pedidosCache = [];

function renderizarTabela(pedidos) {
  tabela.innerHTML = '';
  pedidos.forEach(pedido => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
          <td class="px-4 py-2 text-center"><input type="checkbox" class="selecionar-pedido" value="${pedido.id}"></td>
          <td class="px-2 py-2">#${pedido.id}</td>
          <td class="px-4 py-2">${pedido.nome_cliente}</td>
          <td class="px-4 py-2">${pedido.quantidade}</td>
          <td class="px-4 py-2">${pedido.item_pedido}</td>
          <td class="px-4 py-2">${pedido.descricao}</td>
          <td class="px-4 py-2">${pedido.delivery}</td>
          <td class="px-4 py-2">${pedido.hora_retirada}</td>
          <td class="px-4 py-2">
            <select onchange="alterarStatus(${pedido.id}, this.value)" class="border rounded p-1 text-sm">
              <option value="em_fila" ${pedido.status === 'em_fila' ? 'selected' : ''}>Em Fila</option>
              <option value="em_preparo" ${pedido.status === 'em_preparo' ? 'selected' : ''}>Em Preparo</option>
              <option value="pronto" ${pedido.status === 'pronto' ? 'selected' : ''}>Pronto</option>
              <option value="em_transito" ${pedido.status === 'em_transito' ? 'selected' : ''}>Em Trânsito</option>
              <option value="entregue" ${pedido.status === 'entregue' ? 'selected' : ''}>Entregue</option>
              </select>
              </td>
          <td class="px-4 py-2 text-center">
          <button onclick="imprimirEtiqueta(${pedido.id})" class="bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-2 rounded text-sm">🖨️</button>
            <button onclick="deletarPedido(${pedido.id})" class="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-sm">🗑️</button>
            `;
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

// filtro
function aplicarFiltro() {

  const nomeFiltro = document.getElementById('filtro-nome')?.value.toLowerCase();
  const statusFiltro = document.getElementById('filtro-status')?.value;
  const deliveryFiltro = document.getElementById('filtro-delivery')?.value;
  const horarioFiltro = document.getElementById('filtro-horario')?.value;

  const pedidosFiltrados = pedidosCache.filter(p => {
    const nomeMatch = p.nome_cliente.toLowerCase().includes(nomeFiltro);
    const statusMatch = !statusFiltro || p.status === statusFiltro;
    const deliveryMatch = !deliveryFiltro || p.delivery === deliveryFiltro;
    const horarioMatch = !horarioFiltro || (p.hora_retirada && p.hora_retirada.includes(horarioFiltro));
    return nomeMatch && statusMatch && deliveryMatch && horarioMatch;
  });

  renderizarTabela(pedidosFiltrados)

}

socket.on('pedidos_atualizados', (dados) => {
  pedidosCache = dados;
  aplicarFiltro();
})

document.getElementById('filtro-nome').addEventListener('input', aplicarFiltro);
document.getElementById('filtro-status').addEventListener('change', aplicarFiltro);
document.getElementById('filtro-delivery').addEventListener('change', aplicarFiltro);
document.getElementById('filtro-horario')?.addEventListener('input', aplicarFiltro);

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
async function gerarEtiqueta(pedido) {
  try {
    const configResp = await fetch('/configuracoes');
    const config = await configResp.json();
    const qrcodeURL = config.qrcode_pix 
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(config.qrcode_pix)}&size=150x150` : null;
    console.log(config);
    const janela = window.open('', '', 'width=210,height=auto');

    //calculos dos valores
    const valorTotal = ((pedido.preco || 0) + (pedido.valor_delivery || 0)).toFixed(2);
    const trocoTexto = (pedido.metodo_pagamento === 'dinheiro' && pedido.troco) ?
      `<div><strong>Troco:</strong> R$: ${parseFloat(pedido.troco).toFixed(2)}</div>` : '';
    const desconto = (pedido.delivery.toLowerCase() === 'nao') ? 
      `<div class ="bold">Desconto de 13,64% Aplicado</div>` : '';
    const vlr_delivery = (pedido.valor_delivery === 0) ? 
      '' : `<div class="bold">Delivery: R$ ${(pedido.valor_delivery).toFixed(2)}</div>`;
    
    // html do cupom
    janela.document.write(`<html>
        <head>
          <style>
            body{
              font-family:monospace;
              font-size: 11px;
              width: 200px;
              padding: 5px;
              margin: 0;
            }
            .center{
                text-align: center;
            }
            .bold{
                font-weight: bold;
            }
            .separator {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            .qrcode {
                margin-top: 5px;
                text-align: center;
            }
            .qrcode img {
                width: 100px;
                height: 100px;
            }
          </style>
        </head>
        <body>
            <div class="center bold">Sara Almirante</div>
            <div class="center">R. José Milek Filho,297</div>
            <div class="center">Campina do Arruda - Alm. Tamandaré/PR</div>

            <div class="separator"></div>

            <div class="bold">PEDIDO #${pedido.id}</div>
            <div><strong>${pedido.quantidade} x</strong> ${pedido.item_pedido}</div>
            <div>${pedido.descricao || ''}</div>
            <div><strong>Delivery:</strong> ${pedido.delivery} | <strong>Retirada:</strong> ${pedido.hora_retirada} </div>
            <div class="separator"></div>
            <div class="bold">Subtotal: R$ ${(pedido.preco).toFixed(2)}</div>
            ${vlr_delivery}
            ${desconto}
            <div class="bold">Valor total: R$ ${valorTotal}</div>
            ${trocoTexto}
            <div>Mtd pagamento: ${pedido.metodo_pagamento}</div>
            <div>Pago: ${pedido.pago ? 'Sim' : 'Não'} </div>
            <div class="separator"></div>
            <div class="center bold">--Dados para entrega--</div>
            <div><strong>Cliente:</strong> ${pedido.nome_cliente}</div>
            <div><strong>Vendedor:</strong> ${pedido.vendedor} <strong>EQUIPE:</strong> ${pedido.equipe_vendedor}</div>
            <div><strong>ENDEREÇO:</strong> ${pedido.endereco}</div>
            <div><strong>TELEFONE:</strong> ${pedido.telefone}</div>
            <div><strong> Observação:</strong> ${pedido.observacao}</div>

            <div class="separator"></div>
              <div class="center bold">Vai pagar no dinheiro ou Debito? Faz no PIX! 💗</div>
              <div class="center bold">Comprovante: (41) 9154-3299</div>
              <div class="qrcode">
              ${qrcodeURL ?
                `<img id ="qrpix"src="${qrcodeURL}" alt="QR code pix">`
                : '<div><strong>QR code não configurado</strong></div>'}
            </div>
          <script>
            const qr = document.getElementById('qrpix');
            if(qr && !qr.complete) {
              qr.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              }; }else {
                window.print();
                window.onafterprint = () => window.close();
              }
          <\/script>
        </body>
        </html>`);
    janela.document.close();
  } catch (err) {
    console.error('Erro ao gerar etiqueta com QR CODE: ', err);
    alert('Erro ao carregar configurações do QR Code')
  }
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

carregarPedidos();

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

//escuta deleção de pedido
socket.on('notificacao_pedido_removido',(dados) =>{
  mostrarNotificacao(`Pedido #${dados.id} (${dados.nome}) foi apagado;`)
})