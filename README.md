# Bússola — organização financeira pessoal

Site em **HTML, CSS e JavaScript puros** (sem build, sem dependências) para controlar receitas, despesas, cartões, contas fixas e orçamento feitos à mão. Os dados ficam no navegador (`localStorage`): sem servidor, sem anúncios, sem venda de dados.

## Rodar

```powershell
npm start        # http://localhost:5173  (servidor estático em scripts/serve.mjs)
npm test         # testes dos cálculos (node:test)
```

Também funciona abrindo `index.html` direto do disco (só o botão "Atualizar agora" depende de estar num site).

## O que tem

| Etapa do plano | Onde |
|---|---|
| 1. Modelo de dados + aba Financeiro (Início, Transações, Contas, Análise) | `js/store.js`, navegação lateral/inferior |
| 2. Lançamento rápido (botão **+** ou tecla **N**), busca, filtro por conta, exportar CSV, saldo do mês | Início / Transações |
| 3. Carteiras e cartões, parcelas (mesmo `grupo_parcela_id`), fatura estimada por ciclo, "só esta parcela / todas" | Contas › Carteiras |
| 4. Orçamento por categoria, alertas em 80% e 100%, barras de progresso | Início, Ajustes › Categorias |
| 5. Contas fixas com status derivado (paga / vencida / a vencer), "Pagar" cria o lançamento vinculado, lembrete de vencimento. **Receitas recorrentes** (ex.: salário): mesma mecânica, com opção de lançar sozinha no dia | Contas › Fixas e recorrentes |
| 6. Projeção de fechamento do mês | Início (medidor em forma de bússola) |
| 7. Análise: cards, comparativo com o mês anterior, ranking de risco, rosca por categoria | Análise |
| 8. Importação de CSV com mapeamento de colunas e hash anti-duplicata | Ajustes › Importar CSV |

Regras gerais: valores em **centavos** (inteiros), datas no fuso **America/Sao_Paulo**, excluir conta/categoria move os lançamentos para outra (nunca apaga), contas fixas são **derivadas** do cadastro (não duplicam ao recarregar).

### Projeção (como é calculada)
`gastos avulsos até hoje ÷ dias passados × dias do mês` + contas fixas já pagas + contas fixas ainda não pagas + lançamentos futuros do mês (parcelas). Os gastos de contas fixas ficam fora do ritmo para não serem multiplicados.

## Atualizações via GitHub

1. Crie um repositório **público** no GitHub e envie esta pasta (`git init -b main`, `git remote add origin …`, `git push -u origin main`).
2. Em *Settings › Pages* escolha **GitHub Actions** — o workflow `.github/workflows/pages.yml` roda os testes e publica o site a cada push na `main`.
3. No app: **Ajustes › Atualizações**, informe `usuario/repositorio` e clique em *Verificar agora*.

Para lançar uma versão nova:

```powershell
npm run bump -- 1.1.0 "Gráfico de evolução" "Correção na fatura"
git add -A; git commit -m "v1.1.0"; git tag v1.1.0; git push --follow-tags
```

(Opcional: crie uma *Release* `v1.1.0` no GitHub — o texto dela aparece como novidades no app.)

O app consulta a última Release (ou, sem Release, o `version.json` da branch padrão), compara com `js/version.js` e, havendo versão nova, mostra um ponto vermelho em *Ajustes*. **Atualizar agora** limpa o cache, baixa os arquivos novos do site e recarrega. Os dados do usuário não são tocados; quando o formato dos dados mudar, `MIGRATIONS` em `js/store.js` converte (com cópia de segurança antes).

## Estrutura

```
index.html · manifest.webmanifest · sw.js (offline, rede primeiro)
css/styles.css     tema claro/escuro, animações
js/core.js         cálculos puros (testados)
js/store.js        persistência, migrações, operações
js/updater.js      checagem/aplicação de atualização via GitHub
js/app.js          telas e formulários
tests/core.test.js
scripts/           serve.mjs, bump.mjs
```

## Login com Google e sincronização (Firebase)

O site tem dois espaços de dados que **nunca se misturam**:
- **Sem login:** mostra e grava só os dados deste computador (localStorage).
- **Logado com Google:** mostra e grava só os dados da conta (Firestore `usuarios/{uid}`, com cache local). Tudo que você lança fica vinculado ao login e aparece nos outros aparelhos em tempo real.
- **Ao sair:** o site volta a mostrar apenas os dados locais do computador e apaga daqui o cache da conta (a cópia na nuvem permanece).
- Numa conta nova, o app oferece **copiar** os dados locais para ela (os locais continuam no computador).

Requisitos no console Firebase: Authentication › Google ativado, domínio `fellipesouzass.github.io` autorizado e estas regras no Firestore:

```
match /usuarios/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
```

Código em `js/cloud.js` (testado em `tests/cloud.test.js` com um Firebase falso).
