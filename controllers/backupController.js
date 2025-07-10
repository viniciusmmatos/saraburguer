const { utils, writeFile} = require('xlsx');
const fs = require ('fs');

function salvarBackup(pedidos){
    try {
        const ws = utils.json_to_sheet(pedidos);
        const wb = utils.book_new();
        utils.book_append_sheet(wb,ws,'Pedidos');
        writeFile(wb,'backup_automatico.xlsx');
        console.log('[✓] Backup automático realizado com sucesso');
    } catch (err) {
        console.error('[X] Erro ao salvar backup automático',err);
    }
}

module.exports ={
    salvarBackup
}