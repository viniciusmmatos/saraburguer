const socket = io();
const tabela = document.getElementById('tabela-admin');
const form = document.getElementById('form-novo-pedido');
let pedidosCache = [];

// Recebe os dados
socket.on('pedidos_atualizados', renderizarTabela);
carregarPedidos(renderizarTabela);

function renderizarTabela(pedidos) {
  tabela.innerHTML = '';
  pedidos.forEach(p => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td class="p-1">#${p.id}</td>
      <td class="p-1">${p.hora_retirada}</td>
      <td class="p-2">${p.nome_cliente}</td>
      <td class="p-2">${p.delivery}</td>
      <td class="p-2"><input value="${p.telefone}" class="border p-1 w-32" onchange="editarCampo(${p.id},'telefone',this.value)" /></td>
      <td class="p-2"><input value="${p.endereco}" class="border p-1 w-48" onchange="editarCampo(${p.id},'endereco',this.value)" /></td>
      <td class="p-2"><input value="${p.metodo_pagamento}" class="border p-1 w-28" onchange="editarCampo(${p.id},'metodo_pagamento',this.value)" /></td>
      <td class="p-1"><input type="number" value="${p.quantidade}" class="border p-1 w-12" onchange="editarCampo(${p.id},'quantidade',parseInt(this.value))" /></td>
      <td class="p-2">R$ ${p.preco.toFixed(2)}</td>
      <td class="p-2">${p.equipe_vendedor}</td>
      <td class="px-4 py-2">
            <select onchange="alterarStatus(${p.id}, this.value)" class="border rounded p-1 text-sm">
              <option value="em_preparo" ${p.status === 'em_preparo' ? 'selected' : ''}>Em Preparo</option>
              <option value="pronto" ${p.status === 'pronto' ? 'selected' : ''}>Pronto</option>
              <option value="em_transito" ${p.status === 'em_transito' ? 'selected' : ''}>Em Trânsito</option>
              <option value="entregue" ${p.status === 'entregue' ? 'selected' : ''}>Entregue</option>
              </select>
              </td>
      <td class="p-2">${p.pago ? 'Sim' : 'Não'}</td>
      <td class="p-2">
        <button onclick="marcarComoPago(${p.id})" class="bg-green-500 text-white px-2 py-1 rounded">💰</button>
        <button onclick="deletarPedido(${p.id})" class="bg-red-500 text-white px-2 py-1 rounded">🗑️</button>
      </td>
    `;
    tabela.appendChild(linha);
  });
}

async function editarCampo(id, campo, valor) {
  const payload = { [campo]: valor}
  if(campo === 'quantidade'){
    const novaQuantidade = parseInt(valor) || 1;
    const novoPreco = novaQuantidade * precoUnitario;
    payload.preco = novoPreco;

    const linha = [...tabela.children].find(row => row.innerText.includes(`${id}`));
    if(linha){
      const precoCell = linha.children[7];
      precoCell.textContent = novoPreco.toFixed(2);
    }
  }

  await fetch(`/pedidos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

//filtro
function aplicarFiltro() {

  const nomeFiltro = document.getElementById('filtro-nome').value.toLowerCase();
  const statusFiltro = document.getElementById('filtro-status').value;
  const deliveryFiltro = document.getElementById('filtro-delivery').value;
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

document.getElementById('filtro-nome')?.addEventListener('input', aplicarFiltro);
document.getElementById('filtro-status')?.addEventListener('change', aplicarFiltro);
document.getElementById('filtro-delivery')?.addEventListener('change', aplicarFiltro);
document.getElementById('filtro-horario')?.addEventListener('input', aplicarFiltro);

socket.on('pedidos_atualizados', (dados) => {
  pedidosCache = dados;
  aplicarFiltro();
})



function mostrarConfiguracoes() {
  document.getElementById('configuracoes').classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const formConfig = document.getElementById('form-configuracoes');
  const precoInput = document.getElementById('preco_unitario');
  const qrInput = document.getElementById('qrcode_pix');
  const msg = document.getElementById('msg-config');

  async function carregarConfiguracoes() {
    try {
      const resp = await fetch('./configuracoes');
      const dados = await resp.json();
      precoInput.value = dados.preco_unitario || '';
      qrInput.value = dados.qrcode_pix || '';
    } catch (err) {
      console.error('Erro ao carregar configurações', err);
    }
  }

  formConfig.addEventListener('submit', async (e) => {
    e.preventDefault();
    const preco = precoInput.value;
    const qrcode = qrInput.value;

    const resp = await fetch('/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preco_unitario: preco, qrcode_pix: qrcode })
    });

    if (resp.ok) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 3000);
    }

  });

  carregarConfiguracoes();
});

// Recebe os dados de XLSX e converte em JSON para subir na tabela
document.getElementById('form-importar').addEventListener('submit', async (e) => {
  e.preventDefault();

  await carregarConfiguracaoPreco();
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

const formNovoPedido = document.getElementById('form-novo-pedido');
if (formNovoPedido) {

  formNovoPedido.addEventListener('submit', async (e) => {
    e.preventDefault();
    await carregarConfiguracaoPreco();

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
}

let precoUnitario = 0;
async function carregarConfiguracaoPreco() {
  try{
    const resp = await fetch('/configuracoes');
    const config = await resp.json()
    precoUnitario = parseFloat(config.preco_unitario) || 0;
  } catch (err) {
    console.error('Erro ao carregar o preço unitario',err)
  }
  
}