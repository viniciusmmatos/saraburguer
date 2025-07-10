const fs = require('fs')
const path = require('path')

const caminhoConfig = path.join(__dirname, '../configuracoes.json');

let configuracoes = {
    preco_unitario: 0,
    qrcode_pix: ''
};

try {
    if (fs.existsSync(caminhoConfig)) {
        const dados = fs.readFileSync(caminhoConfig);
        configuracoes = JSON.parse(dados);
    }
} catch (err) {
    console.error('[X] erro ao carregar configurações:', err)
}

function obterConfiguracoes(req, res) {
    res.json(configuracoes)
}

function salvarConfiguracoes(req, res) {
    const { preco_unitario, qrcode_pix } = req.body

    configuracoes.preco_unitario = parseFloat(preco_unitario) || 0;
    configuracoes.qrcode_pix = qrcode_pix || '';

    try{
        fs.writeFileSync(caminhoConfig, JSON.stringify(configuracoes,null,2));
        console.log('[✓] Configurações salvas com sucesso!')
        res.json({sucesso: true});
    }catch(err){
        console.error('[X] Erro ao salvar configurações:',err);
        res.status(500).json({erro: 'Erro ao salvaor configurações'})
    }
}

module.exports ={
    obterConfiguracoes,
    salvarConfiguracoes
}