# 🍔 SaraBurguer - Sistema de Gestão de Pedidos

Aplicativo web para gestão de pedidos de hamburgueria (desenvolvido para atuação no evento da igreja Sara Nossa Terra de Almirante Tamandaré), com impressão de etiquetas, painel de visualização e recursos em tempo real. Desenvolvido com Node.js, Express, WebSocket e TailwindCSS.

---

## 🚀 Funcionalidades

- Cadastro de pedidos via formulário
- Importação de pedidos por planilha `.xlsx`
- Impressão de etiquetas (individual, em lote, em preparo)
- Visualização de pedidos em painel de cozinha (index2)
- Atualização de status (em preparo, pronto, em trânsito, entregue)
- Marcar pagamento e método (dinheiro, pix, cartão)
- Troco automático na etiqueta se necessário
- Backup automático a cada 2 minutos
- Exportação de pedidos em Excel com total arrecadado

---

## 📁 Estrutura

```
📦 saraBurguer
┣ 📁 public
┃ ┣ 📄 index.html         # Tela de controle de pedidos
┃ ┣ 📄 index2.html        # Painel de visualização de pedidos
┣ 📄 server.js            # Servidor Express + WebSocket + lógica do backend
┣ 📄 README.md
```

---

## 📦 Instalação

### Pré-requisitos:
- Node.js instalado
- Editor como VS Code (opcional)

### Instalar dependências:

```bash
npm install express socket.io multer xlsx cors
```

---

## ▶️ Como rodar o sistema

```bash
node server.js
```

Depois acesse no navegador:

```
http://localhost:3000
```

---

## 💾 Backup automático

- Gera `backup_automatico.xlsx` a cada 2 minutos
- Gera backup também a cada novo pedido
- Exportação manual disponível no menu lateral

---

## 📥 Importação de pedidos via planilha

Sua planilha `.xlsx` deve conter as colunas:

```text
nome_cliente | telefone | endereco | equipe_vendedor | vendedor
item_pedido | descricao | quantidade | hora_retirada | delivery
```

Durante a importação, o sistema perguntará o preço unitário a ser aplicado a todos os pedidos.

---

## 🖨️ Etiqueta de pedido

Inclui os seguintes dados:
- Número do pedido
- Cliente, telefone e endereço
- Item e descrição
- Hora de retirada
- Equipe e vendedor
- Método de pagamento
- Troco a devolver (se for em dinheiro)

---

## 📊 Relatório de exportação

Ao exportar os pedidos via botão, é gerado um arquivo `.xlsx` contendo:

- Todos os pedidos registrados

---

## 💡 Tecnologias utilizadas

- Node.js
- Express.js
- Socket.io
- TailwindCSS
- XLSX
- HTML + JavaScript (Vanilla)

---

## 🔐 Licença

Projeto acadêmico para fins educativos e sem fins lucrativos.