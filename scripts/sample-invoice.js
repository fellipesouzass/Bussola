// Gera um PDF de exemplo em um caminho (para conferir o layout): node scripts/sample-invoice.js saida.pdf [quantidade-de-linhas]
'use strict';
const fs = require('fs');
const C = require('../js/core.js');
const I = require('../js/invoice.js');

const out = process.argv[2] || 'fatura-exemplo.pdf';
const n = Number(process.argv[3] || 14);
const mk = '2026-12';
const hoje = '2026-11-28';
const contas = [{ id: 'nu', nome: 'Nubank', tipo: 'credito', dia_fechamento: 8, dia_vencimento: 18 }, { id: 'px', nome: 'Pix', tipo: 'pix' }];
const cats = [{ id: 'a', nome: 'Alimentação' }, { id: 'm', nome: 'Moradia' }, { id: 'l', nome: 'Lazer' }, { id: 's', nome: 'Assinatura' }];
const nomes = ['Supermercado Guanabara', 'Uber', 'McDonalds', 'Cinema e jantar com a família no shopping', 'Farmácia', 'Combustível', 'Padaria'];
const txs = [];
for (let i = 0; i < n; i++) {
  txs.push({ id: 't' + i, tipo: 'despesa', valor: 1500 + i * 937, data: '2026-11-' + String(10 + (i % 17)).padStart(2, '0'), categoria_id: cats[i % 4].id, conta_id: i % 3 ? 'nu' : 'px',
    descricao: nomes[i % nomes.length], parcela_atual: i % 5 === 0 ? 2 : null, total_parcelas: i % 5 === 0 ? 6 : null });
}
for (let i = 0; i < 3; i++) txs.push({ id: 'p' + i, tipo: 'despesa', valor: 20000, data: '2026-12-0' + (i + 2), categoria_id: 'a', conta_id: 'px', descricao: 'Compra à vista ' + i });
const fixas = [
  { id: 'f1', nome: 'Aluguel', valor: 150000, dia_vencimento: 10, categoria_id: 'm', ativa: true, inicio: '2026-01' },
  { id: 'f2', nome: 'Streaming', valor: 3990, dia_vencimento: 8, categoria_id: 's', ativa: true, inicio: '2026-01' },
];
const model = C.invoiceModel(C.annotateCash(txs, contas), fixas, contas, cats, mk, hoje, { incluirFixas: true, incluirReceitas: process.argv[4] === 'rec' });
const bytes = I.render(model, {
  by: { nome: 'Fellipe Souza', endereco: 'Rua Exemplo, 123 — Centro, São Paulo/SP — 01000-000', email: 'contato@exemplo.com', telefone: '+55 11 90000-0000' },
  to: { nome: 'Controle pessoal', endereco: 'Gastos do mês consolidados para conferência e envio.', email: '', telefone: '' },
  nota: 'Valores conferidos em ' + C.fmtDate(hoje) + '. Compras no cartão entram na fatura do mês de vencimento.',
});
fs.writeFileSync(out, Buffer.from(bytes));
console.log('PDF gerado:', out, bytes.length, 'bytes;', model.linhas.length, 'linhas');
