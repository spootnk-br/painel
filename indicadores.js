/* Ranking (score + selos), Detalhe do robô e Carteira - indicadores do especialista (19/11/2026). */
(function () {
  const P = window.P, F = G.F, R = P.R, $ = P.$;
  const SLOTS = P.SLOTS;
  let cache = { ctx: null, rows: null };
  function linhas() {
    const C = P.CTX; if (cache.ctx === C) return cache.rows;
    const by = {}; for (const o of C.opsF) (by[o.r] = by[o.r] || []).push(o);
    const rows = M.pontuar(C.robos.map(r => M.linha(r, C.dias, by[r] || [])));
    cache = { ctx: C, rows }; return rows;
  }
  const inf = v => v === Infinity ? '∞' : null;
  const fx = (fn) => (v) => inf(v) || fn(v);

  /* ---------- catálogo de colunas ---------- */
  const COL = {
    score: { t: 'Score', title: 'Score 0–100: retorno 25, significância (t-dia) 20, robustez (pior metade) 15, risco (lucro/queda) 15, recência 10, concentração 10, execução (R$/contrato) 5; percentis entre os robôs do filtro, com penalidades.', v: x => x.score, html: x => !isFinite(x.score) ? '' : `<span class="score" title="${F.esc(Object.entries(x.comp).map(([k, v]) => k + ' ' + v.toFixed(1)).join(' · ') + (x.pen.length ? ' | Penalidades: ' + x.pen.join('; ') : ''))}">${Math.round(x.score)}</span><span class="barra-score"><span style="width:${x.score}%"></span></span>` },
    fam: { t: 'Família', l: 1, title: 'família do robô', v: x => x.fam || '' },
    assert: { t: 'Assertividade', title: '% de operações vencedoras (antes do custo, como no Profit)', v: x => x.o.gAcerto, f: v => F.pct(v, 1) },
    pontos: { t: 'Pontos', title: 'resultado em pontos antes do custo = R$ bruto / valor do ponto (WIN R$ 0,20; WDO R$ 10), somando os contratos', v: x => x.o.n ? x.o.pontos : NaN, f: F.n0, cor: 1 },
    ptsOp: { t: 'Pts/op', title: 'pontos por operação, por contrato (antes do custo)', v: x => x.o.ptsOp, f: F.n1, cor: 1 },
    sbruto: { t: 'Financeiro bruto', title: 'resultado das operações antes dos custos', v: x => x.o.n ? x.o.saldoBruto : NaN, f: v => F.brl(v), cor: 1 },
    n: { t: 'Pregões', title: 'pregões com registro no período filtrado', v: x => x.n, f: F.n0 },
    porDia: { t: 'R$/dia', title: 'Σ resultado do dia / pregões. Alvo: ≥ 100', v: x => x.porDia, f: v => F.brl(v), cor: 1 },
    tot: { t: 'Total (dias)', title: 'soma dos resultados diários', v: x => x.tot, f: v => F.brl(v), cor: 1 },
    liq: { t: 'Saldo líquido', title: 'Σ líquido das operações (resultado − custo), como no relatório do Profit', v: x => x.o.liq, f: v => F.brl(v), cor: 1 },
    pctPos: { t: '% dias +', title: 'pregões positivos / pregões. > 55% bom (grade passa de 70%: ver o pior dia junto)', v: x => x.d.pctPos, f: v => F.pct(v) },
    gPF: { t: 'F. lucro Profit', title: 'lucro bruto / |prejuízo bruto| antes do custo (o número da tela do Profit)', v: x => x.o.gPF, f: fx(F.n2) },
    pf: { t: 'F. lucro', title: 'líquido: Σ ops vencedoras / |Σ perdedoras| após custo. < 1,1 ruim; 1,1–1,3 marginal; > 1,3 bom; > 2,5 com < 30 ops = suspeito', v: x => x.o.pf, f: fx(F.n2) },
    tdia: { t: 't-dia', title: 'Sharpe diário × √n. < 1 ruído; 1–2 promissor; ≥ 2 estatisticamente positivo', v: x => x.d.tdia, f: F.n2 },
    dd: { t: 'Queda máx', title: 'maior queda do acumulado diário a partir do pico (R$)', v: x => x.d.dd, f: v => F.brl(-v), cls: v => v > 0 ? 'neg' : '' },
    recup: { t: 'Recuperação', title: 'total / queda máxima. < 1 ruim; 1–3 médio; > 3 bom', v: x => x.d.recup, f: fx(F.n2) },
    h1: { t: '1ª metade', title: 'R$/dia na primeira metade dos pregões do robô', v: x => x.d.h1, f: v => F.brl(v), cor: 1 },
    h2: { t: '2ª metade', title: 'R$/dia na segunda metade. As duas > 0 = robusto', v: x => x.d.h2, f: v => F.brl(v), cor: 1 },
    u10: { t: 'Últ. 10', title: 'R$/dia nos 10 últimos pregões do robô', v: x => x.d.u10, f: v => F.brl(v), cor: 1 },
    semMelhor: { t: 'Sem melhor dia', title: 'total − melhor dia. ≤ 0 = resultado de um dia de sorte', v: x => x.d.semMelhor, f: v => F.brl(v), cor: 1 },
    devPct: { t: 'Devolução %', title: 'Σ(máximo do dia − final) / Σ máximo (dias com máximo > 0). > 60% devolve muito', v: x => x.d.devPct, f: v => F.pct(v) },
    saldoTick: { t: 'Saldo +1 tick', title: 'saldo líquido − 2 ticks por contrato (1 na entrada, 1 na saída). < 0 = só ganha com execução ideal', v: x => x.o.n ? x.o.saldoTick : NaN, f: v => F.brl(v), cor: 1 },
    spark: { t: 'Curva', title: 'acumulado diário no período', v: x => x.tot, html: x => G.spark(x.d.v) },
    // relatório do Profit
    nops: { t: 'Ops', title: 'número de operações (ciclo zerado → zerado)', v: x => x.o.n, f: F.n0 },
    acerto: { t: '% venc.', title: 'operações vencedoras / total', v: x => x.o.acerto, f: v => F.pct(v, 1) },
    bruto: { t: 'Lucro bruto', title: 'Σ das operações vencedoras, antes do custo (como no Profit)', v: x => x.o.gB, f: v => F.brl(v) },
    prej: { t: 'Prejuízo bruto', title: 'Σ das operações perdedoras, antes do custo (como no Profit)', v: x => -x.o.gP, f: v => F.brl(v), cor: 1 },
    custo: { t: 'Custos', title: 'Σ custo (R$ 0,25 por contrato executado)', v: x => x.o.custo, f: v => F.brl(-v, 2) },
    exp: { t: 'Média/op', title: 'expectativa = Σ líquido / nº operações. 1 ctt WIN: ≥ R$10 confortável', v: x => x.o.exp, f: v => F.brl(v, 2), cor: 1 },
    mG: { t: 'Média venc.', title: 'média das vencedoras, antes do custo (como no Profit)', v: x => x.o.gMG, f: v => F.brl(v, 2) },
    mL: { t: 'Média perd.', title: 'média das perdedoras, antes do custo (como no Profit)', v: x => x.o.gML, f: v => F.brl(v, 2), cor: 1 },
    payoff: { t: 'Payoff', title: 'média vencedoras / |média perdedoras|, líquido (no Profit: razão média lucro:média prejuízo, antes do custo)', v: x => x.o.payoff, f: F.n2 },
    maxG: { t: 'Maior venc.', title: 'maior operação vencedora (antes do custo)', v: x => x.o.gMaxG, f: v => F.brl(v) },
    maxL: { t: 'Maior perd.', title: 'maior operação perdedora (antes do custo). > 3× a média das perdedoras = cauda', v: x => x.o.gMaxL, f: v => F.brl(v), cor: 1 },
    seqG: { t: 'Seq. venc.', title: 'maior sequência de operações vencedoras', v: x => x.o.seqG, f: F.n0 },
    seqL: { t: 'Seq. perd.', title: 'maior sequência de operações perdedoras', v: x => x.o.seqL, f: F.n0 },
    durG: { t: 'Tempo venc.', title: 'tempo médio nas vencedoras', v: x => x.o.durG, f: F.min },
    durL: { t: 'Tempo perd.', title: 'tempo médio nas perdedoras (maior que nas vencedoras = sinal ruim)', v: x => x.o.durL, f: F.min },
    maxCt: { t: 'Máx ctt', title: 'máximo de contratos numa operação (> 5 não cabe na conta real)', v: x => x.o.maxCt, f: F.n0 },
    patrimNec: { t: 'Patrim. nec.', title: '|maior operação perdedora| = declínio trade a trade do Profit', v: x => x.o.gDDTT, f: v => F.brl(v) },
    patrimMax: { t: 'Patrim. máx', title: 'maior valor do acumulado das operações', v: x => x.o.patrimMax, f: v => F.brl(v) },
    ddTrade: { t: 'Declínio topo-fundo', title: 'declínio máximo topo ao fundo do acumulado das operações, antes do custo (como no Profit)', v: x => x.o.gDDTF, f: v => F.brl(-v), cls: v => v > 0 ? 'neg' : '' },
    // risco
    ddDias: { t: 'Queda em dias', title: 'queda máx / R$/dia = quantos dias de ganho a queda come. < 6 bom; 6–12 aceitável; > 12 ruim', v: x => x.d.ddDias, f: F.n1 },
    ulcer: { t: 'Ulcer', title: '√(Σ queda² / n): profundidade e duração das quedas. Ulcer / (R$/dia) < 3 bom', v: x => x.d.ulcer, f: v => F.brl(v) },
    submersoMax: { t: 'Submerso máx', title: 'maior sequência de pregões abaixo do pico (> 15 é longo)', v: x => x.d.submersoMax, f: F.n0 },
    submersoAtual: { t: 'Submerso hoje', title: 'pregões desde o último pico', v: x => x.d.submersoAtual, f: F.n0 },
    piorIntra: { t: 'Pior intradiário', title: 'menor mínimo de um dia (perda em aberto)', v: x => x.d.piorIntra, f: v => F.brl(v), cor: 1 },
    worst: { t: 'Pior dia', title: 'pior resultado diário. > 5× o R$/dia é alerta', v: x => x.d.worst, f: v => F.brl(v), cor: 1 },
    best: { t: 'Melhor dia', title: 'melhor resultado diário', v: x => x.d.best, f: v => F.brl(v) },
    seqNeg: { t: 'Seq. dias −', title: 'maior sequência de pregões negativos', v: x => x.d.seqNeg, f: F.n0 },
    sharpe: { t: 'Sharpe dia', title: 'média / desvio dos resultados diários (sem anualizar). 0,10 aceitável; 0,20 bom; > 0,40 desconfiar. Erro ≈ 1/√n', v: x => x.d.sharpe, f: F.n2 },
    sortino: { t: 'Sortino dia', title: 'média / √(Σ min(r,0)² / n). > 0,3 bom', v: x => x.d.sortino, f: F.n2 },
    ruina: { t: 'Risco ruína', title: 'exp(−2μC/σ²), C = 3 × perda diária. < 1% ok; > 5% alto', v: x => x.d.ruina, f: v => F.pct(v, 1) },
    perda20: { t: 'Perda 20d 95%', title: '20μ − 1,645σ√20. < 0 = chance real de um mês negativo', v: x => x.d.perda20, f: v => F.brl(v), cor: 1 },
    // operações
    opsDia: { t: 'Ops/dia', title: 'operações por pregão operado', v: x => x.o.opsDia, f: F.n1 },
    acertoMin: { t: 'Acerto mín.', title: '1 / (1 + payoff): acerto necessário para empatar', v: x => x.o.acertoMin, f: v => F.pct(v, 1) },
    margem: { t: 'Margem acerto', title: '% vencedoras − acerto mínimo (pontos percentuais). > 5 bom; < 0 perde', v: x => x.o.margem, f: v => F.n1(v) + ' p.p.', cor: 1 },
    sqn: { t: 'SQN', title: '√min(N,100) × média / desvio por operação. < 1,6 ruim; 2–3 bom; 3–5 ótimo; > 5 desconfiar', v: x => x.o.sqn, f: F.n2 },
    rsCtt: { t: 'R$/contrato', title: 'Σ líquido / Σ contratos. ≥ R$3 bom no WIN; < R$1 frágil', v: x => x.o.rsCtt, f: v => F.brl(v, 2), cor: 1 },
    custoPct: { t: 'Custo % bruto', title: 'custos / saldo bruto. < 15% bom; > 40% trabalha para a corretora', v: x => x.o.custoPct, f: v => F.pct(v) },
    pctGrade: { t: '% em grade', title: 'operações com mais de 1 contrato', v: x => x.o.pctGrade, f: v => F.pct(v) },
    m1: { t: 'Média 1 ctt', title: 'média do líquido nas operações de 1 contrato', v: x => x.o.m1, f: v => F.brl(v, 2), cor: 1 },
    mN: { t: 'Média grade', title: 'média do líquido nas operações com mais de 1 contrato (a grade se justifica se for maior)', v: x => x.o.mN, f: v => F.brl(v, 2), cor: 1 },
    maeG: { t: 'MAE venc.', title: 'MAE médio das vencedoras (pts): calibra o stop', v: x => x.o.maeG, f: F.n0 },
    maeG90: { t: 'MAE venc. P90', title: '90% das vencedoras foram contra no máximo isso (pts): o stop deve ficar acima', v: x => x.o.maeG90, f: F.n0 },
    maeL: { t: 'MAE perd.', title: 'MAE médio das perdedoras (pts)', v: x => x.o.maeL, f: F.n0 },
    mfeL: { t: 'MFE perd.', title: 'MFE médio das perdedoras (pts): alto = perdedoras que estiveram no lucro', v: x => x.o.mfeL, f: F.n0 },
    pctPerdLucro: { t: '% perd. no lucro', title: 'perdedoras que chegaram a ≥ metade do ganho típico (pts). > 30% pede breakeven/trailing', v: x => x.o.pctPerdLucro, f: v => F.pct(v) },
    captura: { t: 'Captura', title: 'Σ pts das vencedoras / Σ MFE das vencedoras. < 40% sai cedo; > 70% bom', v: x => x.o.captura, f: v => F.pct(v) },
    edge: { t: 'Edge ratio', title: 'média MFE / média MAE. > 1,2 = entrada com vantagem', v: x => x.o.edge, f: F.n2 },
    cobMae: { t: '% c/ MAE', title: 'operações com MAE/MFE conhecidos (o resto foi em candle de outro vencimento)', v: x => x.o.cobMae, f: v => F.pct(v) },
    // dia / travas / regime / estabilidade
    mPos: { t: 'Média dia +', title: 'média dos dias positivos', v: x => x.d.mPos, f: v => F.brl(v) },
    mNeg: { t: 'Média dia −', title: 'média dos dias negativos', v: x => x.d.mNeg, f: v => F.brl(v), cor: 1 },
    payoffD: { t: 'Payoff diário', title: 'média dia + / |média dia −|', v: x => x.d.payoffD, f: F.n2 },
    devMed: { t: 'Devolução méd.', title: 'média de (máximo do dia − final)', v: x => x.d.devMed, f: v => F.brl(v) },
    virou: { t: 'Dias "virou"', title: '% dos dias que chegaram a +100 e fecharam ≤ 0. > 20% ruim', v: x => x.d.virou, f: v => F.pct(v) },
    pctMeta: { t: '% meta', title: '% dos dias com final ≥ 90% da meta (Aba Risco)', v: x => x.d.pctMeta, f: v => F.pct(v) },
    tocouMeta: { t: '% tocou meta', title: '% dos dias com máximo ≥ 95% da meta', v: x => x.d.tocouMeta, f: v => F.pct(v) },
    pctPerda: { t: '% perda', title: '% dos dias com mínimo ≤ −95% da perda (Aba Risco)', v: x => x.d.pctPerda, f: v => F.pct(v) },
    usoPerda: { t: 'Uso da perda', title: 'média do mínimo do dia / perda diária', v: x => x.d.usoPerda, f: v => F.pct(Math.abs(v)) },
    amplo: { t: 'R$/dia amplo', title: 'R$/dia nos pregões com A10 ≥ 3000 na abertura', v: x => x.d.amplo, f: v => F.brl(v), cor: 1 },
    estreito: { t: 'R$/dia estreito', title: 'R$/dia nos pregões com A10 < 3000', v: x => x.d.estreito, f: v => F.brl(v), cor: 1 },
    deltaReg: { t: 'Δ regime', title: 'amplo − estreito (vale com ≥ 5 dias de cada lado)', v: x => x.d.deltaReg, f: v => F.brl(v), cor: 1 },
    razaoRec: { t: 'Razão recência', title: 'últimos 10 / R$/dia total. < 0,5 deterioração; > 1,5 melhora (ou sorte)', v: x => x.d.razaoRec, f: F.n2 },
    sdMeses: { t: 'Desvio meses', title: 'desvio do R$/dia entre meses (≥ 8 dias). Menor é melhor', v: x => x.d.sdMeses, f: v => F.brl(v) },
    mp: { t: 'Pos. máx dia', title: 'maior posição (contratos) num dia', v: x => x.d.mp, f: F.n0 }
  };
  const CONJ = {
    resumo: { t: 'Resumo (financeiro e operações)', c: ['fam', 'n', 'nops', 'assert', 'pontos', 'liq', 'sbruto', 'custo', 'gPF', 'payoff', 'exp', 'porDia', 'best', 'worst', 'dd', 'u10', 'spark'] },
    essencial: { t: 'Essencial (ranking)', c: ['n', 'porDia', 'liq', 'pctPos', 'pf', 'tdia', 'dd', 'recup', 'h1', 'h2', 'u10', 'semMelhor', 'devPct', 'saldoTick', 'spark'] },
    profit: { t: 'Relatório do Profit', c: ['nops', 'liq', 'bruto', 'prej', 'gPF', 'custo', 'acerto', 'exp', 'mG', 'mL', 'payoff', 'maxG', 'maxL', 'seqG', 'seqL', 'durG', 'durL', 'maxCt', 'patrimNec', 'patrimMax', 'ddTrade'] },
    risco: { t: 'Risco e quedas', c: ['n', 'porDia', 'dd', 'ddDias', 'recup', 'ulcer', 'submersoMax', 'submersoAtual', 'worst', 'piorIntra', 'seqNeg', 'sharpe', 'sortino', 'ruina', 'perda20'] },
    ops: { t: 'Qualidade das operações', c: ['nops', 'opsDia', 'exp', 'acerto', 'acertoMin', 'margem', 'payoff', 'sqn', 'rsCtt', 'custoPct', 'saldoTick', 'pctGrade', 'm1', 'mN'] },
    saida: { t: 'Saída (MAE/MFE)', c: ['nops', 'cobMae', 'maeG', 'maeG90', 'maeL', 'mfeL', 'pctPerdLucro', 'captura', 'edge', 'durG', 'durL'] },
    travas: { t: 'Dia, travas e regime', c: ['n', 'porDia', 'pctPos', 'mPos', 'mNeg', 'payoffD', 'best', 'worst', 'devMed', 'devPct', 'virou', 'pctMeta', 'tocouMeta', 'pctPerda', 'usoPerda', 'amplo', 'estreito', 'deltaReg'] },
    estab: { t: 'Robustez no tempo', c: ['n', 'porDia', 'h1', 'h2', 'u10', 'razaoRec', 'sdMeses', 'semMelhor', 'tdia', 'mp'] }
  };

  /* linha TOTAL: soma da carteira filtrada (dias = pregões em que algum robô operou; operações = todas as filtradas) */
  function linhaTotal(rows) {
    const C = P.CTX, rs = rows.map(x => x.r), idx = C.dias.filter(d => rs.some(r => !isNaN(P.RES[r].f[d])));
    const v = idx.map(d => { let s = 0; for (const r of rs) { const x = P.RES[r].f[d]; if (!isNaN(x)) s += x; } return s; });
    const d = M.serie(idx, v, v, v, {}), o = M.operacoes(C.opsF);
    return { r: -1, nome: `TOTAL (${rows.length} robôs)`, fam: '', d, o, n: d.n, porDia: d.porDia, tot: d.tot, pctPos: d.pctPos, pf: o.pf, tdia: d.tdia, dd: d.dd, recup: d.recup, h1: d.h1, h2: d.h2, u10: d.u10, semMelhor: d.semMelhor, devPct: d.devPct, saldoTick: o.saldoTick, liq: o.liq, score: NaN, comp: {}, pen: [], selos: [] };
  }

  /* ================= RANKING ================= */
  R.ranking = host => {
    const S = P.S, rows = linhas();
    if (!rows.length) { host.innerHTML = '<div class="vazio">Nenhum robô no filtro.</div>'; return; }
    const conj = CONJ[S.conjunto] ? S.conjunto : 'resumo';
    const nRob = rows.filter(x => x.selos.some(s => s.t === 'Robusto')).length, nAlvo = rows.filter(x => x.selos.some(s => s.t === 'Alvo R$100')).length, nDet = rows.filter(x => x.selos.some(s => s.t === 'Em deterioração')).length;
    host.innerHTML = `<div class="tiles">${P.tile('Robôs no filtro', rows.length, `${P.CTX.dias.length} pregões`)}${P.tile('Robustos', nRob, 'as 2 metades + últimos 10 positivos, t ≥ 1,5')}${P.tile('No alvo R$ 100/dia', nAlvo, 'com ≥ 20 pregões')}${P.tile('Em deterioração', nDet, 'positivos no total, piorando agora', nDet ? 'neg' : '')}</div>
      <div class="card"><div class="cab"><h2>Comparar robôs</h2><span class="sub">marque até 8 na tabela; a cor fica presa ao robô</span></div><div class="legenda" id="rkLeg"></div><div id="rkComp"></div></div>
      <div class="card"><div class="cab"><h2>Ranking</h2><div class="ctrl">Colunas <select id="rkConj">${Object.entries(CONJ).map(([k, v]) => `<option value="${k}" ${k === conj ? 'selected' : ''}>${v.t}</option>`).join('')}</select>
        <button class="btn" id="rkCsv">Exportar CSV (todas as colunas)</button></div></div>
        <div class="sub" style="margin-bottom:6px">Passe o mouse no cabeçalho para ver a fórmula e como ler; no score, para ver os componentes e as penalidades. Clique no nome para o detalhe.${P.CTX.filtroOps ? ' <b>Filtro de operações ativo:</b> colunas de operação usam só as operações filtradas.' : ''}</div>
        <div id="rkTab"></div>
        <details style="margin-top:10px"><summary class="sub" style="cursor:pointer">Como ler cada coluna deste conjunto</summary><div class="kv" style="margin-top:8px">${['score'].concat(CONJ[conj].c).filter(k => k !== 'spark').map(k => `<div>${COL[k].t}</div><div style="font-weight:400;text-align:left">${F.esc(COL[k].title)}</div>`).join('')}</div></details></div>`;
    $('rkConj').onchange = e => { S.conjunto = e.target.value; P.salvar(); R.ranking(host); };
    desenharComp(rows);
    const cols = [
      { k: 'cmp', t: '', html: x => x.r < 0 ? '' : `<input type="checkbox" data-comp="${x.r}" ${P.corComp(x.r) ? 'checked' : ''}>${P.corComp(x.r) ? `<span class="cor-dot" style="background:${P.corComp(x.r)}"></span>` : ''}`, s: x => P.corComp(x.r) ? 1 : 0 },
      { k: 'nome', t: 'Robô', l: 1, nome: 1, fix: 1, html: x => x.r < 0 ? F.esc(x.nome) : P.linkRobo(x.r) + '<br>' + M.selosHtml(x.selos), s: x => x.nome },
      Object.assign({ k: 'score' }, COL.score, { s: x => x.score })
    ].concat(CONJ[conj].c.map(k => Object.assign({ k }, COL[k], { s: COL[k].v })));
    const flat = rows.map(x => { const o = Object.assign({}, x); for (const c of cols) if (COL[c.k]) o[c.k] = COL[c.k].v(x); return o; });
    const tot = linhaTotal(rows); const totF = Object.assign({}, tot); for (const c of cols) if (COL[c.k]) totF[c.k] = COL[c.k].v(tot);
    P.tabela($('rkTab'), 'rk', cols, flat, { sort: { k: 'score', d: -1 }, rodape: totF, depois: h => { P.ligarNomes(h); P.ligarComp(h, () => R.ranking(host)); } });
    $('rkCsv').onclick = () => { const all = [{ k: 'nome', t: 'Robô' }, { k: 'fam', t: 'Família' }, { k: 'est', t: 'Estratégia' }, { k: 'graf', t: 'Gráfico' }, { k: 'mt', t: 'Meta' }, { k: 'pd', t: 'Perda' }, { k: 'score', t: 'Score' }, { k: 'selosTxt', t: 'Selos' }]
      .concat(Object.keys(COL).filter(k => k !== 'spark' && k !== 'score').map(k => ({ k, t: COL[k].t })));
      P.csv('ranking_robos.csv', all, rows.map(x => { const o = { nome: x.nome, fam: x.fam, est: x.est, graf: x.graf, mt: x.mt, pd: x.pd, score: x.score, selosTxt: x.selos.map(s => s.t).join(', ') }; for (const k in COL) if (k !== 'spark') { const v = COL[k].v(x); o[k] = isFinite(v) ? v : ''; } return o; })); };
  };
  function desenharComp(rows) {
    const S = P.S, C = P.CTX, lab = C.dias.map(d => P.D.dias[d]);
    const series = S.comp.map((w, k) => { const r = P.ROB.findIndex(x => x.w === w); if (r < 0) return null; let c = 0; const vals = C.dias.map(d => { const v = P.RES[r].f[d]; if (!isNaN(v)) c += v; return c; }); return { name: P.ROB[r].n, color: SLOTS[k], vals }; }).filter(Boolean);
    if (!series.length) { $('rkLeg').innerHTML = ''; $('rkComp').innerHTML = '<div class="vazio" style="padding:14px">Marque robôs na tabela para comparar as curvas.</div>'; return; }
    $('rkLeg').innerHTML = series.map(s => `<span><i style="background:${s.color}"></i>${F.esc(s.name)}</span>`).join('') + ' <a class="sub" id="rkLimpa" style="cursor:pointer">limpar</a>';
    $('rkLimpa').onclick = () => { S.comp = []; P.salvar(); R.ranking($('aba-ranking')); };
    G.line($('rkComp'), { labels: lab, series, h: 240, fmtX: F.dataBr, rotulosFim: series.length <= 4 });
  }

  /* ================= DETALHE ================= */
  R.detalhe = host => {
    const S = P.S, C = P.CTX, rows = linhas();
    let r = P.ROB.findIndex(x => x.w === S.robo);
    if (r < 0) { if (!rows.length) { host.innerHTML = '<div class="vazio">Nenhum robô no filtro.</div>'; return; } r = rows.slice().sort((a, b) => b.score - a.score)[0].r; S.robo = P.ROB[r].w; P.salvar(); }
    const rob = P.ROB[r];
    let x = rows.find(y => y.r === r);
    const ops = P.OPS_R[r].filter(C.opOkNR);
    if (!x) { x = M.pontuar([M.linha(r, C.dias, ops)])[0]; x.foraFiltro = true; }
    const d = x.d, o = x.o, at = M.ativo(rob);
    if (!d.n) { host.innerHTML = cabDetalhe(r, rows) + '<div class="vazio">Este robô não operou nos pregões filtrados.</div>'; ligarCab(host); return; }
    const lab = d.idx.map(i => P.D.dias[i]);
    host.innerHTML = cabDetalhe(r, rows) + `
      <div class="card"><div class="cab"><div><h2 style="font-size:16px;margin:0">${F.esc(rob.n)} ${M.selosHtml(x.selos)}</h2>
        <div class="cfg">${[rob.f, rob.e && 'estratégia ' + rob.e, rob.g && 'gráfico ' + rob.g.split('/')[1] + ' min', rob.tc === 'Real' ? 'CONTA REAL · ' + rob.c : rob.c,rob.at ? 'no Profit hoje' : 'removido do Profit', rob.mt > 0 && `meta ${F.n0(rob.mt)} / perda ${F.n0(rob.pd)}`, rob.q && 'contratos ' + rob.q, rob.cf && 'candle ' + rob.cf, rob.jn && 'janela ' + rob.jn, at.nome].filter(Boolean).map(F.esc).join(' · ')}</div>
        ${x.foraFiltro ? '<div class="sub">Este robô está fora dos filtros de robô atuais; score calculado só com ele (sem comparação).</div>' : ''}</div></div>
        ${rob.inp ? `<details><summary class="sub" style="cursor:pointer">Inputs</summary><div class="cfg"><code>${F.esc(rob.inp)}</code></div></details>` : ''}</div>
      <div class="tiles">
        ${(() => { const z = window.Dec && rob.tc !== 'Real' ? Dec.linhasDec().find(y => y.r === r) : null; return z ? P.tile('Para a conta real', Dec.VER[z.ver].t, z.motivo, z.ver === 'nao' ? 'neg' : '') + P.tile('Capital sugerido', F.brl(z.capital), `R$/dia com slippage ${F.brl(z.real)} · ${F.pct(z.retMes, 1)} ao mês`) : P.tile('Score', Math.round(x.score), x.pen.length ? 'penalidades: ' + x.pen.join('; ') : 'sem penalidades'); })()}
        ${P.tile('R$/dia', F.brl(d.porDia), `${d.n} pregões · alvo 100`, d.porDia < 0 ? 'neg' : '')}
        ${P.tile('Saldo líquido (ops)', F.brl(o.liq), `soma dos dias ${F.brl(d.tot)}`, o.liq < 0 ? 'neg' : '')}
        ${P.tile('% dias positivos', F.pct(d.pctPos), `melhor ${F.brl(d.best)} · pior ${F.brl(d.worst)}`)}
        ${P.tile('Fator de lucro', inf(o.pf) || F.n2(o.pf), `${F.n0(o.n)} ops · ${F.pct(o.acerto)} vencedoras`)}
        ${P.tile('Queda máxima', F.brl(-d.dd), `${F.n1(d.ddDias)} dias de ganho · ${d.diasRecup == null ? (d.dd > 0 ? 'não recuperou' : '') : 'recuperou em ' + d.diasRecup + ' pregões'}`, d.dd > 0 ? 'neg' : '')}
        ${P.tile('Recuperação', inf(d.recup) || F.n2(d.recup), 'total / queda máxima')}
        ${P.tile('Metades · últ. 10', `${F.n0(d.h1)} · ${F.n0(d.h2)} · ${F.n0(d.u10)}`, `R$/dia · t-dia ${F.n2(d.tdia)}`)}
      </div>
      <div class="card"><h2>Diagnóstico automático</h2><ul class="diag" id="dtDiag"></ul></div>
      <div class="card"><div class="cab"><h2>Curva de capital</h2><span class="sub">faixa = mínimo e máximo de cada dia · fundo azul = A10 ≥ 3000 · linha vertical = divisão das metades</span></div><div id="dtCurva"></div><h3 style="margin-top:8px">Queda a partir do pico</h3><div id="dtSub"></div></div>
      <div class="card"><div class="cab"><h2>Resultado por pregão</h2><span class="sub">traço vertical = mínimo e máximo do dia · linhas: meta, −perda e alvo 100</span></div><div id="dtBar"></div><h3 style="margin-top:8px">Média móvel de 10 pregões</h3><div id="dtMM"></div></div>
      <div class="card"><div class="cab"><h2>Alavancas: meta, perda e horário</h2><span class="sub">simulação sobre a curva de 10 min: otimista e é sugestão, não regra (mínimo 20 pregões)</span></div><div class="grid2"><div id="dtMP"></div><div id="dtHr"></div></div></div>
      <details class="mais-det" id="dtMais" ${S.detMais ? 'open' : ''}><summary>Mais análises do robô: distribuição, horário, contratos, MAE/MFE, regime, curva intradiária e relatório do Profit</summary>
      <div class="grid2"><div class="card"><h2>Resultado por operação</h2><div id="dtHistO"></div></div><div class="card"><h2>Resultado por dia</h2><div id="dtHistD"></div></div></div>
      <div class="grid2"><div class="card"><div class="cab"><h2>Por hora de entrada (30 min)</h2><span class="sub">passe o mouse: nº de operações e % de acerto</span></div><div id="dtHora"></div></div><div class="card"><h2>Por nº de contratos na operação</h2><div id="dtCtt"></div></div></div>
      <div class="grid2"><div class="card"><div class="cab"><h2>MAE × MFE (pontos)</h2><span class="sub">${F.pct(o.cobMae)} das operações com MAE/MFE · azul vencedora, vermelho perdedora</span></div><div id="dtMae"></div></div><div class="card"><h2>MAE × resultado</h2><div id="dtMaeR"></div></div></div>
      <div class="grid2"><div class="card"><div class="cab"><h2>Pelo resultado do dia antes da operação</h2><span class="sub">média por operação</span></div><div id="dtAntes"></div></div><div class="card"><h2>Regime e dia da semana</h2><div id="dtReg"></div></div></div>
      <div class="card"><div class="cab"><h2>Curva intradiária média</h2><span class="sub">faixa = 25% a 75% dos dias · grade de 10 min</span></div><div id="dtIntra"></div></div>
      <div class="card"><h2>Relatório estilo Profit</h2><div id="dtRel"></div></div></details>
      <div class="card"><div class="cab"><h2>Operações</h2><button class="btn" id="dtCsv">Exportar CSV</button></div><div id="dtOps"></div></div>`;
    ligarCab(host);
    // os gráficos de dentro do "Mais análises" só medem a largura certa abertos: redesenha ao abrir/fechar
    $('dtMais').ontoggle = () => { if (!!S.detMais === $('dtMais').open) return; S.detMais = $('dtMais').open; P.salvar(); const y = scrollY; R.detalhe(host); scrollTo(0, y); };
    // curva de capital
    const Eprev = d.E.map((e, i) => i ? d.E[i - 1] : 0);
    G.line($('dtCurva'), { labels: lab, series: [{ name: 'Acumulado', color: 'var(--s1)', vals: d.E }], band: { lo: d.idx.map((di, i) => Eprev[i] + P.RES[r].mn[di]), hi: d.idx.map((di, i) => Eprev[i] + P.RES[r].mx[di]) },
      shade: d.idx.map(di => P.DIA[di].a10 >= 3000), vline: Math.floor(d.n / 2), h: 250, fmtX: F.dataBr,
      tip: i => `<b>${F.dataBrA(lab[i])}</b><div class="linha"><span>Dia</span><span>${F.sbrl(d.v[i])}</span></div><div class="linha"><span>Acumulado</span><span>${F.brl(d.E[i])}</span></div><div class="linha"><span>Mín / máx do dia</span><span>${F.n0(P.RES[r].mn[d.idx[i]])} / ${F.n0(P.RES[r].mx[d.idx[i]])}</span></div><div class="linha"><span>A10</span><span>${F.n0(P.DIA[d.idx[i]].a10)}</span></div>`,
      onClick: i => { S.dia = d.idx[i]; P.abrirAba('dia'); } });
    G.line($('dtSub'), { labels: lab, series: [{ name: 'Queda', color: 'var(--neg)', vals: d.DD.map(q => -q), fill: true }], h: 130, fmtX: F.dataBr });
    const refs = [{ v: 100, t: 'alvo 100' }]; if (rob.mt > 0) refs.push({ v: rob.mt, t: 'meta ' + rob.mt }); if (rob.pd > 0) refs.push({ v: -rob.pd, t: '−perda ' + rob.pd });
    G.bars($('dtBar'), { labels: lab, vals: d.v, whisk: { lo: d.idx.map(i => P.RES[r].mn[i]), hi: d.idx.map(i => P.RES[r].mx[i]) }, refs, h: 220, fmtX: F.dataBr,
      tip: i => `<b>${F.dataBrA(lab[i])}</b><div class="linha"><span>Final</span><span>${F.sbrl(d.v[i])}</span></div><div class="linha"><span>Mínimo / máximo</span><span>${F.n0(P.RES[r].mn[d.idx[i]])} / ${F.n0(P.RES[r].mx[d.idx[i]])}</span></div>`, onClick: i => { S.dia = d.idx[i]; P.abrirAba('dia'); } });
    const mm = d.v.map((_, i) => i < 9 ? null : M.mean(d.v.slice(i - 9, i + 1)));
    G.line($('dtMM'), { labels: lab, series: [{ name: 'Média 10 pregões', color: 'var(--s1)', vals: mm }], refs: [{ v: 100, t: 'alvo 100' }], h: 150, fmtX: F.dataBr });
    hist($('dtHistO'), ops.map(t => t.liq), 'operações'); hist($('dtHistD'), d.v, 'pregões');
    // por hora (30 min)
    const jan = []; for (let m = 540; m < 1080; m += 30) jan.push(m);
    const porJ = jan.map(m => ops.filter(t => t.ini >= m && t.ini < m + 30));
    const ji = porJ.map((a, i) => a.length ? i : -1).filter(i => i >= 0);
    G.bars($('dtHora'), { labels: ji.map(i => F.hora(jan[i])), vals: ji.map(i => M.sum(porJ[i].map(t => t.liq))), h: 200, lblW: 44,
      tip: k => { const a = porJ[ji[k]], mo = M.operacoes(a); return `<b>${F.hora(jan[ji[k]])}–${F.hora(jan[ji[k]] + 29)}</b><div class="linha"><span>Saldo</span><span>${F.sbrl(mo.liq)}</span></div><div class="linha"><span>Operações</span><span>${a.length}</span></div><div class="linha"><span>% acerto</span><span>${F.pct(mo.acerto)}</span></div>`; } });
    const ctts = [...new Set(ops.map(t => t.ct))].sort((a, b) => a - b);
    G.bars($('dtCtt'), { labels: ctts.map(c => c + ' ctt'), vals: ctts.map(c => M.mean(ops.filter(t => t.ct === c).map(t => t.liq))), h: 200, fmtTip: v => F.brl(v, 2),
      tip: k => { const a = ops.filter(t => t.ct === ctts[k]); return `<b>${ctts[k]} contrato(s)</b><div class="linha"><span>Média por op</span><span>${F.brl(M.mean(a.map(t => t.liq)), 2)}</span></div><div class="linha"><span>Operações</span><span>${a.length}</span></div><div class="linha"><span>Saldo</span><span>${F.sbrl(M.sum(a.map(t => t.liq)))}</span></div>`; } });
    const cov = ops.filter(t => t.mae >= 0 && t.mfe >= 0);
    const tipOp = t => `<b>${F.dataBrA(P.D.dias[t.d])} ${F.hora(t.ini)}</b> ${t.lado > 0 ? 'compra' : 'venda'}<div class="linha"><span>Líquido</span><span>${F.sbrl(t.liq, 2)}</span></div><div class="linha"><span>MAE / MFE</span><span>${t.mae} / ${t.mfe} pts</span></div>`;
    G.scatter($('dtMae'), { pts: cov.map(t => ({ x: t.mae, y: t.mfe, c: t.liq > 0 ? 'var(--pos)' : 'var(--neg)', tip: tipOp(t) })), xRot: 'MAE (pts contra)', yRot: 'MFE (pts a favor)', fmtX: F.n0 });
    G.scatter($('dtMaeR'), { pts: cov.map(t => ({ x: t.mae, y: t.liq, c: t.liq > 0 ? 'var(--pos)' : 'var(--neg)', tip: tipOp(t) })), xRot: 'MAE (pts contra)', yRot: 'líquido R$', fmtX: F.n0 });
    // edge contextual
    const fx_ = [['≤ −perda/2', t => rob.pd > 0 && t.antes <= -rob.pd / 2], ['negativo', t => t.antes < 0 && !(rob.pd > 0 && t.antes <= -rob.pd / 2)], ['1ª do dia (zerado)', t => t.antes === 0], ['positivo', t => t.antes > 0 && !(rob.mt > 0 && t.antes >= rob.mt / 2)], ['≥ meta/2', t => rob.mt > 0 && t.antes >= rob.mt / 2]];
    const fa = fx_.map(([nm, fn]) => ({ nm, a: ops.filter(fn) })).filter(z => z.a.length);
    G.bars($('dtAntes'), { labels: fa.map(z => z.nm), vals: fa.map(z => M.mean(z.a.map(t => t.liq))), h: 200, lblW: 90, tip: k => `<b>Robô ${fa[k].nm} no dia</b><div class="linha"><span>Média por op</span><span>${F.brl(M.mean(fa[k].a.map(t => t.liq)), 2)}</span></div><div class="linha"><span>Operações</span><span>${fa[k].a.length}</span></div>` });
    const regs = [['A10 amplo (≥ 3000)', d.amplo, d.nAmplo], ['A10 estreito (< 3000)', d.estreito, d.nEstr]];
    [1, 2, 3, 4, 5].forEach(w => { const a = d.idx.map((di, i) => P.DIA[di].dow === w ? d.v[i] : null).filter(v => v != null); regs.push([P.SEM[w], M.mean(a), a.length]); });
    const rg = regs.filter(z => z[2] > 0);
    G.hbars($('dtReg'), { labels: rg.map(z => `${z[0]} (${z[2]})`), vals: rg.map(z => z[1]), fmtV: v => F.brl(v) });
    // intradiária média
    const curvas = d.idx.map(di => (P.D.intra[di] || {})[r]).filter(Boolean);
    if (curvas.length) { const k = P.D.grade.length; const md = [], lo = [], hi = []; for (let j = 0; j < k; j++) { const col = curvas.map(c => c[j]); md.push(M.mean(col)); lo.push(M.pctl(col, 0.25)); hi.push(M.pctl(col, 0.75)); }
      const rf = []; if (rob.mt > 0) rf.push({ v: rob.mt, t: 'meta' }); if (rob.pd > 0) rf.push({ v: -rob.pd, t: '−perda' });
      G.line($('dtIntra'), { labels: P.D.grade.map(F.hora), series: [{ name: 'Média', color: 'var(--s1)', vals: md }], band: { lo, hi }, refs: rf, h: 220,
        tip: j => `<b>${F.hora(P.D.grade[j])}</b><div class="linha"><span>Média</span><span>${F.brl(md[j])}</span></div><div class="linha"><span>25% a 75%</span><span>${F.n0(lo[j])} a ${F.n0(hi[j])}</span></div>` }); }
    else $('dtIntra').innerHTML = '<div class="vazio">Sem curva intradiária.</div>';
    const alav = alavancas(r, d, ops); desenharAlav(alav, rob);
    diagnostico(r, d, o, ops, alav, at);
    relatorio($('dtRel'), ops, d, r);
    const orows = ops.map(t => ({ t, data: P.D.dias[t.d], ini: t.ini, fim: t.fim, lado: t.lado, ct: t.ct, liq: t.liq, custo: t.custo, dur: t.dur, mae: t.mae < 0 ? null : t.mae, mfe: t.mfe < 0 ? null : t.mfe, antes: t.antes }));
    const ocols = [{ k: 'data', t: 'Data', l: 1, f: v => F.dataBrA(v) }, { k: 'ini', t: 'Entrada', f: F.hora }, { k: 'fim', t: 'Saída', f: F.hora }, { k: 'lado', t: 'Lado', l: 1, f: v => v > 0 ? 'Compra' : 'Venda' }, { k: 'ct', t: 'Ctt', f: F.n0 },
      { k: 'liq', t: 'Líquido', f: v => F.sbrl(v, 2), cor: 1 }, { k: 'custo', t: 'Custo', f: v => F.n2(v) }, { k: 'dur', t: 'Duração', f: F.min }, { k: 'mae', t: 'MAE', f: F.n0 }, { k: 'mfe', t: 'MFE', f: F.n0 }, { k: 'antes', t: 'Dia antes', f: v => F.sbrl(v), cor: 1 }];
    P.tabela($('dtOps'), 'dtOps', ocols, orows, { sort: { k: 'data', d: -1 }, limite: 100 });
    $('dtCsv').onclick = () => P.csv(rob.n + '_operacoes.csv', ocols, orows);
  };
  function cabDetalhe(r, rows) {
    const S = P.S; const ord = rows.slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const tem = ord.some(x => x.r === r);
    return `<div class="det-cab"><select id="dtSel">${tem ? '' : `<option value="${r}" selected>${F.esc(P.ROB[r].n)} (fora do filtro)</option>`}${ord.map(x => `<option value="${x.r}" ${x.r === r ? 'selected' : ''}>${F.esc(x.nome)} · score ${Math.round(x.score)}</option>`).join('')}</select>
      <button class="btn" id="dtAnt">‹ anterior no ranking</button><button class="btn" id="dtProx">próximo no ranking ›</button>
      <label class="ctrl"><input type="checkbox" id="dtCmp" ${P.corComp(r) ? 'checked' : ''}> comparar no Ranking/Dia</label></div>`;
  }
  function ligarCab(host) {
    const S = P.S, rows = linhas().slice().sort((a, b) => b.score - a.score);
    const r = P.ROB.findIndex(x => x.w === S.robo), k = rows.findIndex(x => x.r === r);
    $('dtSel').onchange = e => { S.robo = P.ROB[+e.target.value].w; P.salvar(); R.detalhe(host); scrollTo(0, 0); };
    $('dtAnt').onclick = () => { if (k > 0) { S.robo = P.ROB[rows[k - 1].r].w; P.salvar(); R.detalhe(host); } };
    $('dtProx').onclick = () => { if (k < rows.length - 1) { S.robo = P.ROB[rows[k + 1].r].w; P.salvar(); R.detalhe(host); } };
    $('dtCmp').onchange = e => { const w = P.ROB[r].w; if (e.target.checked) { if (S.comp.length >= 8) { e.target.checked = false; return; } S.comp = [...S.comp, w]; } else S.comp = S.comp.filter(x => x !== w); P.salvar(); };
  }
  function hist(host, vals, unid) {
    if (!vals.length) { host.innerHTML = '<div class="vazio">Sem dados</div>'; return; }
    const lo = Math.min(...vals), hi = Math.max(...vals); const tk = G.nice(lo, hi, 20).ticks; const bs = tk.length > 1 ? tk[1] - tk[0] : 50;
    const b0 = Math.floor(lo / bs) * bs, nb = Math.min(80, Math.ceil((hi - b0) / bs) + 1), cnt = new Array(nb).fill(0); for (const v of vals) cnt[Math.min(nb - 1, Math.floor((v - b0) / bs))]++;
    G.bars(host, { labels: cnt.map((_, i) => b0 + i * bs), vals: cnt, h: 180, lblW: 50, fmtX: v => F.n0(v), fmtY: F.n0, color: (v, i) => b0 + i * bs + bs / 2 < 0 ? 'var(--neg)' : 'var(--pos)', tip: i => `<b>${F.brl(b0 + i * bs)} a ${F.brl(b0 + (i + 1) * bs)}</b><br>${cnt[i]} ${unid}` });
  }

  /* simulação de meta/perda (curva de 10 min) e corte de horário */
  function alavancas(r, d, ops) {
    const rob = P.ROB[r], RS = P.RES[r];
    const Ms = [...new Set([100, 150, 200, 300, 500, rob.mt > 0 ? rob.mt : null].filter(v => v))].sort((a, b) => a - b);
    const Ps = [...new Set([150, 300, 500, rob.pd > 0 ? rob.pd : null].filter(v => v))].sort((a, b) => a - b);
    const simDia = (di, Mv, Pv) => { const c = (P.D.intra[di] || {})[r], f = RS.f[di], mn = RS.mn[di], mx = RS.mx[di];
      if (c) for (const v of c) { if (v >= Mv) return Mv; if (v <= -Pv) return -Pv; }
      if (mx >= Mv && mn <= -Pv) return -Pv; if (mx >= Mv) return Mv; if (mn <= -Pv) return -Pv; return f; };
    const resumo = vals => { const n = vals.length, h = Math.floor(n / 2); let E = 0, pk = 0, dd = 0; for (const v of vals) { E += v; if (E > pk) pk = E; if (pk - E > dd) dd = pk - E; }
      return { dia: M.mean(vals), h1: M.mean(vals.slice(0, h)), h2: M.mean(vals.slice(h)), dd }; };
    const base = resumo(d.v);
    const grade = []; for (const Mv of Ms) for (const Pv of Ps) { const vals = d.idx.map(di => simDia(di, Mv, Pv)); const s = resumo(vals);
      grade.push(Object.assign({ M: Mv, P: Pv, atual: Mv === rob.mt && Pv === rob.pd, acima: (rob.mt > 0 && Mv > rob.mt) || (rob.pd > 0 && Pv > rob.pd) }, s)); }
    // corte de horário: só entradas antes de H (resultado pelas operações)
    const diaPos = {}; d.idx.forEach((di, i) => diaPos[di] = i); const h = Math.floor(d.n / 2);
    const hor = []; for (let H = 600; H <= 1050; H += 30) { const sel = ops.filter(t => t.ini < H); const v1 = M.sum(sel.filter(t => diaPos[t.d] < h).map(t => t.liq)), v2 = M.sum(sel.filter(t => diaPos[t.d] >= h).map(t => t.liq));
      hor.push({ H, dia: M.sum(sel.map(t => t.liq)) / d.n, h1: h ? v1 / h : NaN, h2: v2 / (d.n - h), n: sel.length }); }
    const totOps = M.sum(ops.map(t => t.liq)), opsBase = { dia: totOps / d.n, h1: h ? M.sum(ops.filter(t => diaPos[t.d] < h).map(t => t.liq)) / h : NaN, h2: M.sum(ops.filter(t => diaPos[t.d] >= h).map(t => t.liq)) / (d.n - h) };
    // janelas de 30 min a bloquear
    const bloq = []; for (let m = 540; m < 1080; m += 30) { const a = ops.filter(t => t.ini >= m && t.ini < m + 30); if (a.length < 15) continue; const s1 = M.sum(a.filter(t => diaPos[t.d] < h).map(t => t.liq)), s2 = M.sum(a.filter(t => diaPos[t.d] >= h).map(t => t.liq)), s = s1 + s2;
      if (s1 < 0 && s2 < 0 && s < -0.3 * Math.abs(totOps)) bloq.push({ m, s, n: a.length }); }
    return { base, grade, hor, opsBase, bloq, Ms, Ps };
  }
  function desenharAlav(a, rob) {
    const melhor = a.grade.filter(g => !g.acima && g.h1 > 0 && g.h2 > 0).sort((x, y) => y.dia - x.dia)[0];
    let h = `<h3>Meta × perda diária (R$/dia; metades; queda)</h3><div class="tw"><table class="t"><thead><tr><th class="l">Meta \\ Perda</th>${a.Ps.map(p => `<th>${p}${p === rob.pd ? ' (atual)' : ''}</th>`).join('')}</tr></thead><tbody>`;
    for (const Mv of a.Ms) { h += `<tr><td class="l">${Mv}${Mv === rob.mt ? ' (atual)' : ''}</td>`; for (const Pv of a.Ps) { const g = a.grade.find(z => z.M === Mv && z.P === Pv);
      const est = g.acima ? 'color:var(--muted)' : g === melhor ? 'font-weight:700' : ''; h += `<td style="${est}" title="1ª metade ${F.n0(g.h1)} · 2ª ${F.n0(g.h2)} · queda ${F.n0(g.dd)}${g.acima ? ' · acima da trava atual: o robô parou antes, não dá para saber' : ''}">${F.n0(g.dia)}<br><span class="mut">${F.n0(g.h1)} | ${F.n0(g.h2)} · ${F.n0(-g.dd)}</span></td>`; } h += '</tr>'; }
    h += `</tbody></table></div><div class="sub">Hoje (resultado real): ${F.n0(a.base.dia)}/dia · metades ${F.n0(a.base.h1)} | ${F.n0(a.base.h2)} · queda ${F.n0(-a.base.dd)}. Cinza = acima da trava atual (não dá para saber). Negrito = melhor combinação com as 2 metades positivas.</div>`;
    $('dtMP').innerHTML = h;
    const mh = a.hor.filter(z => z.h1 > 0 && z.h2 > 0).sort((x, y) => y.dia - x.dia)[0];
    let t = `<h3>Só entradas antes de… (R$/dia pelas operações)</h3><div class="tw" style="max-height:340px"><table class="t"><thead><tr><th class="l">Entradas até</th><th>R$/dia</th><th>1ª metade</th><th>2ª metade</th><th>Ops</th></tr></thead><tbody>`;
    for (const z of a.hor) t += `<tr style="${z === mh ? 'font-weight:700' : ''}"><td class="l">${F.hora(z.H)}</td><td class="${F.cls(z.dia)}">${F.n0(z.dia)}</td><td class="${F.cls(z.h1)}">${F.n0(z.h1)}</td><td class="${F.cls(z.h2)}">${F.n0(z.h2)}</td><td>${z.n}</td></tr>`;
    t += `<tr><td class="l">sem corte</td><td>${F.n0(a.opsBase.dia)}</td><td>${F.n0(a.opsBase.h1)}</td><td>${F.n0(a.opsBase.h2)}</td><td></td></tr></tbody></table></div>`;
    $('dtHr').innerHTML = t;
    a.melhorMP = melhor; a.melhorH = mh;
  }
  function diagnostico(r, d, o, ops, a, at) {
    const rob = P.ROB[r], li = [];
    if (d.n < 20) li.push(`<b>Amostra pequena:</b> ${d.n} pregões. Pela regra, não mudar nada antes de 20.`);
    const cV = ops.filter(t => t.mae >= 0 && t.mfe >= 0 && t.liq > 0), cL = ops.filter(t => t.mae >= 0 && t.mfe >= 0 && t.liq < 0);
    if (cV.length >= 10 && cL.length >= 5) { const X = M.pctl(cV.map(t => t.mae), 0.9); const big = cL.filter(t => t.mae > X), Y = 100 * big.length / cL.length;
      const efeito = t => (-X * at.vp * Math.max(1, t.ct) - t.custo) - t.liq;
      const econ = M.sum(big.map(efeito)), vMais = cV.filter(t => t.mae > X), custoV = M.sum(vMais.map(efeito)), liqEf = econ + custoV;
      if (Y >= 30 && liqEf > 0) li.push(`<b>Stop folgado:</b> 90% das vencedoras foram contra no máximo ${F.n0(X)} pts. Stop em ${F.n0(X)} pts cortaria ${F.pct(Y)} das perdedoras (≈ ${F.brl(econ)} a menos de perda) e viraria perda ${vMais.length} vencedoras (${F.brl(custoV)}): efeito líquido ≈ ${F.sbrl(liqEf)}. Conta aproximada: não considera a operação que viria depois.`); }
    if (o.captura < 40 && o.pctPerdLucro >= 30) { const Z = M.med(cL.filter(t => t.mfe > 0).map(t => t.mfe)); li.push(`<b>Saída deixa dinheiro:</b> captura ${F.pct(o.captura)} do movimento a favor e ${F.pct(o.pctPerdLucro)} das perdedoras estiveram no lucro. Considere breakeven ou trailing a partir de ${F.n0(Z)} pts.`); }
    if (rob.mt > 0) { const a2 = ops.filter(t => t.antes >= rob.mt / 2); if (a2.length >= 20 && M.mean(a2.map(t => t.liq)) < 0) li.push(`<b>Meta alta:</b> operações feitas com o robô já em ≥ metade da meta perdem em média ${F.brl(M.mean(a2.map(t => t.liq)), 2)} (${a2.length} ops). Reduzir a meta.`); }
    if (rob.pd > 0) { const a2 = ops.filter(t => t.antes <= -rob.pd / 2); if (a2.length >= 20 && M.mean(a2.map(t => t.liq)) < 0) li.push(`<b>Perda larga:</b> operações feitas com o robô já em ≤ −metade da perda perdem em média ${F.brl(M.mean(a2.map(t => t.liq)), 2)} (${a2.length} ops): tentar recuperar piora. Reduzir a perda diária.`); }
    if (rob.mt > 0 || rob.pd > 0) { const v = ops.filter(t => (rob.mt > 0 && t.antes >= rob.mt) || (rob.pd > 0 && t.antes <= -rob.pd)); if (v.length) li.push(`<b>Trava violada:</b> ${v.length} operações abriram com o dia já além da meta/perda da Aba Risco. Conferir a configuração (a trava pode contar só o resultado fechado, ou estava desligada em alguns dias).`); }
    if (a.melhorMP && a.melhorMP.dia > a.base.dia + 5 && !a.melhorMP.atual) li.push(`<b>Meta/perda:</b> meta ${a.melhorMP.M} / perda ${a.melhorMP.P} daria ${F.n0(a.melhorMP.dia)}/dia contra ${F.n0(a.base.dia)} hoje, com as 2 metades positivas (${F.n0(a.melhorMP.h1)} | ${F.n0(a.melhorMP.h2)}). Simulação otimista.`);
    if (a.melhorH && a.melhorH.dia > a.opsBase.dia + 5) li.push(`<b>Horário:</b> só abrir até ${F.hora(a.melhorH.H)} daria ${F.n0(a.melhorH.dia)}/dia contra ${F.n0(a.opsBase.dia)} (metades ${F.n0(a.melhorH.h1)} | ${F.n0(a.melhorH.h2)}).`);
    for (const b of a.bloq) li.push(`<b>Bloquear horário:</b> entradas das ${F.hora(b.m)} às ${F.hora(b.m + 29)} perderam ${F.brl(b.s)} (${b.n} ops), negativas nas duas metades. Considere não abrir nesse intervalo.`);
    if (d.nAmplo >= 5 && d.nEstr >= 5 && Math.abs(d.deltaReg) >= 80) li.push(`<b>Regime:</b> R$/dia com A10 amplo ${F.n0(d.amplo)} (${d.nAmplo} dias) × estreito ${F.n0(d.estreito)} (${d.nEstr} dias).${Math.sign(d.amplo) !== Math.sign(d.estreito) ? ' Candidato a ligar/pausar pelo A10, como o Diver real.' : ''}`);
    if (o.maxCt > 5) li.push(`<b>Contratos:</b> chegou a ${o.maxCt} contratos numa operação; a conta real tem limite de 5.`);
    if (o.n && o.liq > 0 && o.saldoTick <= 0) li.push(`<b>Frágil a slippage:</b> com 1 tick contra na entrada e na saída o saldo vira ${F.brl(o.saldoTick)}.`);
    if (d.semMelhor <= 0 && d.tot > 0) li.push(`<b>Resultado concentrado:</b> sem o melhor dia (${F.brl(d.best)}) o robô fica em ${F.brl(d.semMelhor)}.`);
    $('dtDiag').innerHTML = li.length ? li.map(s => `<li>${s}</li>`).join('') : '<li>Nada a apontar com os dados do filtro.</li>';
  }
  function relatorio(host, ops, d, r) {
    const T = M.operacoes(ops), C = M.operacoes(ops.filter(t => t.lado > 0)), V = M.operacoes(ops.filter(t => t.lado < 0));
    // declínio topo-fundo com a curva intradiária (perda em aberto)
    let E = 0, Pk = 0, ddTF = 0; d.idx.forEach((di, i) => { const c = (P.D.intra[di] || {})[r]; const pts = c ? c : []; for (const v of pts) { const e = E + v; if (e > Pk) Pk = e; if (Pk - e > ddTF) ddTF = Pk - e; }
      const em = E + P.RES[r].mn[di]; if (Pk - em > ddTF) ddTF = Pk - em; E += d.v[i]; if (E > Pk) Pk = E; });
    const pctS = (v, z) => z.liq > 0 ? ` (${F.pct(100 * v / z.liq, 2)} do saldo)` : '';
    const L = [['Saldo líquido total', z => F.brl(z.liq, 2)], ['Saldo total (antes dos custos)', z => F.brl(z.saldoBruto, 2)], ['Lucro bruto', z => F.brl(z.gB, 2)], ['Prejuízo bruto', z => F.brl(-z.gP, 2)], ['Fator de lucro', z => inf(z.gPF) || F.n2(z.gPF)], ['Custos', z => F.brl(-z.custo, 2)], null,
      ['Nº total de operações', z => F.n0(z.n)], ['% operações vencedoras', z => F.pct(z.gAcerto, 2)], ['Operações vencedoras', z => F.n0(z.gNG)], ['Operações perdedoras', z => F.n0(z.gNL)], ['Operações zeradas', z => F.n0(z.gNZ)], null,
      ['Média de lucro/prejuízo (líquida)', z => F.brl(z.exp, 2)], ['Média das vencedoras', z => F.brl(z.gMG, 2)], ['Média das perdedoras', z => F.brl(z.gML, 2)], ['Razão média lucro:média prejuízo', z => F.n2(z.gPayoff)], ['Maior operação vencedora', z => F.brl(z.gMaxG, 2)], ['Maior operação perdedora', z => F.brl(z.gMaxL, 2)],
      ['Maior sequência vencedora', z => F.n0(z.gSeqG)], ['Maior sequência perdedora', z => F.n0(z.gSeqL)], ['Tempo médio nas vencedoras', z => F.min(z.gDurG)], ['Tempo médio nas perdedoras', z => F.min(z.gDurL)], ['Tempo médio de operação', z => F.min(z.durMed)], null,
      ['Máximo de contratos', z => F.n0(z.maxCt)], ['Patrimônio necessário (maior perda)', z => F.brl(z.gDDTT, 2)], ['Retorno sobre o patrimônio necessário', z => z.gDDTT > 0 ? F.pct(100 * z.liq / z.gDDTT, 1) : '–'], ['Patrimônio máximo', z => F.brl(z.patrimMax, 2)],
      ['Declínio máximo topo ao fundo (operações)', z => F.brl(-z.gDDTF, 2) + pctS(z.gDDTF, z)], ['Declínio máximo trade a trade', z => F.brl(-z.gDDTT, 2) + pctS(z.gDDTT, z)], null,
      ['Fator de lucro líquido (após custos)', z => inf(z.pf) || F.n2(z.pf)], ['Payoff líquido', z => F.n2(z.payoff)], ['SQN', z => F.n2(z.sqn)], ['Expectativa com 1 tick de slippage', z => z.n ? F.brl(z.saldoTick / z.n, 2) : '–']];
    let h = `<div class="tw"><table class="t"><thead><tr><th class="l">Indicador</th><th>Total</th><th>Compra</th><th>Venda</th></tr></thead><tbody>`;
    for (const l of L) { if (!l) { h += '<tr><td colspan="4" style="border:none;height:6px"></td></tr>'; continue; } h += `<tr><td class="l">${l[0]}</td><td>${T.n ? l[1](T) : '–'}</td><td>${C.n ? l[1](C) : '–'}</td><td>${V.n ? l[1](V) : '–'}</td></tr>`; }
    h += `<tr><td class="l">Declínio com perda em aberto (curva de 10 min)</td><td>${F.brl(-ddTF)}${T.liq > 0 ? ` (${F.pct(100 * ddTF / T.liq, 1)} do saldo)` : ''}</td><td></td><td></td></tr>`;
    h += `<tr><td class="l">Queda máxima pelo fechamento diário</td><td>${F.brl(-d.dd)}</td><td></td><td></td></tr>`;
    h += `<tr><td class="l">Queda P95 (2.000 reamostragens dos dias)</td><td>${F.brl(-M.mcDD(d.v))}</td><td></td><td></td></tr></tbody></table></div>`;
    host.innerHTML = h;
  }

  /* ================= FAMÍLIAS (lista agrupada, como a tela de automações do Profit) ================= */
  R.familias = host => {
    const S = P.S, C = P.CTX, rows = linhas();
    if (!rows.length) { host.innerHTML = '<div class="vazio">Nenhum robô no filtro.</div>'; return; }
    S.abertos = S.abertos || []; S.grafs = S.grafs || [];
    const por = S.agrupar === 'ampla' ? 'ampla' : 'familia';
    const chave = x => por === 'ampla' ? (P.ROB[x.r].fa || x.fam) : x.fam;
    const ultimo = C.dias[C.dias.length - 1];
    const grupos = {}; rows.forEach(x => (grupos[chave(x)] = grupos[chave(x)] || []).push(x));
    const ops = {}; for (const o of C.opsF) (ops[o.r] = ops[o.r] || []).push(o);
    const G_ = Object.entries(grupos).map(([k, xs]) => {
      const rs = xs.map(x => x.r), idx = C.dias.filter(d => rs.some(r => !isNaN(P.RES[r].f[d])));
      const v = idx.map(d => { let s = 0; for (const r of rs) { const y = P.RES[r].f[d]; if (!isNaN(y)) s += y; } return s; });
      const d = M.serie(idx, v, v, v, {}), o = M.operacoes([].concat(...rs.map(r => ops[r] || [])));
      const ult = rs.reduce((s, r) => s + (isNaN(P.RES[r].f[ultimo]) ? 0 : P.RES[r].f[ultimo]), 0);
      return { k, xs, d, o, ult, nAt: xs.filter(x => P.ROB[x.r].at).length };
    });
    const ultR = x => isNaN(P.RES[x.r].f[ultimo]) ? null : P.RES[x.r].f[ultimo];
    const VAL = { nome: (z, g) => g ? z.k : z.nome, n: z => z.d.n, ops: z => z.o.n, assert: z => z.o.n ? z.o.gAcerto : null, pontos: z => z.o.n ? z.o.pontos : null, liq: z => z.o.liq,
      porDia: z => z.d.porDia, ult: (z, g) => g ? z.ult : ultR(z), dd: z => -z.d.dd };
    const st = S.famSort && VAL[S.famSort.k] ? S.famSort : { k: 'liq', d: -1 };
    const cmp = g => (a, b) => { const x = VAL[st.k](a, g), y = VAL[st.k](b, g); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * st.d; };
    G_.sort(cmp(true));
    const th = (k, t, l) => `<th class="${l ? 'l' : ''}" data-k="${k}" style="cursor:pointer">${t}${st.k === k ? ` <span class="seta">${st.d > 0 ? '▲' : '▼'}</span>` : ''}</th>`;
    const cel = (d, o, ult) => `<td>${F.n0(d.n)}</td><td>${F.n0(o.n)}</td><td>${o.n ? F.pct(o.gAcerto, 1) : '–'}</td><td class="${F.cls(o.pontos)}">${o.n ? F.n0(o.pontos) + ' pts' : '–'}</td>
      <td class="${F.cls(o.liq)}">${F.brl(o.liq)}</td><td class="${F.cls(d.porDia)}">${F.brl(d.porDia)}</td><td class="${ult == null ? 'mut' : F.cls(ult)}">${ult == null ? '–' : F.sbrl(ult)}</td>
      <td class="${d.dd > 0 ? 'neg' : ''}">${F.brl(-d.dd)}</td><td>${G.spark(d.v, 100, 22)}</td>`;
    const NC = 11;
    let h = `<div class="card"><div class="cab"><h2>Robôs por ${por === 'ampla' ? 'grupo amplo' : 'família (estratégia do Profit)'}</h2>
      <div class="ctrl">Agrupar por <select id="faPor"><option value="familia" ${por === 'familia' ? 'selected' : ''}>Família do Profit (estratégia)</option><option value="ampla" ${por === 'ampla' ? 'selected' : ''}>Grupo amplo (Diver, Pika4, Urano…)</option></select>
      <button class="btn" id="faAbre">Abrir todas</button><button class="btn" id="faFecha">Fechar todas</button></div></div>
      <div class="sub" style="margin-bottom:6px">Clique na família para ver os robôs; clique no robô (ou em 📈 da família) para abrir o gráfico aqui mesmo. Período e filtros vêm da faixa do topo. "Últ. pregão" = ${F.dataBrA(P.D.dias[ultimo])}.</div>
      <div class="tw" style="max-height:none"><table class="t fam"><thead><tr><th class="l" style="width:26px"></th>${th('nome', 'Nome', 1)}${th('n', 'Pregões')}${th('ops', 'Ops')}${th('assert', 'Assertividade')}${th('pontos', 'Pontos')}${th('liq', 'Saldo líquido')}${th('porDia', 'R$/dia')}${th('ult', 'Últ. pregão')}${th('dd', 'Queda máx')}<th>Curva</th></tr></thead><tbody>`;
    for (const g of G_) {
      const ab = S.abertos.includes(por + ':' + g.k), gk = 'g:' + por + ':' + g.k;
      h += `<tr class="fam-g" data-g="${F.esc(g.k)}"><td class="l">${ab ? '▾' : '▸'}</td><td class="l"><b>${F.esc(g.k)}</b> <span class="selo">${g.xs.length} robô${g.xs.length > 1 ? 's' : ''}${g.nAt < g.xs.length ? ` · ${g.xs.length - g.nAt} removido(s)` : ''}</span>
        <a class="fam-gbtn" data-gg="${F.esc(gk)}" title="gráfico da família">📈</a></td>${cel(g.d, g.o, g.ult)}</tr>`;
      if (S.grafs.includes(gk)) h += `<tr class="fam-graf"><td colspan="${NC}"><div id="fg_${hashId(gk)}"></div></td></tr>`;
      if (!ab) continue;
      for (const x of g.xs.slice().sort(cmp(false))) {
        const w = P.ROB[x.r].w, aberto = S.grafs.includes(w), ult = isNaN(P.RES[x.r].f[ultimo]) ? null : P.RES[x.r].f[ultimo];
        h += `<tr class="fam-r ${aberto ? 'sel' : ''}" data-w="${w}"><td class="l"></td><td class="l"><span class="fam-ind">${aberto ? '▾' : '▸'}</span> ${F.esc(x.nome)}${P.ROB[x.r].at ? '' : ' <span class="mut">(removido)</span>'} ${M.selosHtml(x.selos, true)}
          <div class="sub" style="padding-left:16px">${[P.ROB[x.r].g && P.ROB[x.r].g.split('/')[1] + ' min', P.ROB[x.r].mt > 0 && `meta ${F.n0(P.ROB[x.r].mt)} / perda ${F.n0(P.ROB[x.r].pd)}`, 'score ' + Math.round(x.score)].filter(Boolean).join(' · ')}</div></td>${cel(x.d, x.o, ult)}</tr>`;
        if (aberto) h += `<tr class="fam-graf"><td colspan="${NC}"><div id="fr_${w}"></div></td></tr>`;
      }
    }
    h += '</tbody></table></div></div>';
    host.innerHTML = h;
    host.querySelectorAll('table.fam th[data-k]').forEach(t => t.onclick = () => { const k = t.dataset.k; S.famSort = { k, d: st.k === k ? -st.d : (k === 'nome' ? 1 : -1) }; P.salvar(); R.familias(host); });
    $('faPor').onchange = e => { S.agrupar = e.target.value; P.salvar(); R.familias(host); };
    $('faAbre').onclick = () => { S.abertos = G_.map(g => por + ':' + g.k); P.salvar(); R.familias(host); };
    $('faFecha').onclick = () => { S.abertos = []; S.grafs = []; P.salvar(); R.familias(host); };
    host.querySelectorAll('tr.fam-g').forEach(tr => tr.onclick = e => { if (e.target.closest('.fam-gbtn')) return; const k = por + ':' + tr.dataset.g; S.abertos = S.abertos.includes(k) ? S.abertos.filter(z => z !== k) : [...S.abertos, k]; P.salvar(); R.familias(host); });
    host.querySelectorAll('.fam-gbtn').forEach(a => a.onclick = e => { e.stopPropagation(); const k = a.dataset.gg; S.grafs = S.grafs.includes(k) ? S.grafs.filter(z => z !== k) : [...S.grafs, k]; P.salvar(); R.familias(host); });
    host.querySelectorAll('tr.fam-r').forEach(tr => tr.onclick = e => { if (e.target.closest('a')) return; const w = tr.dataset.w; S.grafs = S.grafs.includes(w) ? S.grafs.filter(z => z !== w) : [...S.grafs, w]; P.salvar(); R.familias(host); });
    // gráficos inline
    for (const g of G_) { const gk = 'g:' + por + ':' + g.k; const el = $('fg_' + hashId(gk)); if (el) miniGraf(el, g.d, g.o, null, g.xs); }
    for (const g of G_) for (const x of g.xs) { const el = $('fr_' + P.ROB[x.r].w); if (el) miniGraf(el, x.d, x.o, x.r); }
  };
  function hashId(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); }
  function miniGraf(el, d, o, r, membros) {
    const lab = d.idx.map(i => P.D.dias[i]);
    el.innerHTML = `<div class="mini"><div class="mini-k">
        <div><span>Saldo líquido (operações)</span><b class="${F.cls(o.liq)}">${F.brl(o.liq)}</b></div>
        <div><span>Soma dos dias (Profit)</span><b class="${F.cls(d.tot)}">${F.brl(d.tot)}</b></div>
        <div><span>Pontos</span><b class="${F.cls(o.pontos)}">${o.n ? F.n0(o.pontos) : '–'}</b></div>
        <div><span>Operações · acerto</span><b>${F.n0(o.n)} · ${o.n ? F.pct(o.gAcerto, 1) : '–'}</b></div>
        <div><span>Fator de lucro</span><b>${o.n ? (inf(o.gPF) || F.n2(o.gPF)) : '–'}</b></div>
        <div><span>% dias positivos</span><b>${F.pct(d.pctPos)}</b></div>
        <div><span>Melhor · pior dia</span><b>${F.n0(d.best)} · <span class="neg">${F.n0(d.worst)}</span></b></div>
        <div><span>Metades · últ. 10</span><b>${F.n0(d.h1)} · ${F.n0(d.h2)} · ${F.n0(d.u10)}</b></div>
        ${r != null ? `<div><a data-robo="${r}" class="btn" style="text-align:center">Abrir detalhe completo ›</a></div>` : ''}
      </div><div class="mini-g"><div class="mini-acum"></div><div class="mini-bar"></div></div></div>`;
    const tip = i => `<b>${F.dataBrA(lab[i])}</b><div class="linha"><span>Dia</span><span>${F.sbrl(d.v[i])}</span></div><div class="linha"><span>Acumulado</span><span>${F.brl(d.E[i])}</span></div>`;
    G.line(el.querySelector('.mini-acum'), { labels: lab, series: [{ name: 'Acumulado', color: 'var(--s1)', vals: d.E }], h: 170, fmtX: F.dataBr, tip, onClick: i => { P.S.dia = d.idx[i]; P.abrirAba('dia'); } });
    G.bars(el.querySelector('.mini-bar'), { labels: lab, vals: d.v, h: 130, fmtX: F.dataBr, tip, onClick: i => { P.S.dia = d.idx[i]; P.abrirAba('dia'); } });
    P.ligarNomes(el);
  }

  /* ================= CARTEIRA ================= */
  R.carteira = host => {
    const C = P.CTX, rows = linhas().slice().sort((a, b) => b.score - a.score);
    if (rows.length < 2) { host.innerHTML = '<div class="vazio">Precisa de pelo menos 2 robôs no filtro.</div>'; return; }
    const top = rows.slice(0, 30);
    host.innerHTML = `<div class="card"><div class="cab"><h2>Top N pelo score</h2><span class="sub">soma dos N melhores · "fora da amostra" = escolhe pelo score da 1ª metade dos pregões e mede na 2ª (o número honesto)</span></div><div id="ctTop"></div></div>
      <div class="card"><div class="cab"><h2>Correlação diária entre robôs</h2><span class="sub" id="ctNef"></span></div><div id="ctCor"></div><div id="ctPares" style="margin-top:8px"></div></div>
      <div class="grid2"><div class="card"><div class="cab"><h2>Quem fez a queda máxima da carteira</h2><span class="sub" id="ctDDtxt"></span></div><div id="ctDD"></div></div>
      <div class="card"><h2>Por família</h2><div id="ctFam"></div></div></div>
      <div class="grid2"><div class="card"><div class="cab"><h2>Regime: quem carrega no mercado estreito</h2><span class="sub" id="ctRegTxt"></span></div><div id="ctReg"></div></div>
      <div class="card"><div class="cab"><h2>Piores dias da carteira</h2><span class="sub">e a maior perda em aberto somando as curvas de 10 min</span></div><div id="ctPior"></div></div></div>`;
    topN(rows);
    correl(top);
    contribDD(rows);
    familias(rows);
    regime(rows);
    piores(rows);
  };
  const serieSoma = (rs, dias) => dias.map(d => { let s = 0, n = 0; for (const r of rs) { const v = P.RES[r].f[d]; if (!isNaN(v)) { s += v; n++; } } return n ? s : 0; });
  const ddDe = v => { let E = 0, pk = 0, dd = 0; for (const x of v) { E += x; if (E > pk) pk = E; if (pk - E > dd) dd = pk - E; } return dd; };
  function topN(rows) {
    const C = P.CTX, dias = C.dias, h = Math.floor(dias.length / 2), d1 = dias.slice(0, h), d2 = dias.slice(h);
    const by = {}; for (const o of C.opsF) (by[o.r] = by[o.r] || []).push(o);
    const r1 = M.pontuar(C.robos.map(r => M.linha(r, d1, (by[r] || []).filter(o => o.d < (d2[0] == null ? 1e9 : d2[0]))))).filter(x => x.n).sort((a, b) => b.score - a.score);
    const out = []; for (let N = 1; N <= Math.min(15, rows.length); N++) {
      const rs = rows.slice(0, N).map(x => x.r), v = serieSoma(rs, dias), tot = M.sum(v), dd = ddDe(v);
      const mp = dias.map(d => M.sum(rs.map(r => isNaN(P.RES[r].mp[d]) ? 0 : P.RES[r].mp[d])));
      const oos = r1.slice(0, N).map(x => x.r), v2 = serieSoma(oos, d2);
      out.push({ N, nomes: rows.slice(0, N).map(x => x.nome).join(', '), dia: tot / dias.length, dd, recup: dd > 0 ? tot / dd : Infinity, pos: 100 * v.filter(x => x > 0).length / v.length, mc: M.mcDD(v, 1000), mp95: M.pctl(mp, 0.95), mpMax: Math.max(...mp), oos: d2.length ? M.sum(v2) / d2.length : NaN, oosNomes: r1.slice(0, N).map(x => x.nome).join(', ') }); }
    P.tabela($('ctTop'), 'ctTop', [{ k: 'N', t: 'N', f: F.n0, title: 'quantos robôs (os N de maior score)' }, { k: 'dia', t: 'R$/pregão', f: v => F.brl(v), cor: 1 }, { k: 'oos', t: 'Fora da amostra', f: v => F.brl(v), cor: 1, title: 'top N escolhido pelo score da 1ª metade, resultado R$/pregão na 2ª metade' },
      { k: 'dd', t: 'Queda máx', f: v => F.brl(-v), cls: () => 'neg' }, { k: 'mc', t: 'Queda P95', f: v => F.brl(-v), cls: () => 'neg', title: 'P95 da queda em 1.000 reamostragens dos dias' }, { k: 'recup', t: 'Recuperação', f: fx(F.n2) }, { k: 'pos', t: '% dias +', f: v => F.pct(v) },
      { k: 'mp95', t: 'Ctt somados P95', f: F.n0, title: 'soma das posições máximas do dia (P95). Conta real: 5' }, { k: 'mpMax', t: 'Ctt somados máx', f: F.n0, cls: v => v > 5 ? 'neg' : '' }, { k: 'nomes', t: 'Robôs', l: 1, f: v => `<span class="sub" title="${F.esc(v)}">${F.esc(v.length > 70 ? v.slice(0, 69) + '…' : v)}</span>` }], out, { sort: { k: 'N', d: 1 } });
  }
  function correl(top) {
    const C = P.CTX, n = top.length, rho = [];
    for (let i = 0; i < n; i++) { rho.push([]); for (let j = 0; j < n; j++) { if (i === j) { rho[i].push(1); continue; } if (j < i) { rho[i].push(rho[j][i]); continue; }
      const a = [], b = []; for (const d of C.dias) { const x = P.RES[top[i].r].f[d], y = P.RES[top[j].r].f[d]; if (!isNaN(x) && !isNaN(y)) { a.push(x); b.push(y); } }
      if (a.length < 15) { rho[i].push(null); continue; } const ma = M.mean(a), mb = M.mean(b); let sab = 0, sa = 0, sb = 0; for (let k = 0; k < a.length; k++) { sab += (a[k] - ma) * (b[k] - mb); sa += (a[k] - ma) ** 2; sb += (b[k] - mb) ** 2; } rho[i].push(sa > 0 && sb > 0 ? sab / Math.sqrt(sa * sb) : null); } }
    let sr = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) sr += rho[i][j] == null ? 0 : rho[i][j];
    $('ctNef').textContent = `${n} robôs de maior score · N efetivo = ${F.n1(n * n / sr)} (quantos robôs independentes a carteira equivale) · pares com < 15 dias em comum ficam vazios`;
    const ord = top.map((x, i) => i).sort((a, b) => (top[a].fam + top[a].nome).localeCompare(top[b].fam + top[b].nome));
    let h = `<div class="tw" style="max-height:70vh"><table class="heat"><thead><tr><th></th>${ord.map(i => `<th class="dia" title="${F.esc(top[i].nome)}">${F.esc(top[i].nome.slice(0, 14))}</th>`).join('')}</tr></thead><tbody>`;
    for (const i of ord) { h += `<tr><td class="r" data-robo="${top[i].r}">${F.esc(top[i].nome)}</td>`; for (const j of ord) { const v = rho[i][j]; h += v == null ? '<td class="c na"></td>' : `<td class="c" style="background:color-mix(in oklab, ${v < 0 ? 'var(--neg)' : 'var(--pos)'} ${Math.round(Math.abs(v) * 100)}%, var(--neutral))" title="${F.esc(top[i].nome)} × ${F.esc(top[j].nome)}: ${F.n2(v)}"></td>`; } h += '</tr>'; }
    h += '</tbody></table></div><div class="escala" style="margin-top:6px"><span>−1</span><span class="gr"></span><span>+1</span><span>· azul = andam juntos (redundantes), vermelho = se compensam</span></div>';
    $('ctCor').innerHTML = h; $('ctCor').querySelectorAll('td.r').forEach(td => td.onclick = () => P.abrirRobo(+td.dataset.robo));
    const pares = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rho[i][j] > 0.6) pares.push({ a: top[i].nome, b: top[j].nome, v: rho[i][j] });
    $('ctPares').innerHTML = pares.length ? '<h3>Pares redundantes (ρ > 0,6): rodar os dois quase dobra o mesmo risco</h3>' + pares.sort((x, y) => y.v - x.v).slice(0, 15).map(p => `<span class="selo warn"><i>≈</i>${F.esc(p.a)} × ${F.esc(p.b)} ${F.n2(p.v)}</span>`).join(' ') : '<div class="sub">Nenhum par com correlação acima de 0,6.</div>';
  }
  function contribDD(rows) {
    const C = P.CTX, rs = rows.map(x => x.r), v = serieSoma(rs, C.dias); let E = 0, pk = 0, ipk = 0, dd = 0, a = 0, b = 0; v.forEach((x, i) => { E += x; if (E > pk) { pk = E; ipk = i; } if (pk - E > dd) { dd = pk - E; a = ipk; b = i; } });
    if (dd <= 0) { $('ctDD').innerHTML = '<div class="vazio">A carteira não teve queda no período.</div>'; return; }
    const jan = C.dias.slice(a + 1, b + 1);
    $('ctDDtxt').textContent = `queda de ${F.brl(dd)} entre ${F.dataBrA(P.D.dias[C.dias[a]])} e ${F.dataBrA(P.D.dias[C.dias[b]])}`;
    const out = rows.map(x => { const s = M.sum(jan.map(d => isNaN(P.RES[x.r].f[d]) ? 0 : P.RES[x.r].f[d])); const sem = ddDe(serieSoma(rs.filter(r => r !== x.r), C.dias)); return { r: x.r, nome: x.nome, s, pct: -100 * s / dd, marg: dd - sem }; });
    P.tabela($('ctDD'), 'ctDD', [{ k: 'nome', t: 'Robô', l: 1, nome: 1, html: z => P.linkRobo(z.r) }, { k: 's', t: 'R$ na janela', f: v => F.sbrl(v), cor: 1 }, { k: 'pct', t: '% da queda', f: v => F.pct(v), title: 'quanto do tombo veio deste robô (negativo = ajudou a segurar)' },
      { k: 'marg', t: 'Queda marginal', f: v => F.sbrl(-v), cor: 1, title: 'queda da carteira − queda da carteira sem este robô (positivo aqui = tirar o robô reduz a queda)' }], out, { sort: { k: 's', d: 1 }, maxH: '360px', depois: P.ligarNomes });
  }
  function familias(rows) {
    const C = P.CTX, fams = {}; rows.forEach(x => (fams[x.fam] = fams[x.fam] || []).push(x));
    const totAll = M.sum(rows.map(x => x.tot));
    const out = Object.entries(fams).map(([f, xs]) => { const v = serieSoma(xs.map(x => x.r), C.dias), tot = M.sum(v), dr = M.sum(xs.map(x => x.n));
      return { f, n: xs.length, tot, porDR: tot / Math.max(1, dr), dd: ddDe(v), pct: totAll ? 100 * tot / Math.abs(totAll) : NaN }; });
    P.tabela($('ctFam'), 'ctFam', [{ k: 'f', t: 'Família', l: 1 }, { k: 'n', t: 'Robôs', f: F.n0 }, { k: 'tot', t: 'Total', f: v => F.brl(v), cor: 1 }, { k: 'porDR', t: 'R$/dia-robô', f: v => F.brl(v), cor: 1 }, { k: 'dd', t: 'Queda da família', f: v => F.brl(-v), cls: () => 'neg' }, { k: 'pct', t: '% do total', f: v => F.pct(v) }], out, { sort: { k: 'tot', d: -1 } });
  }
  function regime(rows) {
    const C = P.CTX, am = C.dias.filter(d => P.DIA[d].a10 >= 3000), es = C.dias.filter(d => P.DIA[d].a10 != null && P.DIA[d].a10 < 3000), rs = rows.map(x => x.r);
    $('ctRegTxt').textContent = `carteira: ${F.brl(M.mean(serieSoma(rs, am)))}/pregão no amplo (${am.length}) × ${F.brl(M.mean(serieSoma(rs, es)))} no estreito (${es.length})`;
    const out = rows.map(x => ({ r: x.r, nome: x.nome, est: x.d.estreito, nE: x.d.nEstr, amp: x.d.amplo, nA: x.d.nAmplo }));
    P.tabela($('ctReg'), 'ctReg', [{ k: 'nome', t: 'Robô', l: 1, nome: 1, html: z => P.linkRobo(z.r) }, { k: 'est', t: 'R$/dia estreito', f: v => F.brl(v), cor: 1 }, { k: 'nE', t: 'dias', f: F.n0 }, { k: 'amp', t: 'R$/dia amplo', f: v => F.brl(v), cor: 1 }, { k: 'nA', t: 'dias', f: F.n0 }], out, { sort: { k: 'est', d: -1 }, maxH: '360px', depois: P.ligarNomes });
  }
  function piores(rows) {
    const C = P.CTX, rs = rows.map(x => x.r), v = serieSoma(rs, C.dias);
    const out = C.dias.map((d, i) => { const intra = P.D.intra[d] || {}; let minAb = null; if (Object.keys(intra).length) { for (let k = 0; k < P.D.grade.length; k++) { let s = 0; for (const r of rs) if (intra[r]) s += intra[r][k]; if (minAb == null || s < minAb) minAb = s; } }
      const cs = rs.map(r => ({ r, v: P.RES[r].f[d] })).filter(z => !isNaN(z.v)).sort((a, b) => a.v - b.v).slice(0, 3);
      return { d, data: P.D.dias[d], tot: v[i], minAb, quem: cs.map(z => `${P.ROB[z.r].n} ${F.n0(z.v)}`).join(' · '), a10: P.DIA[d].a10 }; });
    P.tabela($('ctPior'), 'ctPior', [{ k: 'data', t: 'Dia', l: 1, f: v => F.dataBrA(v) }, { k: 'tot', t: 'Carteira', f: v => F.sbrl(v), cor: 1 }, { k: 'minAb', t: 'Pior em aberto', f: v => F.brl(v), cor: 1, title: 'menor valor da soma das curvas de 10 min: capital que a carteira precisa aguentar' },
      { k: 'a10', t: 'A10', f: F.n0 }, { k: 'quem', t: 'Maiores perdas', l: 1, f: v => `<span class="sub">${F.esc(v)}</span>` }], out, { sort: { k: 'tot', d: 1 }, limite: 8 });
  }
  window.Ind = { linhas, ddDe, serieSoma };
})();

