/* Indicadores (especificação do especialista em day trade, 19/11/2026).
   Dias: série r_d = resultado final do robô no pregão. Operações: x = líquido (resultado − custo). */
(function () {
  const sum = a => { let s = 0; for (const v of a) s += v; return s; };
  const mean = a => a.length ? sum(a) / a.length : NaN;
  const sd = a => { if (a.length < 2) return NaN; const m = mean(a); let s = 0; for (const v of a) s += (v - m) ** 2; return Math.sqrt(s / (a.length - 1)); };
  const sorted = a => a.slice().sort((x, y) => x - y);
  const pctl = (a, p) => { if (!a.length) return NaN; const s = sorted(a), k = (s.length - 1) * p, f = Math.floor(k), c = Math.ceil(k); return s[f] + (s[c] - s[f]) * (k - f); };
  const med = a => pctl(a, 0.5);
  const maxRun = (a, fn) => { let b = 0, c = 0; for (const v of a) { if (fn(v)) { c++; if (c > b) b = c; } else c = 0; } return b; };
  const ativo = rob => /WDO|DOL/i.test((rob.as || '') + ' ' + rob.n) ? { nome: 'WDO', vp: 10, tick: 5 } : { nome: 'WIN', vp: 0.2, tick: 1 };

  /* -------- por operação -------- */
  function operacoes(ops) {
    const P = window.P; const o = { n: ops.length };
    if (!ops.length) return Object.assign(o, { nG: 0, nL: 0, nZ: 0, liq: 0, bruto: 0, prej: 0, custo: 0, exp: NaN, acerto: NaN, pf: NaN, payoff: NaN, durMed: NaN, durG: NaN, durL: NaN });
    const xs = ops.slice().sort((a, b) => a.d - b.d || a.ini - b.ini);
    const x = xs.map(t => t.liq), V = x.filter(v => v > 0), Lx = x.filter(v => v < 0);
    o.nG = V.length; o.nL = Lx.length; o.nZ = o.n - o.nG - o.nL;
    o.liq = sum(x); o.bruto = sum(V); o.prej = -sum(Lx); o.custo = sum(xs.map(t => t.custo)); o.saldoBruto = o.liq + o.custo;
    o.pf = o.prej > 0 ? o.bruto / o.prej : (o.bruto > 0 ? Infinity : NaN);
    o.custoPct = o.saldoBruto > 0 ? 100 * o.custo / o.saldoBruto : NaN;
    o.exp = o.liq / o.n; o.acerto = 100 * o.nG / o.n; o.mG = mean(V); o.mL = mean(Lx);
    o.payoff = V.length && Lx.length ? o.mG / Math.abs(o.mL) : NaN; o.acertoMin = isFinite(o.payoff) ? 100 / (1 + o.payoff) : NaN; o.margem = o.acerto - o.acertoMin;
    o.maxG = V.length ? Math.max(...V) : NaN; o.maxL = Lx.length ? Math.min(...Lx) : NaN;
    o.seqG = maxRun(x, v => v > 0); o.seqL = maxRun(x, v => v < 0);
    o.durMed = mean(xs.map(t => t.dur)); o.durG = mean(xs.filter(t => t.liq > 0).map(t => t.dur)); o.durL = mean(xs.filter(t => t.liq < 0).map(t => t.dur));
    const cts = xs.map(t => t.ct); o.maxCt = Math.max(...cts); o.somaCt = sum(cts);
    o.rsCtt = o.liq / Math.max(1, o.somaCt);
    let tk = 0; for (const t of xs) tk += t.ct * 2 * ativo(P.ROB[t.r]).tick; o.saldoTick = o.liq - tk;
    o.opsDia = o.n / Math.max(1, new Set(xs.map(t => t.r + ':' + t.d)).size);
    // convenção do relatório do Profit: vencedora/perdedora, lucro/prejuízo bruto, fator, médias e quedas pelo resultado ANTES do custo
    const g = xs.map(t => t.liq + t.custo), gV = g.filter(v => v > 0), gL = g.filter(v => v < 0);
    o.gB = sum(gV); o.gP = -sum(gL); o.gPF = o.gP > 0 ? o.gB / o.gP : (o.gB > 0 ? Infinity : NaN);
    o.gNG = gV.length; o.gNL = gL.length; o.gNZ = o.n - gV.length - gL.length; o.gAcerto = 100 * gV.length / o.n;
    o.gMG = mean(gV); o.gML = mean(gL); o.gPayoff = gV.length && gL.length ? o.gMG / Math.abs(o.gML) : NaN;
    o.gMaxG = gV.length ? Math.max(...gV) : NaN; o.gMaxL = gL.length ? Math.min(...gL) : NaN; o.gSeqG = maxRun(g, v => v > 0); o.gSeqL = maxRun(g, v => v < 0);
    { let c2 = 0, p2 = 0, d2 = 0; for (const v of g) { c2 += v; if (c2 > p2) p2 = c2; if (p2 - c2 > d2) d2 = p2 - c2; } o.gDDTF = d2; } o.gDDTT = gL.length ? -Math.min(...gL) : 0;
    // pontos (antes do custo): R$ / valor do ponto (WIN 0,20 · WDO 10). "Pontos" = soma (já multiplicada pelos contratos); "Pts/ctt" = por contrato
    o.pontos = 0; o.ptsCtt = 0; xs.forEach((t, i) => { const vp = ativo(P.ROB[t.r]).vp; o.pontos += g[i] / vp; o.ptsCtt += g[i] / (vp * Math.max(1, t.ct)); });
    o.ptsOp = o.ptsCtt / o.n;
    o.gDurG = mean(xs.filter((t, i) => g[i] > 0).map(t => t.dur)); o.gDurL = mean(xs.filter((t, i) => g[i] < 0).map(t => t.dur));
    o.patrimNec = Lx.length ? Math.abs(Math.min(...Lx)) : 0;
    let c = 0, pk = 0, dd = 0; for (const v of x) { c += v; if (c > pk) pk = c; if (pk - c > dd) dd = pk - c; } o.patrimMax = pk; o.ddTrade = dd;
    const s = sd(x); o.sqn = isFinite(s) && s > 0 ? Math.sqrt(Math.min(o.n, 100)) * o.exp / s : NaN;
    const g1 = xs.filter(t => t.ct <= 1), gN = xs.filter(t => t.ct > 1); o.pctGrade = 100 * gN.length / o.n; o.m1 = mean(g1.map(t => t.liq)); o.mN = mean(gN.map(t => t.liq));
    // MAE/MFE (pontos) - só operações com os dois conhecidos
    const cov = xs.filter(t => t.mae >= 0 && t.mfe >= 0); o.cobMae = 100 * cov.length / o.n;
    const ptsB = t => (t.liq + t.custo) / (Math.max(1, t.ct) * ativo(P.ROB[t.r]).vp);
    const cV = cov.filter(t => t.liq > 0), cL = cov.filter(t => t.liq < 0);
    o.maeG = mean(cV.map(t => t.mae)); o.maeG80 = pctl(cV.map(t => t.mae), 0.8); o.maeG90 = pctl(cV.map(t => t.mae), 0.9);
    o.maeL = mean(cL.map(t => t.mae)); o.mfeL = mean(cL.map(t => t.mfe));
    const medPtsV = med(cV.map(ptsB)); o.medPtsV = medPtsV;
    o.pctPerdLucro = cL.length && isFinite(medPtsV) ? 100 * cL.filter(t => t.mfe >= 0.5 * medPtsV).length / cL.length : NaN;
    const sm = sum(cV.map(t => t.mfe)); o.captura = sm > 0 ? 100 * sum(cV.map(ptsB)) / sm : NaN;
    const ma = mean(cov.map(t => t.mae)); o.edge = ma > 0 ? mean(cov.map(t => t.mfe)) / ma : NaN;
    return o;
  }

  /* -------- por dia (um robô) -------- */
  function diario(r, dias) {
    const P = window.P, R = P.RES[r];
    const idx = dias.filter(d => !isNaN(R.f[d]));
    const o = serie(idx, idx.map(d => R.f[d]), idx.map(d => R.mn[d]), idx.map(d => R.mx[d]), P.ROB[r]);
    if (o.n) o.mp = Math.max(...idx.map(d => R.mp[d]));
    return o;
  }
  /* indicadores diários de uma série (um robô, ou a soma da carteira na linha TOTAL) */
  function serie(idx, v, mn, mx, rob) {
    const P = window.P; rob = rob || {};
    const n = v.length, o = { n, idx, v };
    if (!n) return o;
    o.tot = sum(v); o.porDia = o.tot / n; o.pctPos = 100 * v.filter(x => x > 0).length / n;
    const vp = v.filter(x => x > 0), vn = v.filter(x => x < 0); o.mPos = mean(vp); o.mNeg = mean(vn); o.payoffD = vp.length && vn.length ? o.mPos / Math.abs(o.mNeg) : NaN;
    o.best = Math.max(...v); o.worst = Math.min(...v); o.seqNeg = maxRun(v, x => x < 0);
    const s = sd(v); o.sd = s; o.sharpe = s > 0 ? o.porDia / s : NaN; o.tdia = o.sharpe * Math.sqrt(n);
    const dn = Math.sqrt(sum(v.map(x => Math.min(x, 0) ** 2)) / n); o.sortino = dn > 0 ? o.porDia / dn : NaN;
    const desc = sorted(v).reverse(); o.semMelhor = o.tot - desc[0]; o.sem3 = o.tot - sum(desc.slice(0, 3)); o.pctMelhor = o.tot > 0 ? 100 * desc[0] / o.tot : NaN;
    // drawdown diário
    let E = 0, Pk = 0, dd = 0, iFundo = -1, iPico = -1, iPk = -1, run = 0, runMax = 0; const DD = [], Ec = [];
    v.forEach((x, i) => { E += x; Ec.push(E); if (E >= Pk) { Pk = E; iPk = i; } const q = Pk - E; DD.push(q); if (q > dd) { dd = q; iFundo = i; iPico = iPk; } if (q > 0) { run++; if (run > runMax) runMax = run; } else run = 0; });
    o.E = Ec; o.DD = DD; o.dd = dd; o.ddDias = dd / Math.max(o.porDia, 1); o.recup = dd > 0 ? o.tot / dd : (o.tot > 0 ? Infinity : NaN);
    o.ulcer = Math.sqrt(sum(DD.map(q => q * q)) / n); o.submersoMax = runMax; o.submersoAtual = run;
    if (iFundo >= 0) { const alvo = iPico >= 0 ? Ec[iPico] : 0; let k = iFundo + 1; while (k < n && Ec[k] < alvo) k++; o.diasRecup = k < n ? k - iFundo : null; o.iPico = iPico; o.iFundo = iFundo; }
    o.piorIntra = Math.min(...mn);
    const perdaCfg = rob.pd > 0 ? rob.pd : 500; const C = 3 * perdaCfg;
    o.ruina = o.porDia > 0 && s > 0 ? 100 * Math.exp(-2 * o.porDia * C / (s * s)) : 100;
    o.perda20 = 20 * o.porDia - 1.645 * s * Math.sqrt(20);
    const h = Math.floor(n / 2); o.h1 = h ? mean(v.slice(0, h)) : NaN; o.h2 = mean(v.slice(h)); o.minMetades = Math.min(o.h1, o.h2);
    o.u10 = mean(v.slice(-10)); o.razaoRec = o.porDia > 0 ? o.u10 / o.porDia : NaN;
    const meses = {}; idx.forEach((d, i) => { const m = P.D.dias[d].slice(0, 7); (meses[m] = meses[m] || []).push(v[i]); });
    o.meses = meses; o.sdMeses = sd(Object.values(meses).filter(a => a.length >= 8).map(mean));
    const am = [], es = []; idx.forEach((d, i) => { const a = P.DIA[d].a10; if (a == null) return; (a >= 3000 ? am : es).push(v[i]); });
    o.nAmplo = am.length; o.nEstr = es.length; o.amplo = mean(am); o.estreito = mean(es); o.deltaReg = o.amplo - o.estreito;
    o.devMed = mean(mx.map((a, i) => a - v[i])); const pos = mx.map((a, i) => [a, v[i]]).filter(p => p[0] > 0);
    o.devPct = pos.length ? 100 * sum(pos.map(p => p[0] - p[1])) / sum(pos.map(p => p[0])) : NaN;
    o.virou = 100 * mx.filter((a, i) => a >= 100 && v[i] <= 0).length / n;
    if (rob.mt > 0) { o.pctMeta = 100 * v.filter(x => x >= 0.9 * rob.mt).length / n; o.tocouMeta = 100 * mx.filter(a => a >= 0.95 * rob.mt).length / n; }
    if (rob.pd > 0) { o.pctPerda = 100 * mn.filter(a => a <= -0.95 * rob.pd).length / n; o.usoPerda = 100 * mean(mn) / rob.pd; }
    return o;
  }

  /* Monte Carlo do drawdown (P95), semente fixa */
  function mcDD(v, it = 2000) {
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const out = []; for (let k = 0; k < it; k++) { let E = 0, pk = 0, dd = 0; for (let i = 0; i < v.length; i++) { E += v[Math.floor(rnd() * v.length)]; if (E > pk) pk = E; if (pk - E > dd) dd = pk - E; } out.push(dd); }
    return pctl(out, 0.95);
  }

  /* linha completa de ranking para um robô */
  function linha(r, dias, opsDoRobo) {
    const P = window.P, d = diario(r, dias), o = operacoes(opsDoRobo), rob = P.ROB[r];
    return { r, nome: rob.n, fam: rob.f, est: rob.e, graf: rob.g, mt: rob.mt, pd: rob.pd, d, o,
      n: d.n, porDia: d.porDia, tot: d.tot, pctPos: d.pctPos, pf: o.pf, tdia: d.tdia, dd: d.dd, recup: d.recup, h1: d.h1, h2: d.h2, u10: d.u10, semMelhor: d.semMelhor, devPct: d.devPct, saldoTick: o.n ? o.saldoTick : NaN, liq: o.liq };
  }

  /* SCORE 0-100 + selos (sobre o conjunto filtrado) */
  function pontuar(rows) {
    const M = rows.length; if (!M) return rows;
    const comp = (fn) => { const vals = rows.map(fn).map(v => isFinite(v) ? v : (v === Infinity ? 1e9 : NaN)); const ok = vals.filter(v => !isNaN(v));
      if (M < 5) { const lo = Math.min(...ok), hi = Math.max(...ok); return vals.map(v => isNaN(v) ? 0.5 : hi > lo ? (v - lo) / (hi - lo) : 0.5); }
      const s = sorted(ok); return vals.map(v => { if (isNaN(v)) return 0.5; let a = 0, b = 0; for (const x of s) { if (x < v) a++; else if (x === v) b++; } const rank = a + (b + 1) / 2; return s.length > 1 ? (rank - 1) / (s.length - 1) : 0.5; }); };
    const cRet = comp(x => x.porDia), cSig = comp(x => x.tdia), cRob = comp(x => x.d.minMetades), cRis = comp(x => x.d.dd > 0 ? x.tot / x.d.dd : (x.tot > 0 ? 1e9 : x.tot)),
      cRec = comp(x => x.u10), cCon = comp(x => x.semMelhor / Math.max(Math.abs(x.tot), 1)), cExe = comp(x => x.o.n ? x.o.rsCtt : NaN);
    rows.forEach((x, i) => {
      const ret = 0.5 * cRet[i] + 0.5 * Math.max(0, Math.min(1, x.porDia / 100));
      let s = 25 * ret + 20 * cSig[i] + 15 * cRob[i] + 15 * cRis[i] + 10 * cRec[i] + 10 * cCon[i] + 5 * cExe[i]; const pen = [];
      x.base = s;
      if (x.n < 20) { s *= x.n / 20; pen.push(`menos de 20 pregões (×${(x.n / 20).toFixed(2)})`); }
      if (x.h1 < 0) { s -= 15; pen.push('1ª metade negativa (−15)'); } if (x.h2 < 0) { s -= 15; pen.push('2ª metade negativa (−15)'); }
      if (x.u10 < 0) { s -= 15; pen.push('últimos 10 negativos (−15)'); }
      if (x.d.ddDias > 15) { s -= 20; pen.push('queda > 15 dias de ganho (−20)'); } else if (x.d.ddDias > 8) { s -= 10; pen.push('queda > 8 dias de ganho (−10)'); }
      if (x.liq > 0 && x.saldoTick <= 0) { s -= 10; pen.push('some com 1 tick de slippage (−10)'); }
      if (x.tot <= 0) { s = Math.min(s, 20); pen.push('resultado ≤ 0 (máx. 20)'); }
      x.score = Math.max(0, Math.min(100, s)); x.pen = pen;
      x.comp = { Retorno: 25 * ret, Significância: 20 * cSig[i], Robustez: 15 * cRob[i], Risco: 15 * cRis[i], Recência: 10 * cRec[i], Concentração: 10 * cCon[i], Execução: 5 * cExe[i] };
      x.selos = selos(x);
    });
    return rows;
  }
  function selos(x) {
    const d = x.d, o = x.o, out = [];
    if (x.n >= 20 && d.h1 > 0 && d.h2 > 0 && d.u10 > 0 && d.tdia >= 1.5 && d.semMelhor > 0) out.push({ t: 'Robusto', c: 'good', i: '✓', d: '≥20 pregões, as 2 metades e os últimos 10 positivos, t-dia ≥ 1,5, positivo sem o melhor dia' });
    if (x.n >= 20 && d.porDia >= 100) out.push({ t: 'Alvo R$100', c: 'good', i: '★', d: 'R$/dia ≥ 100 com ≥ 20 pregões' });
    else if (d.u10 >= 100) out.push({ t: 'Alvo recente', c: 'info', i: '☆', d: 'últimos 10 pregões ≥ R$100/dia' });
    if (d.porDia > 0 && (d.u10 < 0 || (d.h1 > 0 && d.h2 < 0.3 * d.h1)) || d.submersoAtual >= 10) out.push({ t: 'Em deterioração', c: 'bad', i: '↓', d: 'últimos 10 negativos, 2ª metade < 30% da 1ª, ou 10+ pregões abaixo do pico' });
    if (x.n < 20 || o.n < 30) out.push({ t: 'Amostra pequena', c: 'warn', i: '!', d: 'menos de 20 pregões ou menos de 30 operações' });
    if (d.nAmplo >= 5 && d.nEstr >= 5 && Math.sign(d.amplo) !== Math.sign(d.estreito) && Math.abs(d.deltaReg) >= 80) out.push({ t: d.amplo > d.estreito ? 'Só amplo' : 'Só estreito', c: 'info', i: '≈', d: `R$/dia A10 amplo ${Math.round(d.amplo)} × estreito ${Math.round(d.estreito)}` });
    if (d.devPct > 60 || d.virou > 20) out.push({ t: 'Devolve muito', c: 'warn', i: '↺', d: 'devolve > 60% do pico do dia ou > 20% dos dias viram de +100 para ≤ 0' });
    if (x.liq > 0 && x.saldoTick <= 0) out.push({ t: 'Frágil a slippage', c: 'warn', i: '⚠', d: 'o saldo some com 1 tick contra na entrada e na saída' });
    if (d.semMelhor <= 0 || d.pctMelhor > 50) out.push({ t: 'Concentrado', c: 'warn', i: '◆', d: 'sem o melhor dia fica ≤ 0, ou o melhor dia é > 50% do total' });
    return out;
  }
  const selosHtml = (ss, curto) => ss.map(s => `<span class="selo ${s.c}" title="${s.d}"><i>${s.i}</i>${curto ? '' : s.t}</span>`).join('');

  window.M = { sum, mean, sd, med, pctl, maxRun, ativo, operacoes, diario, serie, mcDD, linha, pontuar, selosHtml };
})();
