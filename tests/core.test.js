'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');

let n = 0;
const id = () => 'id' + ++n;
const tx = (o) => ({ id: id(), tipo: 'despesa', valor: 0, data: '2026-11-01', categoria_id: 'c1', conta_id: 'a1', descricao: '', ...o });

test('formata e interpreta dinheiro em centavos', () => {
  assert.equal(C.fmtBRL(123456), 'R$ 1.234,56');
  assert.equal(C.fmtBRL(-5), '-R$ 0,05');
  assert.equal(C.parseMoney('1.234,56'), 123456);
  assert.equal(C.parseMoney('R$ 12,5'), 1250);
  assert.equal(C.parseMoney('-50'), -5000);
  assert.equal(C.parseMoney('12.50'), 1250);
  assert.equal(C.parseMoney('1.234'), 123400);
  assert.equal(C.parseMoney('1,234.56'), 123456);
  assert.equal(C.parseMoney('0,10') + C.parseMoney('0,20'), 30); // sem erro de ponto flutuante
  assert.ok(Number.isNaN(C.parseMoney('abc')));
});

test('data de hoje usa o fuso America/Sao_Paulo', () => {
  // 02:30 UTC do dia 10 ainda é dia 9 em São Paulo (UTC-3)
  assert.equal(C.todayISO(new Date('2026-11-10T02:30:00Z')), '2026-11-09');
  assert.equal(C.todayISO(new Date('2026-11-10T12:00:00Z')), '2026-11-10');
});