/* ================= DECISÃO: o que levar para a conta real (24/11/2026) =================
   Um robô por linha (só simulador). Ganho, perda, queda máxima, recuperação, capital sugerido e veredito.
   R$/dia "real" = R$/dia − 1 tick (5 pts WIN) contra na entrada e na saída de cada contrato.
   24/11 (pedido do usuário: "margem com base no rebaixamento do robô", margem da corretora não importa):
   rebaixamento de referência = maior(rebaixamento máx histórico, rebaixamento P95 projetado em 60 pregões);
   capital = rebaixamento de referência ÷ % da conta que se aceita perder nele (padrão 30%). */
(function () {
  /* ======== Aba Decisão (25/11: refeita para decidir, não para explorar) ========
     - UMA fonte de veredito: o parecer diário (PARECER_robos.csv -> D.par). O painel não tem regra própria.
     - Histórico inteiro, sem os filtros (os filtros valem para as abas de análise).
     - Ordem: conta real -> o que fazer -> candidatos -> em teste -> deletar -> plano de crescimento -> análise completa (fechada). */
  const P = window.P, F = G.F, R = P.R, $ = P.$, D = P.D;
  const base = n => n.replace(/\s*·\s*REAL$/, '');
  const VER = { pronto: { t: 'Pronto p/ real', c: 'good', i: '✓', o: 4, cor: 'var(--good)' }, observar: { t: 'Observar', c: 'warn', i: '…', o: 3, cor: 'var(--warning)' }, teste: { t: 'Em teste', c: 'info', i: '◷', o: 2, cor: 'var(--muted)' }, nao: { t: 'Não levar', c: 'bad', i: '✕', o: 1, cor: 'var(--critical)' } };
  const TODOS = P.DIA.map(d => d.i), ULT = TODOS[TODOS.length - 1];
  const PAR = {}; if (D.par) for (const p of D.par.rob) PAR[p.W] = p;
  const isoDir = s => s ? s.replace(/_/g, '-') : null;   // nome da pasta do diário: 2026-11-25
  const dPar = D.par ? F.dataBr(isoDir(D.par.dia)) : null;
  const num = s => s === '' || s == null ? NaN : +s;
  const bonito = s => (s || '').replace(/\s*\(precisa ~[-–—]? ?pregoes\)/g, '').replace(/pregoes/g, 'pregões').replace(/ult\. 20 negativo/g, 'últimos 20 negativos').replace(/passa em tudo/g, 'passa em todos os critérios').replace(/(\d)\.(\d)/g, '$1,$2');
  // queda P95 projetada: 1.000 sorteios de 60 pregões (com reposição) dos resultados diários; semente fixa
  function quedaP95(v, H = 60, it = 1000) {
    let seed = 987654321; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const out = new Float64Array(it); for (let k = 0; k < it; k++) { let E = 0, pk = 0, dd = 0; for (let i = 0; i < H; i++) { E += v[Math.floor(rnd() * v.length)]; if (E > pk) pk = E; if (pk - E > dd) dd = pk - E; } out[k] = dd; }
    return M.pctl(Array.from(out), 0.95);
  }
  function cfg() { const S = P.S; if (!S.dec) S.dec = {}; const c = S.dec; if (c.pct == null) c.pct = 30; if (c.cap == null) c.cap = ''; delete c.margem; delete c.folga; return c; }
  // carteira de um conjunto: R$/dia somado; rebaixamento = maior(histórico, P95) da soma diária nos pregões em que TODOS rodaram
  function conjunto(xs, c) {
    const rs = xs.map(x => x.r), dc = TODOS.filter(d => rs.every(r => !isNaN(P.RES[r].f[d])));
    const v = Ind.serieSoma(rs, dc), dd = Ind.ddDe(v), p95 = dc.length >= 10 ? quedaP95(v) : NaN;
    const rb = dc.length >= 10 ? Math.max(dd, p95) : M.sum(xs.map(x => x.rb));
    return { xs, rs, dc, v, dd, p95, rb, comum: dc.length, real: M.sum(xs.map(x => x.real)), ct: M.sum(xs.map(x => x.ct)), capital: rb / (c.pct / 100) };
  }
  function plano(pr, c) {
    const et = []; let set = [], rest = pr.slice();
    while (rest.length) { const ant = et.length ? et[et.length - 1] : { real: 0, capital: 0 }; let best = null;
      for (const x of rest) { const cj = conjunto(set.concat([x]), c); if (cj.ct > 5) continue;
        const sc = cj.capital <= ant.capital ? 1e9 + cj.real : (cj.real - ant.real) / (cj.capital - ant.capital); if (!best || sc > best.sc) best = { x, cj, sc }; }
      if (!best) break; set = set.concat([best.x]); rest = rest.filter(y => y !== best.x); best.cj.add = best.x; et.push(best.cj); }
    et.forEach((e, i) => { if (!i) return; const a = et[i - 1]; e.falta = Math.max(0, e.capital - a.capital); e.dias = a.real > 0 ? e.falta / a.real : Infinity; });
    return { et, fora: rest };
  }
  // uma linha por robô do simulador que está no Profit hoje; números e veredito do parecer, série diária do painel
  function avaliar(r, c) {
    const rob = P.ROB[r], x = M.linha(r, TODOS, P.OPS_R[r]), d = x.d, o = x.o;
    if (!d.n) return null;
    const p = PAR[rob.w], slipP = o.n ? (o.liq - o.saldoTick) / d.n : 0;
    const p95c = d.n >= 10 ? quedaP95(d.v) : NaN;
    const z = p ? { fonte: 'parecer', ver: p.Ver, motivo: bonito(p.Motivo), n: +p.N, real: num(p.RsDia), u10: num(p.U10), u20: num(p.U20), mes: num(p.Mes), m1: num(p.M1), m2: num(p.M2), amplo: num(p.Amplo), estreito: num(p.Estreito), na: +p.NA, ne: +p.NE,
      t: num(p.T), nt2: num(p.NT2), queda: num(p.Queda), p95: num(p.P95), pior: num(p.Pior), ct: +p.Ct || 1, alav: p.Alavanca && !/nada robusto/.test(p.Alavanca) ? p.Alavanca : '', fam: p.Fam || rob.f }
      : { fonte: 'painel', ver: d.n < 20 ? 'teste' : (d.porDia - slipP) <= 0 ? 'nao' : 'observar', motivo: 'fora do parecer de hoje (cálculo do painel)', n: d.n, real: d.porDia - slipP, u10: d.u10, u20: M.mean(d.v.slice(-20)), mes: NaN, m1: d.h1, m2: d.h2, amplo: NaN, estreito: NaN, na: 0, ne: 0,
      t: d.tdia, nt2: NaN, queda: d.dd, p95: p95c, pior: d.worst, ct: Math.max(1, o.n ? o.maxCt : (d.mp || 1)), alav: '', fam: rob.f };
    const rb = Math.max(isFinite(z.queda) ? z.queda : d.dd, isFinite(z.p95) ? z.p95 : 0);
    const capital = rb > 0 ? rb / (c.pct / 100) : NaN;
    return Object.assign(z, { r, nome: rob.n, x, d, o, bruto: d.porDia, slip: slipP, pctPos: d.pctPos, mPos: d.mPos, mNeg: d.mNeg, worst: d.worst, dd: d.dd, recup: d.dd <= 0 ? 0 : d.diasRecup != null ? d.diasRecup : null, submAtual: d.submersoAtual,
      dataFundo: d.iFundo >= 0 ? P.D.dias[d.idx[d.iFundo]] : null, rb, capital, retMes: capital > 0 && z.n >= 20 ? 100 * 21 * z.real / capital : NaN, diasGanho: z.real > 0 ? d.dd / z.real : Infinity });
  }
  let cache = { k: '', rows: null };
  function linhasDec() {
    const c = cfg(), k = String(c.pct); if (cache.k === k) return cache.rows;
    const rows = P.ROB.filter(r => r.tc !== 'Real' && r.at).map(r => avaliar(r.i, c)).filter(Boolean);
    // "na real" = está HOJE no Strategies.dat do Profit_Euro (at = 1); quem rodou e saiu = "saiu da real"
    const naReal = new Set(P.ROB.filter(r => r.tc === 'Real' && r.at).map(r => base(r.n))), saiu = new Set(P.ROB.filter(r => r.tc === 'Real' && !r.at).map(r => base(r.n)));
    rows.forEach(x => { x.naReal = naReal.has(x.nome); x.saiuReal = !x.naReal && saiu.has(x.nome); });
    cache = { k, rows }; return rows;
  }
  window.Dec = { linhasDec, VER };
  const tipVer = x => [`${VER[x.ver].t} (${x.fonte === 'parecer' ? 'parecer de ' + dPar : 'cálculo do painel'})`, x.motivo, `metades ${F.n0(x.m1)} / ${F.n0(x.m2)} por dia`,
    isFinite(x.amplo) || isFinite(x.estreito) ? `mercado amplo ${F.n0(x.amplo)} (${x.na} dias) · estreito ${F.n0(x.estreito)} (${x.ne} dias)` : '', isFinite(x.t) ? `t ${F.n2(x.t)}${isFinite(x.nt2) ? ' · precisa de ~' + F.n0(x.nt2) + ' pregões para t 2' : ''}` : '', `até ${x.ct} contrato(s) (conta real: 5)`].filter(Boolean).join('\n');
  const verHtml = x => { const v = VER[x.ver]; return `<span class="selo ${v.c}" title="${F.esc(tipVer(x))}"><i>${v.i}</i>${v.t}</span><div class="sub" style="font-size:11px;max-width:230px;white-space:normal">${F.esc(x.motivo)}</div>`; };
  const marcaReal = x => x.naReal ? ' <span class="selo info" title="está hoje na conta real (Strategies.dat do Profit_Euro)"><i>●</i>na real</span>' : x.saiuReal ? ' <span class="selo" title="já rodou na conta real e foi removido de lá"><i>○</i>saiu da real</span>' : '';
  const nomeHtml = x => P.linkRobo(x.r) + marcaReal(x) + `<div class="sub" style="font-size:11px">${F.esc(x.fam || '')}</div>`;
  const recHtml = x => x.dd <= 0 ? '<span class="sub">sem rebaixamento</span>' : x.recup != null ? `${x.recup} pregões` : `<span class="neg">não voltou</span> <span class="sub">(há ${x.submAtual})</span>`;
  // dia útil n pregões à frente (pula sábado e domingo; feriados não)
  const diaUtil = (iso, n) => { const t = new Date(iso + 'T12:00:00'); let k = 0; while (k < n) { t.setDate(t.getDate() + 1); const w = t.getDay(); if (w && w < 6) k++; } return t.toISOString().slice(0, 10); };
  const selAcao = a => /delet|exclu/i.test(a) ? 'bad' : /testar|reavaliar/i.test(a) ? 'info' : /conferir|deixar|reduzir|tirar|pausad/i.test(a) ? 'warn' : '';

  // ---------- conta real: um robô por linha, com o mesmo robô do simulador nos mesmos dias ----------
  function contaReal() {
    return P.ROB.filter(r => r.tc === 'Real').map(ro => { const r = ro.i, dr = TODOS.filter(d => !isNaN(P.RES[r].f[d])); if (!dr.length) return null;
      const vals = dr.map(d => P.RES[r].f[d]), manual = /^MANUAL/.test(ro.n);
      const sim = manual ? null : P.ROB.filter(s => s.tc !== 'Real' && s.n === base(ro.n)).sort((a, b) => b.at - a.at)[0];
      const vs = sim ? M.sum(dr.map(d => isNaN(P.RES[sim.i].f[d]) ? 0 : P.RES[sim.i].f[d])) : NaN, vr = M.sum(vals);
      const p = sim ? PAR[sim.w] : null;
      return { r, ro, nome: ro.n, at: ro.at, manual, n: dr.length, vals, hoje: dr[dr.length - 1] === ULT ? vals[vals.length - 1] : NaN, u5: M.sum(vals.slice(-5)), vr, porDia: vr / dr.length, vs, dif: sim ? vr - vs : NaN,
        simHoje: sim && dr[dr.length - 1] === ULT && !isNaN(P.RES[sim.i].f[ULT]) ? P.RES[sim.i].f[ULT] : NaN, ver: p ? p.Ver : null, motivo: p ? bonito(p.Motivo) : '', primeiro: P.D.dias[dr[0]], ultimo: P.D.dias[dr[dr.length - 1]] }; }).filter(Boolean);
  }
  // ---------- o que fazer: ações do especialista (ACOES.csv); sem elas, as que saem direto do parecer ----------
  function acoes(rows, del) {
    if (D.acoes && D.acoes.itens.length) return { fonte: 'especialista', dia: isoDir(D.acoes.dia), itens: D.acoes.itens.slice().sort((a, b) => (+a.p || 9) - (+b.p || 9)) };
    const it = [];
    rows.filter(x => x.ver === 'pronto' && !x.naReal).forEach(x => it.push({ p: 2, r: x.nome, a: 'Candidato para a real', x: `${F.brl(x.real)}/dia com slippage, ${x.ct} contrato(s). Ver o plano de crescimento.` }));
    rows.filter(x => x.naReal && x.ver === 'nao').forEach(x => it.push({ p: 1, r: x.nome, a: 'Tirar da real', x: `o mesmo robô no simulador virou Não levar: ${x.motivo}` }));
    del.forEach(x => it.push({ p: 5, r: x.nome, a: 'Deletar do simulador', x: x.porque }));
    return { fonte: 'parecer', dia: D.par ? isoDir(D.par.dia) : null, itens: it.sort((a, b) => a.p - b.p) };
  }

  R.decisao = host => {
    const c = cfg(), rows = linhasDec(), reais = contaReal(), atuais = reais.filter(z => z.at), sairam = reais.filter(z => !z.at);
    const pr = rows.filter(x => x.ver === 'pronto'), ob = rows.filter(x => x.ver === 'observar'), te = rows.filter(x => x.ver === 'teste'), na = rows.filter(x => x.ver === 'nao');
    // deletar: Não levar com 20+ pregões; Observar fraco demais; Em teste já perdendo forte (t <= -2 com 3+ pregões)
    const del = rows.filter(x => !x.naReal).map(x => {
      if (x.n >= 20 && x.ver === 'nao') return Object.assign({ acao: 'Deletar', porque: x.motivo }, x);
      if (x.n >= 20 && x.ver === 'observar' && x.real < 25 && !(x.t >= 1)) return Object.assign({ acao: 'Pode deletar', porque: `só ${F.brl(x.real)}/dia com slippage, t ${F.n1(x.t)}: levaria ${isFinite(x.nt2) ? F.n0(x.nt2) : 'centenas de'} pregões para provar` }, x);
      if (x.n >= 3 && x.n < 20 && x.t <= -2) return Object.assign({ acao: 'Pode deletar', porque: `perdendo forte antes dos 20 pregões: ${F.brl(x.real)}/dia, t ${F.n1(x.t)}` }, x);
      return null; }).filter(Boolean);
    const ac = acoes(rows, del);
    const delSet = new Set(del.map(x => x.r));
    const cand = rows.filter(x => x.n >= 20 && (x.ver === 'pronto' || x.ver === 'observar') && !x.naReal && !delSet.has(x.r));
    const pl = plano(pr, c), cap = +c.cap > 0 ? +c.cap : null;
    const aqui = cap == null ? -1 : pl.et.reduce((k, e, i) => e.capital <= cap ? i : k, -1);
    const meses = d => !isFinite(d) ? '—' : d < 1 ? 'já' : `~${Math.ceil(d)} pregões (${F.n1(d / 21)} ${d / 21 >= 2 ? 'meses' : 'mês'})`;
    const soma = (xs, k) => M.sum(xs.map(z => isFinite(z[k]) ? z[k] : 0));
    // robôs da real (sem as operações manuais, que aparecem à parte)
    const atuaisR = atuais.filter(z => !z.manual), man = atuais.find(z => z.manual), hojeR = soma(atuaisR, 'hoje'), totR = soma(atuaisR, 'vr'), difR = soma(atuaisR, 'dif');
    const velho = ac.dia && D.par && ac.dia !== isoDir(D.par.dia);
    host.innerHTML = `
      <div class="sub" style="margin:0 0 10px">Esta aba é a decisão do dia: usa o <b>parecer de ${dPar || '—'}</b> e o histórico inteiro, sem os filtros (eles valem para as outras abas). R$/dia já com slippage de 1 tick por lado.</div>
      <div class="tiles">
        ${P.tile('Robôs da real hoje', F.sbrl(hojeR), `${atuaisR.length} robôs · ${F.dataBr(P.D.dias[ULT])}${man && isFinite(man.hoje) ? ` · manual ${F.sbrl(man.hoje)} à parte` : ''}`, F.cls(hojeR))}
        ${P.tile('Robôs da real, acumulado', F.sbrl(totR), `desde que cada robô entrou${man ? ` · manual ${F.sbrl(man.vr)} à parte` : ''}`, F.cls(totR))}
        ${P.tile('Real − simulador', F.sbrl(difR), 'mesmos robôs, mesmos dias (negativo = a real executou pior)', F.cls(difR))}
        ${P.tile('Prontos fora da real', pr.filter(x => !x.naReal).length, pr.filter(x => !x.naReal).map(x => x.nome).join(', ') || 'nenhum')}
        ${P.tile('Para deletar', del.length, 'do simulador', del.length ? 'neg' : '')}
      </div>
      <div class="card"><div class="cab"><h2>Conta real</h2><span class="sub">cada robô da real × o mesmo robô no simulador, nos mesmos pregões</span></div><div id="dcReal"></div>
        ${sairam.length ? `<div class="sub" style="margin-top:6px">Saíram da real: ${sairam.map(z => `${F.esc(base(z.nome))} (último pregão ${F.dataBr(z.ultimo)}, ${F.sbrl(z.vr)})`).join(' · ')}.</div>` : ''}</div>
      <div class="card"><div class="cab"><h2>O que fazer</h2><span class="sub">${ac.fonte === 'especialista' ? `parecer do especialista de ${F.dataBr(ac.dia)}` : `tirado do parecer de ${dPar} (as ações do especialista aparecem depois das 19:20)`}</span></div>
        ${velho ? `<div class="sub neg" style="margin-bottom:6px">Atenção: estas ações são de ${F.dataBr(ac.dia)}; o parecer de ${dPar} ainda não tem as do especialista.</div>` : ''}
        ${ac.itens.length ? `<ol class="acoes-dia">${ac.itens.map(i => `<li><span class="selo ${selAcao(i.a)}"><i>${selAcao(i.a) === 'bad' ? '✕' : selAcao(i.a) === 'warn' ? '!' : selAcao(i.a) === 'info' ? '◷' : '•'}</i>${F.esc(i.a)}</span> <b>${F.esc(i.r)}</b> <span class="sub">${F.esc(i.x)}</span></li>`).join('')}</ol>` : '<div class="vazio">Nada a fazer hoje.</div>'}</div>
      <div class="card"><div class="cab"><div><h2>Candidatos para a real</h2><div class="sub">20 pregões ou mais, positivos, fora da real. Passe o mouse no veredito para ver metades, regime e t.</div></div></div><div id="dcCand"></div></div>
      <div class="card"><div class="cab"><div><h2>Em teste</h2><div class="sub">Menos de 20 pregões: ainda não se julga. A data é a estimativa de quando fecham 20 pregões (sem contar feriados).</div></div></div><div id="dcTeste" style="max-height:440px;overflow:auto"></div></div>
      <div class="card"><div class="cab"><div><h2>Robôs para deletar do simulador</h2><div class="sub"><b>Deletar</b> = Não levar com 20+ pregões. <b>Pode deletar</b> = positivo mas fraco demais (menos de R$ 25/dia e t < 1), ou já perdendo forte antes dos 20 pregões (t ≤ −2). Robô que está na real não entra: a cópia do simulador é a comparação.</div></div>
        <button class="btn" id="dcDelCsv">Exportar CSV</button></div><div id="dcDel"></div>
        <div class="sub" style="margin-top:6px">Antes de apagar: backup do Strategies.dat. Apagar a automação não apaga o código da estratégia, e o histórico continua no painel com o filtro "Removidos".</div></div>
      <div class="card"><div class="cab"><div><h2>Plano de crescimento</h2><div class="sub">Só robôs prontos. Começa pelo que dá mais resultado por real de capital; os próximos entram quando o lucro levar a conta ao capital da etapa. No máximo 5 contratos somados (pelo limite da config).</div></div>
        <div class="ctrl"><span title="capital = rebaixamento de referência ÷ este %">Aceito perder <select id="dcPct">${[15, 20, 25, 30, 40, 50].map(f => `<option value="${f}" ${f === c.pct ? 'selected' : ''}>${f}%</option>`).join('')}</select> da conta</span>
          · Capital hoje R$ <input type="number" id="dcCap" value="${cap || ''}" placeholder="ex.: 3000" step="500" min="0" style="width:90px" title="fica só neste navegador"></div></div>
        ${!pl.et.length ? '<div class="vazio">Nenhum robô pronto: ainda não há carteira confiável para montar.</div>' : `
        <div style="margin:6px 0 10px">${cap == null ? '<span class="sub">Informe o capital para ver em que etapa você está (o valor fica só neste navegador).</span>'
          : aqui < 0 ? `<b>Com ${F.brl(cap)} ainda não fecha a 1ª etapa (${F.brl(pl.et[0].capital)}).</b> O rebaixamento de referência de ${F.esc(pl.et[0].add.nome)} (${F.brl(pl.et[0].rb)}) levaria <b class="neg">${F.pct(100 * pl.et[0].rb / cap)}</b> da conta.`
          : `<b>Com ${F.brl(cap)} cabe até a etapa ${aqui + 1}</b>: ${pl.et[aqui].xs.map(x => F.esc(x.nome)).join(' + ')} · ${F.brl(pl.et[aqui].real)}/dia esperado.${pl.et[aqui + 1] ? ` Próxima (${F.esc(pl.et[aqui + 1].add.nome)}) com ${F.brl(pl.et[aqui + 1].capital)}: faltam ${F.brl(pl.et[aqui + 1].capital - cap)}, ${meses((pl.et[aqui + 1].capital - cap) / pl.et[aqui].real)} no ritmo histórico.` : ''}`}</div>
        <div id="dcPlano"></div>
        ${pl.fora.length ? `<div class="sub" style="margin-top:6px">Não cabem nos 5 contratos junto com a carteira: ${pl.fora.map(x => `${F.esc(x.nome)} (${x.ct} ctt)`).join(', ')}.</div>` : ''}`}</div>
      <details class="card"><summary style="cursor:pointer"><b>Análise completa</b> <span class="sub">retorno × risco, curva da etapa e o ranking com todas as colunas</span></summary>
        <div class="grid2" style="margin-top:10px">
          <div><h3>Retorno × risco</h3><div class="legenda">${Object.values(VER).filter(v => v !== VER.teste).map(v => `<span><i style="background:${v.cor}"></i>${v.t}</span>`).join('')}</div><div id="dcDisp"></div></div>
          <div><h3>Curva da carteira ${aqui >= 0 ? 'da sua etapa' : 'da 1ª etapa'}</h3><div class="sub" id="dcCurvaSub"></div><div id="dcCurva"></div></div></div>
        <div class="cab" style="margin-top:10px"><h3>Ranking completo</h3><button class="btn" id="dcCsv">Exportar CSV</button></div><div id="dcTab"></div></details>`;
    $('dcPct').onchange = e => { c.pct = +e.target.value; P.salvar(); cache.k = ''; R.decisao(host); };
    $('dcCap').onchange = e => { c.cap = +e.target.value > 0 ? +e.target.value : ''; P.salvar(); R.decisao(host); };

    // conta real
    if (!reais.length) $('dcReal').innerHTML = '<div class="vazio">Nenhum pregão da conta real.</div>';
    else P.tabela($('dcReal'), 'decReal', [
      { k: 'nome', t: 'Robô', l: 1, nome: 1, html: z => P.linkRobo(z.r) + (z.at ? '' : ' <span class="selo"><i>○</i>saiu</span>') + (z.manual ? '<div class="sub" style="font-size:11px">operações feitas à mão</div>' : `<div class="sub" style="font-size:11px">na real desde ${F.dataBr(z.primeiro)}</div>`), s: z => (z.at ? 1e6 : 0) + (z.manual ? -1e5 : 0) + z.vr },
      { k: 'hoje', t: 'Hoje', f: (v, z) => isFinite(v) ? `${F.sbrl(v)}${isFinite(z.simHoje) ? ` <span class="sub">(sim ${F.sbrl(z.simHoje)})</span>` : ''}` : '<span class="sub">não operou</span>', cls: v => F.cls(v) },
      { k: 'u5', t: 'Últ. 5 pregões', f: v => F.sbrl(v), cor: 1 },
      { k: 'vr', t: 'Acumulado', f: (v, z) => `${F.sbrl(v)} <span class="sub">(${z.n} preg.)</span>`, cls: v => F.cls(v) },
      { k: 'vs', t: 'Simulador, mesmos dias', html: z => z.manual ? '<span class="sub">—</span>' : isFinite(z.vs) ? `<span class="${F.cls(z.vs)}">${F.sbrl(z.vs)}</span>` : '<span class="sub">sem par</span>' },
      { k: 'dif', t: 'Real − sim', f: v => isFinite(v) ? F.sbrl(v) : '–', cor: 1, title: 'negativo = a real executou pior (slippage, fila, horário)' },
      { k: 'ver', t: 'Veredito do robô (simulador)', l: 1, html: z => z.ver ? `<span class="selo ${VER[z.ver].c}"><i>${VER[z.ver].i}</i>${VER[z.ver].t}</span><div class="sub" style="font-size:11px;max-width:230px;white-space:normal">${F.esc(z.motivo)}</div>` : '<span class="sub">—</span>', s: z => z.ver ? VER[z.ver].o : 0 },
      { k: 'sp', t: 'Curva real', html: z => G.spark(z.vals), s: z => z.vr }], reais, { sort: { k: 'nome', d: -1 }, depois: P.ligarNomes, rowAttr: z => z.at ? '' : 'style="opacity:.55"' });

    // candidatos
    const colCurva = { k: 'sp', t: 'Curva', html: x => G.spark(x.d.v), s: x => x.d.tot };
    if (!cand.length) $('dcCand').innerHTML = '<div class="vazio">Nenhum candidato com 20+ pregões.</div>';
    else P.tabela($('dcCand'), 'decCand', [
      { k: 'nome', t: 'Robô', l: 1, nome: 1, html: nomeHtml, s: x => x.nome },
      { k: 'ver', t: 'Veredito', l: 1, html: verHtml, s: x => VER[x.ver].o * 1e6 + x.real },
      { k: 'n', t: 'Pregões', f: F.n0 },
      { k: 'real', t: 'R$/dia', f: v => F.brl(v), cor: 1, title: 'com slippage de 1 tick por lado (parecer). Alvo 100' },
      { k: 'u10', t: 'Últ. 10', f: v => F.brl(v), cor: 1 },
      { k: 'estreito', t: 'Mercado estreito', f: (v, x) => isFinite(v) ? `<span title="amplo ${F.n0(x.amplo)}/dia (${x.na} dias) · estreito ${x.ne} dias">${F.brl(v)}</span>` : '–', cor: 1, title: 'R$/dia nos dias de A10 < 3000 (o regime de novembro)' },
      { k: 't', t: 't', f: (v, x) => `<span title="${isFinite(x.nt2) ? 'precisa de ~' + F.n0(x.nt2) + ' pregões para t 2' : ''}">${F.n1(v)}</span>`, title: '2 = não é ruído' },
      { k: 'queda', t: 'Queda máx', f: (v, x) => `<span title="projetada em 60 pregões: ${F.brl(-x.p95)}">${F.brl(-v)}</span>`, cls: () => 'neg', s: x => -x.queda },
      { k: 'ct', t: 'Ctt', f: (v) => v > 5 ? `<span class="neg" title="mais que os 5 da conta real">${v}</span>` : F.n0(v), title: 'limite de contratos da config (conta real: 5)' },
      { k: 'alav', t: 'Alavanca robusta', l: 1, html: x => x.alav ? `<span class="sub" style="white-space:normal;font-size:11px">${F.esc(x.alav)}</span>` : '<span class="sub">—</span>', s: x => x.alav ? 1 : 0 },
      colCurva], cand, { sort: { k: 'ver', d: -1 }, depois: P.ligarNomes });

    // em teste
    const teste = te.map(x => Object.assign({}, x, { falta: Math.max(0, 20 - x.n), quando: diaUtil(P.D.dias[ULT], Math.max(0, 20 - x.n)) }));
    if (!teste.length) $('dcTeste').innerHTML = '<div class="vazio">Nenhum robô em teste.</div>';
    else P.tabela($('dcTeste'), 'decTeste', [
      { k: 'nome', t: 'Robô', l: 1, nome: 1, html: nomeHtml, s: x => x.nome },
      { k: 'n', t: 'Pregões', f: v => `${v} / 20` },
      { k: 'quando', t: 'Fecha 20 em', f: v => F.dataBr(v), s: x => -x.falta },
      { k: 'real', t: 'R$/dia até aqui', f: v => F.brl(v), cor: 1, title: 'com slippage; com poucos pregões é quase só ruído' },
      { k: 't', t: 't', f: v => F.n1(v) },
      { k: 'ct', t: 'Ctt', f: v => v > 5 ? `<span class="neg">${v}</span>` : F.n0(v) },
      colCurva], teste, { sort: { k: 'real', d: -1 }, depois: P.ligarNomes });

    // deletar
    if (!del.length) $('dcDel').innerHTML = '<div class="vazio">Nenhum robô para deletar.</div>';
    else P.tabela($('dcDel'), 'decDel', [
      { k: 'acao', t: 'Ação', l: 1, html: x => `<span class="selo ${x.acao === 'Deletar' ? 'bad' : 'warn'}"><i>${x.acao === 'Deletar' ? '✕' : '…'}</i>${x.acao}</span>`, s: x => (x.acao === 'Deletar' ? 1e6 : 0) - x.real },
      { k: 'nome', t: 'Robô', l: 1, nome: 1, html: nomeHtml, s: x => x.nome },
      { k: 'porque', t: 'Por quê', l: 1, html: x => `<span class="sub" style="white-space:normal">${F.esc(x.porque)}</span>` },
      { k: 'n', t: 'Pregões', f: F.n0 },
      { k: 'real', t: 'R$/dia', f: v => F.brl(v), cor: 1 },
      { k: 'u20', t: 'Últ. 20', f: v => F.brl(v), cor: 1 },
      { k: 't', t: 't', f: v => F.n1(v) },
      { k: 'queda', t: 'Queda máx', f: v => F.brl(-v), cls: () => 'neg', s: x => -x.queda },
      colCurva], del, { sort: { k: 'acao', d: -1 }, depois: P.ligarNomes });
    $('dcDelCsv').onclick = () => P.csv('robos_para_deletar.csv', [{ k: 'acao', t: 'Ação' }, { k: 'nome', t: 'Robô' }, { k: 'fam', t: 'Família' }, { k: 'porque', t: 'Por quê' }, { k: 'n', t: 'Pregões' }, { k: 'real', t: 'R$/dia c/ slippage' }, { k: 'u20', t: 'Últ. 20' }, { k: 't', t: 't' }, { k: 'queda', t: 'Queda máx' }], del);

    // plano
    if (pl.et.length) {
      const erows = pl.et.map((e, i) => ({ i, e, et: i + 1, add: e.add.nome, n: e.xs.length, ct: e.ct, real: e.real, dd: e.dd, p95: e.p95, rb: e.rb, capital: e.capital, ret: 100 * 21 * e.real / e.capital, dias: i ? e.dias : 0, comum: e.comum }));
      P.tabela($('dcPlano'), 'decPlano', [
        { k: 'et', t: 'Etapa', f: (v, z) => `${v}${z.i === aqui ? ' <span class="selo good"><i>●</i>você está aqui</span>' : ''}` },
        { k: 'add', t: 'Entra', l: 1, html: z => P.linkRobo(z.e.add.r) + marcaReal(z.e.add) },
        { k: 'ct', t: 'Ctt', f: F.n0, title: 'contratos somados (limite da config de cada robô); conta real: 5' },
        { k: 'real', t: 'R$/dia', f: v => F.brl(v), cor: 1 },
        { k: 'rb', t: 'Rebaixamento', f: (v, z) => `<span title="histórico ${F.brl(-z.dd)} · projetado 60 pregões ${isFinite(z.p95) ? F.brl(-z.p95) : '–'} · ${z.comum} pregões com todos rodando">${F.brl(-v)}</span>`, cls: () => 'neg' },
        { k: 'capital', t: 'Capital da etapa', f: v => `<b>${F.brl(v)}</b>`, title: `rebaixamento ÷ ${c.pct}%` },
        { k: 'ret', t: 'Retorno ao mês', f: v => F.pct(v, 1) },
        { k: 'dias', t: 'Chega lá em', f: (v, z) => !z.i ? '<span class="sub">início</span>' : `${meses(v)} <span class="sub">· devagar: ${meses(2 * v)}</span>` }],
        erows, { sort: { k: 'et', d: 1 }, depois: P.ligarNomes, rowAttr: z => z.i === aqui ? 'style="background:var(--hover)"' : '' });
    }

    // análise completa (fechada por padrão)
    const tipR = x => `<b>${F.esc(x.nome)}</b> · ${VER[x.ver].t}<div class="linha"><span>R$/dia (com slippage)</span><span>${F.brl(x.real)}</span></div><div class="linha"><span>Queda máx</span><span>${F.brl(-x.queda)}</span></div><div class="linha"><span>Pregões</span><span>${x.n}</span></div>`;
    G.scatter($('dcDisp'), { pts: rows.filter(x => x.ver !== 'teste').map(x => ({ x: x.queda, y: x.real, c: VER[x.ver].cor, tip: tipR(x) })), xRot: 'queda máxima (R$)', yRot: 'R$/dia com slippage', fmtX: F.n0, h: 240 });
    const eC = pl.et[Math.max(0, aqui)];
    if (eC) { const rs = eC.rs, dc = TODOS.filter(d => rs.some(r => !isNaN(P.RES[r].f[d]))), v = Ind.serieSoma(rs, dc);
      $('dcCurvaSub').textContent = `${eC.xs.map(x => x.nome).join(' + ')} · ${dc.length} pregões · sem slippage`;
      G.line($('dcCurva'), { labels: dc.map(d => P.D.dias[d]), series: [{ name: 'Acumulado', color: 'var(--s1)', vals: P.acum(v) }, { name: 'Rebaixamento', color: 'var(--neg)', vals: P.submerso(v), fill: true, w: 1 }], h: 240, fmtX: F.dataBr }); }
    else $('dcCurva').innerHTML = '<div class="vazio">Nenhum robô pronto.</div>';
    const cols = [
      { k: 'nome', t: 'Robô', l: 1, nome: 1, fix: 1, html: nomeHtml, s: x => x.nome },
      { k: 'ver', t: 'Veredito', l: 1, html: verHtml, s: x => VER[x.ver].o * 1e6 + x.real },
      { k: 'n', t: 'Pregões', f: F.n0 },
      { k: 'real', t: 'R$/dia', f: (v, x) => `<span title="sem slippage ${F.brl(x.bruto)}">${F.brl(v)}</span>`, cls: v => F.cls(v) },
      { k: 'u20', t: 'Últ. 20', f: v => F.brl(v), cor: 1 },
      { k: 'pctPos', t: '% dias +', f: v => F.pct(v) },
      { k: 'mPos', t: 'Ganho médio', f: v => F.brl(v) },
      { k: 'mNeg', t: 'Perda média', f: v => F.brl(v), cor: 1 },
      { k: 'pior', t: 'Pior dia', f: v => F.brl(v), cor: 1 },
      { k: 'queda', t: 'Queda máx', f: v => F.brl(-v), cls: v => v > 0 ? 'neg' : '', s: x => -x.queda },
      { k: 'p95', t: 'Queda projetada', f: v => isFinite(v) ? F.brl(-v) : '–', cls: v => v > 0 ? 'neg' : '', s: x => isFinite(x.p95) ? -x.p95 : -1e9, title: 'P95 de 1.000 sorteios de 60 pregões' },
      { k: 'recup', t: 'Recuperação', html: recHtml, s: x => x.recup == null ? -1000 - x.submAtual : -x.recup },
      { k: 'capital', t: 'Capital sugerido', f: v => isFinite(v) ? F.brl(v) : '–', s: x => isFinite(x.capital) ? -x.capital : -1e9, title: `maior(queda, projetada) ÷ ${c.pct}%` },
      { k: 'retMes', t: 'Retorno ao mês', f: v => isFinite(v) ? F.pct(v, 1) : '<span class="sub">amostra curta</span>', cor: 1 },
      colCurva];
    P.tabela($('dcTab'), 'dec', cols, rows, { sort: { k: 'ver', d: -1 }, depois: P.ligarNomes });
    $('dcCsv').onclick = () => P.csv('decisao_conta_real.csv', [{ k: 'nome', t: 'Robô' }, { k: 'fam', t: 'Família' }, { k: 'verT', t: 'Veredito' }, { k: 'motivo', t: 'Motivo' }, { k: 'n', t: 'Pregões' }, { k: 'real', t: 'R$/dia c/ slippage' }, { k: 'u10', t: 'Últ. 10' }, { k: 'u20', t: 'Últ. 20' }, { k: 'estreito', t: 'Estreito' }, { k: 't', t: 't' },
      { k: 'queda', t: 'Queda máx' }, { k: 'p95', t: 'Queda projetada' }, { k: 'ct', t: 'Ctt' }, { k: 'capital', t: 'Capital sugerido' }, { k: 'retMes', t: 'Retorno % mês' }, { k: 'alav', t: 'Alavanca robusta' }],
      rows.map(x => Object.assign({}, x, { verT: VER[x.ver].t })));
  };
})();
