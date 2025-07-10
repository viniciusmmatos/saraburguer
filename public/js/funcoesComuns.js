// função para marcar como pago/desmarcar
async function marcarComoPago(id) {
  const resp = await fetch('/pedidos');
  const pedidos = await resp.json();
  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) return;

  await fetch(`/pedidos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pago: !pedido.pago })
  });
}

// função para deletar pedido
async function deletarPedido(id) {
  if (confirm('Tem certeza que deseja apagar o pedido?')) {
    await fetch(`/pedidos/${id}`, { method: 'DELETE' });
  }
}

// função para carregar pedidos
async function carregarPedidos(callbackRender) {
  const resp = await fetch('/pedidos');
  const pedidos = await resp.json();
  pedidosCache = pedidos;
  callbackRender(pedidos);
}

function mostrarCampoUpload() {
  document.getElementById('area-upload').classList.remove('hidden');
}

function alterarFormulario() {
  document.getElementById('bloco-formulario').classList.toggle('hidden');
}

async function alterarStatus(id, novoStatus) {
  await fetch(`/pedidos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: novoStatus })
  });
}