test('addMonths preserva o dia quando possível e ajusta fim de mês', () => {
  assert.equal(C.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(C.addMonths('2026-01-31', 2), '2026-03-31');
  assert.equal(C.addMonths('2026-11-15', 3), '2027-02-15');
  assert.equal(C.addMonths('2026-01-15', -2), '2025-11-15');
});

test('parcelas: soma exata e meses certos (compra em 3x gera 3 lançamentos)', () => {
  assert.deepEqual(C.splitInstallments(10000, 3), [3334, 3333, 3333]);
  assert.equal(C.splitInstallments(10000, 3).reduce((a, b) => a + b, 0), 10000);
  const ps = C.buildInstallments({ tipo: 'despesa', data: '2026-01-31', categoria_id: 'c1', conta_id: 'a1', descricao: 'TV' }, 30000, 3, id);
  assert.equal(ps.length, 3);
  assert.deepEqual(ps.map((p) => p.data), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.deepEqual(ps.map((p) => p.parcela_atual), [1, 2, 3]);
  assert.equal(new Set(ps.map((p) => p.grupo_parcela_id)).size, 1);
  assert.ok(ps[0].grupo_parcela_id);
  const a = C.buildInstallments({ tipo: 'despesa', data: '2026-01-10', categoria_id: 'c', conta_id: 'a' }, 500, 1, id);
  assert.equal(a[0].grupo_parcela_id, null);
});

test('parcelas com valores informados à mão (compra com juros)', () => {
  const base = { tipo: 'despesa', data: '2026-11-18', categoria_id: 'c', conta_id: 'a', descricao: 'Sofá' };
  const ps = C.buildInstallments(base, 0, 3, id, [35000, 36000, 36000]);
  assert.deepEqual(ps.map((p) => p.valor), [35000, 36000, 36000]);
  assert.equal(ps.reduce((s, p) => s + p.valor, 0), 107000);
  assert.deepEqual(ps.map((p) => p.data), ['2026-11-18', '2026-12-18', '2027-01-18']);
  assert.equal(new Set(ps.map((p) => p.grupo_parcela_id)).size, 1);
  // lista inválida (tamanho errado ou valor zero) cai no rateio igual do total
  assert.deepEqual(C.buildInstallments(base, 9000, 3, id, [1, 2]).map((p) => p.valor), [3000, 3000, 3000]);
  assert.deepEqual(C.buildInstallments(base, 9000, 3, id, [0, 4500, 4500]).map((p) => p.valor), [3000, 3000, 3000]);
});

test('ciclo da fatura (fechamento dia 10, vencimento dia 17)', () => {
  const conta = { id: 'cc', tipo: 'credito', dia_fechamento: 10, dia_vencimento: 17 };
  assert.deepEqual(C.invoiceCycle(conta, '2026-11-05'), { start: '2026-10-11', end: '2026-11-10', due: '2026-11-17' });
  assert.deepEqual(C.invoiceCycle(conta, '2026-11-10'), { start: '2026-10-11', end: '2026-11-10', due: '2026-11-17' });
  assert.deepEqual(C.invoiceCycle(conta, '2026-11-11'), { start: '2026-11-11', end: '2026-12-10', due: '2026-12-17' });
  // vencimento antes do fechamento cai no mês seguinte
  const c2 = { id: 'c2', tipo: 'credito', dia_fechamento: 25, dia_vencimento: 5 };
  assert.deepEqual(C.invoiceCycle(c2, '2026-11-20'), { start: '2026-10-26', end: '2026-11-25', due: '2026-12-05' });
});

test('fatura estimada soma só o ciclo correto', () => {
  const conta = { id: 'cc', tipo: 'credito', dia_fechamento: 10, dia_vencimento: 17 };
  const txs = [
    tx({ conta_id: 'cc', data: '2026-10-10', valor: 1000 }), // ciclo anterior
    tx({ conta_id: 'cc', data: '2026-10-11', valor: 2000 }), // início do ciclo
    tx({ conta_id: 'cc', data: '2026-11-10', valor: 3000 }), // último dia do ciclo
    tx({ conta_id: 'cc', data: '2026-11-11', valor: 4000 }), // próximo ciclo
    tx({ conta_id: 'cc', data: '2026-11-05', valor: 500, tipo: 'receita' }), // estorno
    tx({ conta_id: 'outra', data: '2026-11-05', valor: 9999 }),
  ];
  assert.equal(C.invoiceTotal(conta, txs, '2026-11-05').total, 2000 + 3000 - 500);
  assert.equal(C.invoiceTotal(conta, txs, '2026-11-15').total, 4000);
  assert.equal(C.creditCommitted(conta, txs, '2026-11-05'), 2000 + 3000 + 4000 - 500);
});

test('fatura vencida some do cartão (cartão vence dia 20, compra de R$ 20)', () => {
  const conta = { id: 'cc', tipo: 'credito', dia_fechamento: 10, dia_vencimento: 20 };
  const compra = tx({ conta_id: 'cc', data: '2026-11-05', valor: 2000 });
  const pend = (hoje) => C.invoiceList(conta, [compra], hoje);
  assert.equal(pend('2026-11-08')[0].status, 'aberta');
  assert.equal(pend('2026-11-12')[0].status, 'fechada'); // fechou dia 10, vence dia 20
  assert.equal(pend('2026-11-12')[0].total, 2000);
  assert.equal(pend('2026-11-20').length, 1); // no dia do vencimento ainda está pendente
  assert.equal(C.creditCommitted(conta, [compra], '2026-11-20'), 2000);
  assert.equal(pend('2026-11-21').length, 0); // passou do vencimento: sumiu
  assert.equal(C.creditCommitted(conta, [compra], '2026-11-21'), 0);
  assert.equal(C.isPaidCharge(compra, conta, '2026-11-21'), true);
  assert.equal(C.isPaidCharge(compra, conta, '2026-11-20'), false);
  assert.equal(C.isPaidCharge(compra, { tipo: 'pix' }, '2026-11-21'), false);
  // a compra continua no histórico do mês
  assert.equal(C.summary([compra], '2026-11').despesas, 2000);
});

test('fatura marcada como paga antes do vencimento sai da lista; faturas futuras seguem', () => {
  const conta = { id: 'cc', tipo: 'credito', dia_fechamento: 10, dia_vencimento: 20, faturas_pagas: ['2026-11-10'] };
  const txs = [tx({ conta_id: 'cc', data: '2026-11-05', valor: 2000 }), tx({ conta_id: 'cc', data: '2026-11-15', valor: 700 })];
  const l = C.invoiceList(conta, txs, '2026-11-12');
  assert.deepEqual(l.map((i) => [i.end, i.total]), [['2026-12-10', 700]]);
});

test('saldo e gasto por categoria do mês conferem com os lançamentos', () => {
  const txs = [
    tx({ tipo: 'receita', valor: 500000, data: '2026-11-05' }),
    tx({ valor: 12000, categoria_id: 'a', data: '2026-11-06' }),
    tx({ valor: 8000, categoria_id: 'a', data: '2026-11-07' }),
    tx({ valor: 3000, categoria_id: 'b', data: '2026-11-08' }),
    tx({ valor: 99999, categoria_id: 'b', data: '2026-10-08' }),
  ];
  assert.deepEqual(C.summary(txs, '2026-11'), { receitas: 500000, despesas: 23000, saldo: 477000 });
  assert.deepEqual(C.spentByCategory(txs, '2026-11'), { a: 20000, b: 3000 });
});

test('alertas de orçamento em 80% e 100%', () => {
  assert.equal(C.budgetLevel(0, 0), 'none');
  assert.equal(C.budgetLevel(7999, 10000), 'ok');
  assert.equal(C.budgetLevel(8000, 10000), 'warn');
  assert.equal(C.budgetLevel(9999, 10000), 'warn');
  assert.equal(C.budgetLevel(10000, 10000), 'over');
  assert.equal(C.budgetLevel(15000, 10000), 'over');
  assert.equal(C.budgetPercent(8000, 10000), 80);
  assert.equal(C.budgetPercent(1, 0), null);
  const cats = [{ id: 'a', nome: 'A', orcamento_mensal: 10000 }, { id: 's', nome: 'Sal', kind: 'receita', orcamento_mensal: 0 }];
  const rows = C.budgetRows(cats, [tx({ categoria_id: 'a', valor: 8500 })], '2026-11');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pct, 85);
  assert.equal(rows[0].level, 'warn');
  assert.equal(C.budgetTotal(cats), 10000);
});

test('contas fixas: status derivado e sem duplicar ocorrências', () => {
  const cf = { id: 'f1', nome: 'Internet', valor: 11990, dia_vencimento: 15, categoria_id: 'c1', ativa: true, inicio: '2026-01' };
  assert.equal(C.fixedStatus(cf, '2026-11', [], '2026-11-10').status, 'a_vencer');
  assert.equal(C.fixedStatus(cf, '2026-11', [], '2026-11-15').status, 'a_vencer'); // no dia ainda não venceu
  assert.equal(C.fixedStatus(cf, '2026-11', [], '2026-11-16').status, 'vencida');
  const paga = tx({ conta_fixa_id: 'f1', valor: 11990, data: '2026-11-12', competencia: '2026-11' });
  const st = C.fixedStatus(cf, '2026-11', [paga], '2026-11-30');
  assert.equal(st.status, 'paga');
  assert.equal(st.tx.id, paga.id);
  // pagamento adiantado (data em outro mês) respeita a competência
  const adiantada = tx({ conta_fixa_id: 'f1', data: '2026-10-28', competencia: '2026-11' });
  assert.equal(C.fixedStatus(cf, '2026-11', [adiantada], '2026-11-02').status, 'paga');
  assert.equal(C.fixedStatus(cf, '2026-10', [adiantada], '2026-11-02').status, 'vencida');
  // dia 31 em mês curto
  assert.equal(C.fixedDueDate({ dia_vencimento: 31 }, '2026-02'), '2026-02-28');
  // ocorrências: uma por conta fixa por mês, sempre as mesmas ao reabrir
  const lista = [cf, { ...cf, id: 'f2', ativa: false }, { ...cf, id: 'f3', inicio: '2026-12' }];
  const a = C.fixedOccurrences(lista, '2026-11', [], '2026-11-10');
  const b = C.fixedOccurrences(lista, '2026-11', [], '2026-11-10');
  assert.equal(a.length, 1);
  assert.deepEqual(a.map((o) => o.cf.id), b.map((o) => o.cf.id));
});

test('receita recorrente (salário): status, a receber e lançamento automático sem duplicar', () => {
  const sal = { id: 's1', tipo: 'receita', auto: true, nome: 'Salário', valor: 500000, dia_vencimento: 5, categoria_id: 'r', ativa: true, inicio: '2026-01' };
  const aluguel = { id: 'f1', nome: 'Aluguel', valor: 100000, dia_vencimento: 20, categoria_id: 'c1', ativa: true, inicio: '2026-01' };
  assert.equal(C.isIncome(sal), true);
  assert.equal(C.isIncome(aluguel), false);
  // antes do dia: a receber, ainda não é para lançar
  assert.equal(C.pendingIncome([sal, aluguel], '2026-11', [], '2026-11-03'), 500000);
  assert.equal(C.dueRecurring([sal, aluguel], [], '2026-11-03').length, 0);
  // no dia 5: é para lançar (e só a receita, nunca a despesa fixa)
  assert.deepEqual(C.dueRecurring([sal, aluguel], [], '2026-11-05').map((o) => o.cf.id), ['s1']);
  // recebida (lançamento vinculado): sai de "a receber" e de "devidas"
  const recebido = tx({ tipo: 'receita', conta_fixa_id: 's1', competencia: '2026-11', valor: 500000, data: '2026-11-05' });
  assert.equal(C.pendingIncome([sal], '2026-11', [recebido], '2026-11-10'), 0);
  assert.equal(C.dueRecurring([sal], [recebido], '2026-11-10').length, 0);
  // mês pulado (usuário desfez o recebimento): não relança
  assert.equal(C.dueRecurring([{ ...sal, puladas: ['2026-11'] }], [], '2026-11-10').length, 0);
  assert.equal(C.dueRecurring([{ ...sal, puladas: ['2026-10'] }], [], '2026-11-10').length, 1);
  // sem a opção automática, não lança sozinha
  assert.equal(C.dueRecurring([{ ...sal, auto: false }], [], '2026-11-10').length, 0);
  // só vale a partir do mês de início e enquanto ativa
  assert.equal(C.dueRecurring([{ ...sal, inicio: '2026-12' }], [], '2026-11-10').length, 0);
  assert.equal(C.dueRecurring([{ ...sal, ativa: false }], [], '2026-11-10').length, 0);
  // a projeção de gastos não soma a receita recorrente como despesa pendente
  const p = C.projection([], [sal, aluguel], '2026-11', '2026-11-03', 0);
  assert.equal(p.fixasPendentes, 100000);
});

test('projeção inclui contas fixas pendentes e parcelas futuras', () => {
  const fixa = { id: 'f1', nome: 'Aluguel', valor: 100000, dia_vencimento: 20, ativa: true, inicio: '2026-01' };
  const hoje = '2026-11-10';
  const txs = [
    tx({ valor: 50000, data: '2026-11-03' }), // avulso
    tx({ valor: 50000, data: '2026-11-08' }), // avulso
    tx({ valor: 20000, data: '2026-11-20', parcela_atual: 2, total_parcelas: 3 }), // parcela futura do mês
  ];
  const p = C.projection(txs, [fixa], '2026-11', hoje, 400000);
  assert.equal(p.dayN, 10);
  assert.equal(p.dim, 30);
  assert.equal(p.atual, 100000);
  assert.equal(p.ritmo, 300000); // 100000 / 10 * 30
  assert.equal(p.fixasPendentes, 100000);
  assert.equal(p.futuros, 20000);
  assert.equal(p.projecao, 300000 + 100000 + 20000);
  assert.equal(p.diferenca, 400000 - 420000);
  assert.equal(p.level, 'over');

  // lançar um novo gasto muda a projeção
  const p2 = C.projection([...txs, tx({ valor: 30000, data: '2026-11-10' })], [fixa], '2026-11', hoje, 400000);
  assert.equal(p2.projecao, p.projecao + 90000);

  // pagar a fixa move o valor de "pendente" para "paga" sem multiplicá-la pelo ritmo
  const paga = tx({ valor: 100000, data: '2026-11-09', conta_fixa_id: 'f1', competencia: '2026-11' });
  const p3 = C.projection([...txs, paga], [fixa], '2026-11', hoje, 400000);
  assert.equal(p3.fixasPendentes, 0);
  assert.equal(p3.fixasPagas, 100000);
  assert.equal(p3.projecao, p.projecao);

  // mês passado: projeção = realizado; mês futuro: só fixas e parcelas
  assert.equal(C.projection([tx({ valor: 700, data: '2026-10-05' })], [], '2026-10', hoje, 0).projecao, 700);
  assert.equal(C.projection([], [fixa], '2026-12', hoje, 0).projecao, 100000);
});

test('comparativo mês a mês e ranking de risco', () => {
  const cats = [{ id: 'a', nome: 'Alimentação', orcamento_mensal: 100000 }, { id: 'b', nome: 'Lazer', orcamento_mensal: 20000 }];
  const txs = [
    tx({ categoria_id: 'a', valor: 60000, data: '2026-11-02' }), tx({ categoria_id: 'a', valor: 40000, data: '2026-10-02' }),
    tx({ categoria_id: 'b', valor: 19000, data: '2026-11-02' }), tx({ categoria_id: 'b', valor: 19000, data: '2026-10-02' }),
  ];
  const cmp = C.compareMonths(txs, cats, '2026-11');
  assert.equal(cmp.prev, '2026-10');
  assert.equal(cmp.total.atual, 79000);
  assert.equal(cmp.total.anterior, 59000);
  assert.equal(cmp.total.delta, 20000);
  assert.equal(cmp.rows[0].pct, 50);
  assert.equal(C.compareMonths(txs, cats, '2026-01').rows.length, 0);
  assert.deepEqual(C.riskRanking(cats, txs, '2026-11').map((r) => r.cat.id), ['b', 'a']); // 95% antes de 60%
});

test('CSV: leitura com ; , aspas e BOM', () => {
  const r = C.parseCSV('﻿Data;Descrição;Valor\r\n01/11/2026;"Padaria; do Zé";-12,50\r\n02/11/2026;"Ele disse ""oi""";100,00\r\n');
  assert.equal(r.delimiter, ';');
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows[1][1], 'Padaria; do Zé');
  assert.equal(r.rows[2][1], 'Ele disse "oi"');
  assert.equal(C.parseCSV('a,b\n1,2').delimiter, ',');
  assert.deepEqual(C.detectMapping(['Data', 'Descrição', 'Valor', 'Categoria']), { data: 0, valor: 2, descricao: 1, conta: -1, categoria: 3, tipo: -1 });
  assert.equal(C.parseDate('05/11/2026'), '2026-11-05');
  assert.equal(C.parseDate('2026-11-05'), '2026-11-05');
  assert.equal(C.parseDate('31/02/2026'), null);
});

