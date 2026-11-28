'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');
const P = require('../js/pdf.js');
const I = require('../js/invoice.js');

const contas = [{ id: 'nu', nome: 'Nubank', tipo: 'credito', dia_fechamento: 8, dia_vencimento: 18 }, { id: 'px', nome: 'Pix', tipo: 'pix' }];
const cats = [{ id: 'a', nome: 'Alimentação' }, { id: 'm', nome: 'Moradia' }, { id: 'r', nome: 'Salário', kind: 'receita' }];
let n = 0;
const tx = (o) => ({ id: 't' + ++n, tipo: 'despesa', valor: 1000, data: '2026-11-10', categoria_id: 'a', conta_id: 'px', descricao: '', ...o });

test('modelo da fatura: gastos do mês na visão de caixa, fixas a pagar e totais', () => {
  const txs = C.annotateCash([
    tx({ descricao: 'Guanabara', conta_id: 'nu', data: '2026-11-13', valor: 5546 }),       // cartão: fecha 08/12, vence 18/12 → dezembro
    tx({ descricao: 'Padaria', conta_id: 'nu', data: '2026-11-05', valor: 1000 }),         // cartão: vence 18/11 → novembro (fora)
    tx({ descricao: 'Mercado', data: '2026-12-02', valor: 20000 }),                        // pix em dezembro
    tx({ tipo: 'receita', descricao: 'Salário', data: '2026-12-05', valor: 500000, categoria_id: 'r' }),
  ], contas);
  const fixas = [
    { id: 'f1', nome: 'Aluguel', valor: 150000, dia_vencimento: 10, categoria_id: 'm', ativa: true, inicio: '2026-01' },
    { id: 'f2', nome: 'Pago', valor: 999, dia_vencimento: 3, categoria_id: 'm', ativa: true, inicio: '2026-01' },
  ];
  txs.push(...C.annotateCash([tx({ descricao: 'Pago', data: '2026-12-03', valor: 999, categoria_id: 'm', conta_fixa_id: 'f2', competencia: '2026-12' })], contas));

  const m = C.invoiceModel(txs, fixas, contas, cats, '2026-12', '2026-11-28', {});
  assert.equal(m.numero, 'BUS-202612');
  assert.equal(m.vencimento, '2026-12-31');
  assert.deepEqual(m.linhas.map((l) => l.titulo), ['Mercado', 'Pago', 'Aluguel', 'Guanabara']); // por data: 02, 03, 10 (fixa), 18 (cartão)
  assert.equal(m.linhas[3].sub.includes('compra em 13/11'), true);
  assert.equal(m.totais.lancado, 20000 + 999 + 5546);
  assert.equal(m.totais.fixasAPagar, 150000);          // a fixa "Pago" já virou lançamento e não conta de novo
  assert.equal(m.totais.total, 20000 + 999 + 5546 + 150000);
  assert.equal(m.totais.receitas, 0);                  // receitas só com a opção ligada
  assert.equal(m.porCategoria[0].nome, 'Moradia');
  assert.equal(m.porCategoria.reduce((s, c) => s + c.valor, 0), m.totais.total);

  const semFixas = C.invoiceModel(txs, fixas, contas, cats, '2026-12', '2026-11-28', { incluirFixas: false });
  assert.equal(semFixas.totais.fixasAPagar, 0);
  const comRec = C.invoiceModel(txs, fixas, contas, cats, '2026-12', '2026-11-28', { incluirReceitas: true });
  assert.equal(comRec.totais.receitas, 500000);
  assert.equal(comRec.totais.saldo, 500000 - comRec.totais.total);
  assert.equal(C.invoiceModel(txs, fixas, contas, cats, '2025-09', '2026-11-28', {}).linhas.length, 0); // antes do início das fixas e sem lançamentos
});

test('PDF: codificação, medidas e quebra de linha', () => {
  assert.equal(P.toWin('Ação — R$ 1,50 · ×'), 'Ação \u0097 R$ 1,50 · ×');
  assert.equal(P.toWin('日本'), '??');
  assert.ok(P.textWidth('WWWW', 10, false) > P.textWidth('iiii', 10, false));
  assert.ok(P.textWidth('Total', 10, true) > P.textWidth('Total', 10, false));
  const linhas = P.wrap('Cinema e jantar com a família no shopping center da cidade', 40, 10, false);
  assert.ok(linhas.length >= 2);
  linhas.forEach((l) => assert.ok(P.textWidth(l, 10, false) <= 40 + 0.01));
  assert.deepEqual(P.wrap('', 40, 10, false), ['']);
});

function gerar(qtd, extra) {
  const txs = [];
  for (let i = 0; i < qtd; i++) txs.push(tx({ descricao: 'Compra número ' + i + ' com acentuação ção', valor: 1000 + i, data: '2026-12-' + String(1 + (i % 28)).padStart(2, '0'), categoria_id: i % 2 ? 'a' : 'm' }));
  const m = C.invoiceModel(C.annotateCash(txs, contas), [], contas, cats, '2026-12', '2026-11-28', extra);
  return { m, bytes: I.render(m, { by: { nome: 'Fellipe Souza', email: 'a@b.com' }, to: { nome: 'Cliente' }, nota: 'Obs com acentuação' }) };
}

test('PDF da fatura: arquivo válido, tabela quebra em páginas e xref confere', () => {
  const { bytes: um } = gerar(5);
  const { bytes: muitos } = gerar(80);
  for (const b of [um, muitos]) {
    const s = Buffer.from(b).toString('latin1');
    assert.ok(s.startsWith('%PDF-1.4'));
    assert.ok(s.trimEnd().endsWith('%%EOF'));
    // cada entrada do xref aponta exatamente para "N 0 obj"
    const xrefStart = Number(/startxref\n(\d+)/.exec(s)[1]);
    assert.ok(s.slice(xrefStart).startsWith('xref'));
    const entradas = [...s.slice(xrefStart).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    entradas.forEach((off, i) => assert.ok(s.slice(off).startsWith((i + 1) + ' 0 obj'), 'objeto ' + (i + 1)));
  }
  const paginas = (b) => (Buffer.from(b).toString('latin1').match(/\/Type \/Page /g) || []).length;
  assert.equal(paginas(um), 1);
  assert.ok(paginas(muitos) >= 3, 'muitas linhas devem gerar várias páginas');
  const s1 = Buffer.from(um).toString('latin1');
  assert.ok(s1.includes('(Fatura)') && s1.includes('(Emitido por)') && s1.includes('(Cobrado de)'));
  assert.ok(s1.includes('Resumo por categoria') && s1.includes('Total do mês'));
  assert.ok(s1.includes('acentuação'));            // acentos em WinAnsi
  assert.ok(s1.includes('Página 1 de 1'));
  assert.ok(Buffer.from(muitos).toString('latin1').includes('Página 2 de '));
});

test('PDF da fatura: mês sem gastos ainda gera o documento', () => {
  const { m, bytes } = gerar(0);
  assert.equal(m.linhas.length, 0);
  const s = Buffer.from(bytes).toString('latin1');
  assert.ok(s.includes('Nenhum gasto neste mês'));
});
