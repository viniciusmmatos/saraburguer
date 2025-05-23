# 🧾 SaraBurguer - Sistema de Gestão de Pedidos

Aplicativo web para gestão de pedidos de hamburgueria (desenvolvido para atuação no evento da igreja Sara Nossa Terra de Almirante Tamandaré), com impressão de etiquetas, painel de visualização e recursos em tempo real. Desenvolvido com Node.js, Express, WebSocket e TailwindCSS.

---

## 🚀 Funcionalidades

- 📥 **Importação de pedidos via Excel (.xlsx)**
- ➕ **Cadastro manual de novos pedidos**
- 🖨️ **Impressão individual ou em lote de etiquetas**
- 🔁 **Atualização em tempo real (WebSocket)**
- 📦 **Backup automático a cada 2 minutos**
- 💰 **Controle de pagamento (pago / não pago)**
- 💳 **Método de pagamento (PIX, débito, dinheiro)**
- 💵 **Campo de troco automático se pagamento em dinheiro**
- 🧾 **Etiqueta personalizada estilo cupom fiscal com QRCode PIX**
- 📊 **Tela separada (index2.html) com pedidos em preparo e prontos**
- 📄 **Emissão de relatorio automativo em PDF (Pdfmaker)**
- 📊 **Painel adminstrativo para CRUD dos pedidos**
- ⚙️ **Painel para configurações de QRCODE PIX + preço unitario**
- 🧮 **Calculo dinamico do preco total do pedido (relação quantidade x valor unitario)**
---

## 🧠 Tecnologias utilizadas

- **Node.js** + **Express.js**
- **Socket.io** para comunicação em tempo real
- **TailwindCSS** para estilização
- **Multer** + **xlsx** para upload e leitura de planilhas
- **HTML + JS puro** no front-end
- **Backup automático** via `xlsx.writeFile()`
- **Pdfmaker** para geração de relatorios
- **Arquitetura com Controllers**
- **Multer** (upload de arquivos)

---

## 📁 Estrutura do Projeto

```bash
├── controllers/
│ ├── pedidosController.js
│ ├── exportController.js
│ └── backupController.js
├── public/
│   ├── js/
│       └── main.js
│       └── funcoescomuns.js
│       └── admin.js
│   ├── styles
│       └── styles.css
│ ├── index.html
│ ├── index2.html
│ └── index-gestao.html
├── fonts/ (para PDF)
│ └── Roboto-*.ttf
├── upload/ (planilhas temporárias)
├── server.js
├── package.json
└── README.md
```

---

## 🔧 Como rodar o projeto

1. **Instale as dependências**:
```bash
npm install
```

2. **Inicie o servidor**:
```bash
node server.js
```

3. **Acesse pelo navegador**:
```
http://localhost:3000 – Tela principal de pedidos

http://localhost:3000/index2.html – Painel da cozinha
```

4. **Inicializador via arquivo .bat**
```
iniciar_servidor.bat
```
---

## 📤 Importação via Planilha

A planilha deve conter os seguintes campos:

| Campo             | Tipo     | Observação                         |
|-------------------|----------|------------------------------------|
| nome_cliente      | texto    | Nome do cliente                    |
| telefone          | texto    | Telefone do cliente                |
| endereco          | texto    | Endereço para entrega              |
| equipe_vendedor   | texto    | Ex: Igreja, Atalaia, Flame...      |
| vendedor          | texto    | Nome do vendedor                   |
| item_pedido       | texto    | Ex: Hamburguer                     |
| descricao         | texto    | Informações adicionais             |
| quantidade        | número   | Quantidade de itens                |
| hora_retirada     | hora     | Formato HH:MM                      |
| delivery          | texto    | sim / nao                          |
| metodo_pagamento  | texto    | dinheiro / debito / pix            |
| troco_para        | número   | Se pagamento for em dinheiro       |
| pago              | booleano | true / false                       |
| status            | texto    | em_preparo / pronto / entregue     |
| observacao        | texto    | informação para entrega            |
Campos ausentes serão preenchidos com valores padrão.

---

## 🛟 Backup

- Backup automático salvo a cada 2 minutos no arquivo `backup_automatico.xlsx` dentro da raiz.
- Pode ser exportado manualmente via botão "Exportar pedidos"

---

## 📌 Notificações

- Notificação visual aparece no topo a cada novo pedido criado manualmente
- Também exibe notificação para pedidos importados via Excel

---

✅ Atualizações Finais
- Projeto modularizado em controllers
- Novo layout de relatório em PDF
- Corrigido bug do horário de retirada na importação
- PDF e XLSX funcionam de forma independente
- Criação de um novo painel para CRUD dos pedidos e atualização dinamica.

## ✅ Licença

Projeto acadêmico para fins educativos e sem fins lucrativos.
Desenvolvido com ❤️ por [Vinícius Matos](https://github.com/viniciusmmatos)