test('importar o mesmo arquivo duas vezes não cria duplicatas', () => {
  const contas = [{ id: 'a1', nome: 'Pix' }];
  const cats = [{ id: 'c1', nome: 'Alimentação', kind: 'despesa' }, { id: 'c9', nome: 'Salário', kind: 'receita' }];
  const csv = 'Data;Descrição;Valor\n01/11/2026;Café;-5,00\n01/11/2026;Café;-5,00\n02/11/2026;Salário;3000,00\nxx;lixo;1,00\n';
  const { rows } = C.parseCSV(csv);
  const mapping = C.detectMapping(rows[0]);
  const opts = { contas, cats, contaId: 'a1', catDespesaId: 'c1', catReceitaId: 'c9', existing: new Set() };

  const r1 = C.buildImport(rows.slice(1), mapping, opts);
  assert.equal(r1.novas, 3); // os dois cafés idênticos são lançamentos distintos
  assert.equal(r1.invalidas, 1);
  assert.equal(r1.duplicadas, 0);
  assert.equal(r1.items[0].tipo, 'despesa');
  assert.equal(r1.items[2].tipo, 'receita');

  const existing = new Set(r1.items.filter((i) => i.status === 'nova').map((i) => i.hash_importacao));
  assert.equal(existing.size, 3);
  const r2 = C.buildImport(rows.slice(1), mapping, { ...opts, existing });
  assert.equal(r2.novas, 0);
  assert.equal(r2.duplicadas, 3);

  // sinal invertido (fatura de cartão: compras positivas)
  const inv = C.buildImport([['01/11/2026', 'Loja', '10,00']], { data: 0, descricao: 1, valor: 2, conta: -1, categoria: -1, tipo: -1 }, { ...opts, invert: true });
  assert.equal(inv.items[0].tipo, 'despesa');
});

test('exportação CSV escapa campos e neutraliza fórmulas', () => {
  const out = C.toCSV(
    [tx({ id: 'x', valor: 123456, descricao: '=HIPERLINK("x")', categoria_id: 'c1', conta_id: 'a1', data: '2026-11-05', parcela_atual: 2, total_parcelas: 3 })],
    [{ id: 'a1', nome: 'Pix' }], [{ id: 'c1', nome: 'Lazer' }]);
  const [head, linha] = out.split('\r\n');
  assert.equal(head, 'Data;Tipo;Descrição;Categoria;Conta;Valor;Parcela');
  assert.equal(linha, `05/11/2026;Despesa;"'=HIPERLINK(""x"")";Lazer;Pix;1234,56;2/3`);
});

test('comparação de versões', () => {
  assert.equal(C.compareVersions('v1.2.0', '1.1.9'), 1);
  assert.equal(C.compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(C.compareVersions('1.0.0', 'v1.10.0'), -1);
});
