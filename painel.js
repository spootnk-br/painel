/* Painel dos robôs - dados, filtros, abas (Visão geral, Mapa de calor, Dia, Operações, Grupos).
   Ranking, Detalhe e Carteira ficam em indicadores.js; fórmulas em metricas.js. */
(function () {
  const D = window.DADOS, F = G.F;
  if (!D) { document.querySelector('main').innerHTML = '<div class="vazio">dados.js não encontrado. Rode motor\\painel_dados.ps1.</div>'; return; }
  const ND = D.dias.length, NR = D.robos.length;
  const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DIA = D.dias.map((iso, i) => ({ iso, i, dow: new Date(iso + 'T12:00:00').getDay(), amp: D.amp[i], a10: D.a10[i], mes: iso.slice(0, 7) }));
  const ROB = D.robos.map((r, i) => Object.assign({ i }, r));
  const RES = ROB.map(() => ({ f: new Float64Array(ND).fill(NaN), mn: new Float64Array(ND).fill(NaN), mx: new Float64Array(ND).fill(NaN), mp: new Float64Array(ND).fill(NaN) }));
  for (const [r, d, f, mn, mx, mp] of D.res) { const o = RES[r]; o.f[d] = f; o.mn[d] = mn; o.mx[d] = mx; o.mp[d] = mp; }
  const OPS = D.ops.map(a => ({ r: a[0], d: a[1], ini: a[2], fim: a[3], lado: a[4], ct: a[5], liq: a[6], custo: a[7], dur: a[8], mae: a[9], mfe: a[10], antes: a[11] }));
  const OPS_R = ROB.map(() => []); for (const o of OPS) OPS_R[o.r].push(o);
  const SLOTS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

  /* ---------------- estado / filtros ---------------- */
  const PADRAO = { preset: 'tudo', de: D.dias[0], ate: D.dias[ND - 1], semana: [1, 2, 3, 4, 5], regime: '', ampMin: '', ampMax: '', status: 'ativo', conta: null, familia: null, estrategia: null, grafico: null,
    busca: '', minDias: '', minDia: '', lado: '', horaDe: '', horaAte: '', durMin: '', durMax: '', resOp: '', antes: '', aba: 'geral', robo: null, comp: [], dia: null, sort: {}, calorClamp: 500, grupo: 'familia' };
  let S; try { S = Object.assign({}, PADRAO, JSON.parse(localStorage.getItem('painelRobos.v1') || '{}')); } catch (e) { S = Object.assign({}, PADRAO); }
  const salvar = () => { try { localStorage.setItem('painelRobos.v1', JSON.stringify(S)); } catch (e) { } };

  function aplicarPreset() {
    const p = S.preset, last = ND - 1;
    if (p === 'tudo') { S.de = D.dias[0]; S.ate = D.dias[last]; }
    else if (p[0] === 'u') { const n = +p.slice(1); S.de = D.dias[Math.max(0, last - n + 1)]; S.ate = D.dias[last]; }
    else if (p === 'mes') { const m = D.dias[last].slice(0, 7); S.de = D.dias.find(d => d.startsWith(m)); S.ate = D.dias[last]; }
    else if (p === 'mesant') { const m = D.dias[last].slice(0, 7); const ant = D.dias.filter(d => d < m + '-01'); if (ant.length) { const mm = ant[ant.length - 1].slice(0, 7); S.de = ant.find(d => d.startsWith(mm)); S.ate = ant[ant.length - 1]; } }
  }
  if (S.preset !== 'custom') aplicarPreset();

  const hm = s => { if (!s) return null; const p = s.split(':'); return +p[0] * 60 + +p[1]; };
  const num = s => s === '' || s == null ? null : +s;

  /* contexto filtrado (recalculado a cada mudança) */
  let CTX = null;
  function calcular() {
    const ampMin = num(S.ampMin), ampMax = num(S.ampMax);
    const dias = DIA.filter(d => d.iso >= S.de && d.iso <= S.ate && S.semana.includes(d.dow)
      && (!S.regime || (d.a10 != null && (S.regime === 'amplo' ? d.a10 >= 3000 : d.a10 < 3000)))
      && (ampMin == null || (d.amp != null && d.amp >= ampMin)) && (ampMax == null || (d.amp != null && d.amp <= ampMax))).map(d => d.i);
    const busca = S.busca.trim().toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    let robos = ROB.filter(r => (S.status === 'todos' || (S.status === 'ativo' ? r.at : !r.at))
      && (!S.conta || S.conta.includes(r.c)) && (!S.familia || S.familia.includes(r.f)) && (!S.estrategia || S.estrategia.includes(r.e || '(removido)'))
      && (!S.grafico || S.grafico.includes(r.g || '(removido)')) && (!busca.length || busca.some(b => r.n.toLowerCase().includes(b)))).map(r => r.i);
    const minDias = num(S.minDias), minDia = num(S.minDia);
    robos = robos.filter(r => { let n = 0, s = 0; for (const d of dias) { const v = RES[r].f[d]; if (!isNaN(v)) { n++; s += v; } }
      return n > 0 && (minDias == null || n >= minDias) && (minDia == null || s / n >= minDia); });
    const diaSet = new Set(dias), robSet = new Set(robos);
    const hDe = hm(S.horaDe), hAte = hm(S.horaAte), dMin = num(S.durMin), dMax = num(S.durMax);
    const opOkNR = o => diaSet.has(o.d) && (!S.lado || o.lado === +S.lado) && (hDe == null || o.ini >= hDe) && (hAte == null || o.ini <= hAte)
      && (dMin == null || o.dur >= dMin) && (dMax == null || o.dur <= dMax) && (!S.resOp || (S.resOp === 'g' ? o.liq > 0 : o.liq <= 0))
      && (!S.antes || (S.antes === 'pos' ? o.antes > 0 : S.antes === 'neg' ? o.antes < 0 : o.antes === 0));
    const opOk = o => robSet.has(o.r) && opOkNR(o);
    const opsF = OPS.filter(opOk);
    CTX = { dias, robos, diaSet, robSet, opOk, opOkNR, opsF, filtroOps: !!(S.lado || hDe != null || hAte != null || dMin != null || dMax != null || S.resOp || S.antes) };
    document.getElementById('resumoSel').textContent = `${robos.length} robôs · ${dias.length} pregões · ${opsF.length.toLocaleString('pt-BR')} operações`;
  }
  // série diária da carteira (soma dos robôs filtrados) nos dias filtrados
  function carteiraDiaria(robos) { robos = robos || CTX.robos; return CTX.dias.map(d => { let s = 0, n = 0; for (const r of robos) { const v = RES[r].f[d]; if (!isNaN(v)) { s += v; n++; } } return n ? s : null; }); }
  function valsRobo(r) { const out = []; for (const d of CTX.dias) { const v = RES[r].f[d]; if (!isNaN(v)) out.push(v); } return out; }

  /* ---------------- UI dos filtros ---------------- */
  const $ = id => document.getElementById(id);
  function multi(id, chave, opcoes) {
    const host = $(id); host.innerHTML = `<button type="button"></button><div class="pop"><div class="acoes"><a data-a="todos">todas</a><a data-a="nenhum">nenhuma</a></div>${opcoes.map(o => `<label><input type="checkbox" value="${F.esc(o.v)}"> ${F.esc(o.t)} <span class="mut">${o.n != null ? o.n : ''}</span></label>`).join('')}</div>`;
    const btn = host.querySelector('button'), boxes = [...host.querySelectorAll('input')];
    const sync = () => { const sel = S[chave]; boxes.forEach(b => b.checked = !sel || sel.includes(b.value)); btn.textContent = !sel ? 'Todas' : sel.length === 0 ? 'Nenhuma' : sel.length === 1 ? sel[0] : sel.length + ' selecionadas'; };
    btn.onclick = e => { e.stopPropagation(); document.querySelectorAll('.ms.open').forEach(m => m !== host && m.classList.remove('open')); host.classList.toggle('open'); };
    host.querySelector('.pop').onclick = e => e.stopPropagation();
    host.querySelectorAll('.acoes a').forEach(a => a.onclick = () => { S[chave] = a.dataset.a === 'todos' ? null : []; sync(); mudou(); });
    boxes.forEach(b => b.onchange = () => { const v = boxes.filter(x => x.checked).map(x => x.value); S[chave] = v.length === boxes.length ? null : v; sync(); mudou(); });
    sync(); host._sync = sync;
  }
  function opcoes(campo, vazio) { const c = {}; for (const r of ROB) { const v = r[campo] || vazio; c[v] = (c[v] || 0) + 1; } return Object.keys(c).sort().map(v => ({ v, t: v, n: c[v] })); }
  function montarFiltros() {
    $('geradoEm').textContent = `Atualizado em ${D.gerado} · ${ND} pregões (${F.dataBrA(D.dias[0])} a ${F.dataBrA(D.dias[ND - 1])}) · ${NR} carteiras · ${OPS.length.toLocaleString('pt-BR')} operações`;
    $('fSemana').innerHTML = [1, 2, 3, 4, 5].map(d => `<button type="button" class="chip" data-d="${d}">${SEM[d]}</button>`).join('');
    $('fSemana').querySelectorAll('.chip').forEach(c => c.onclick = () => { const d = +c.dataset.d; S.semana = S.semana.includes(d) ? S.semana.filter(x => x !== d) : [...S.semana, d]; syncCampos(); mudou(); });
    multi('fConta', 'conta', opcoes('c')); multi('fFamilia', 'familia', opcoes('f')); multi('fEstrategia', 'estrategia', opcoes('e', '(removido)')); multi('fGrafico', 'grafico', opcoes('g', '(removido)'));
    $('fDe').min = $('fAte').min = D.dias[0]; $('fDe').max = $('fAte').max = D.dias[ND - 1];
    const liga = (id, chave, ev, fn) => $(id).addEventListener(ev || 'change', () => { S[chave] = $(id).value; if (fn) fn(); mudou(); });
    liga('fPreset', 'preset', 'change', () => { if (S.preset !== 'custom') aplicarPreset(); syncCampos(); });
    liga('fDe', 'de', 'change', () => { S.preset = 'custom'; syncCampos(); }); liga('fAte', 'ate', 'change', () => { S.preset = 'custom'; syncCampos(); });
    liga('fRegime', 'regime'); liga('fAmpMin', 'ampMin'); liga('fAmpMax', 'ampMax'); liga('fStatus', 'status'); liga('fBusca', 'busca', 'input');
    liga('fMinDias', 'minDias'); liga('fMinDia', 'minDia'); liga('fLado', 'lado'); liga('fHoraDe', 'horaDe'); liga('fHoraAte', 'horaAte');
    liga('fDurMin', 'durMin'); liga('fDurMax', 'durMax'); liga('fResOp', 'resOp'); liga('fAntes', 'antes');
    $('btnLimpar').onclick = () => { const keep = { aba: S.aba, robo: S.robo, comp: S.comp, sort: S.sort, calorClamp: S.calorClamp, grupo: S.grupo }; S = Object.assign({}, PADRAO, keep); aplicarPreset(); syncCampos(); mudou(); };
    document.addEventListener('click', () => document.querySelectorAll('.ms.open').forEach(m => m.classList.remove('open')));
    $('btnTema').onclick = () => { const r = document.documentElement; const atual = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); r.dataset.theme = atual === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('painelRobos.tema', r.dataset.theme); } catch (e) { } };
    try { const t = localStorage.getItem('painelRobos.tema'); if (t) document.documentElement.dataset.theme = t; } catch (e) { }
    document.querySelectorAll('#abas button').forEach(b => b.onclick = () => abrirAba(b.dataset.aba));
    syncCampos();
  }
  function syncCampos() {
    const set = (id, v) => { $(id).value = v == null ? '' : v; };
    set('fPreset', S.preset); set('fDe', S.de); set('fAte', S.ate); set('fRegime', S.regime); set('fAmpMin', S.ampMin); set('fAmpMax', S.ampMax); set('fStatus', S.status);
    set('fBusca', S.busca); set('fMinDias', S.minDias); set('fMinDia', S.minDia); set('fLado', S.lado); set('fHoraDe', S.horaDe); set('fHoraAte', S.horaAte);
    set('fDurMin', S.durMin); set('fDurMax', S.durMax); set('fResOp', S.resOp); set('fAntes', S.antes);
    $('fSemana').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', S.semana.includes(+c.dataset.d)));
    ['fConta', 'fFamilia', 'fEstrategia', 'fGrafico'].forEach(id => $(id)._sync && $(id)._sync());
  }

  /* ---------------- abas ---------------- */
  const sujo = {};
  function abrirAba(a) { S.aba = a; salvar(); document.querySelectorAll('#abas button').forEach(b => b.classList.toggle('on', b.dataset.aba === a)); document.querySelectorAll('.aba').forEach(s => s.classList.toggle('on', s.id === 'aba-' + a)); render(true); }
  let timer = null;
  function mudou() { salvar(); clearTimeout(timer); timer = setTimeout(() => { calcular(); Object.keys(R).forEach(k => sujo[k] = true); render(true); }, 120); }
  function render(force) { const a = S.aba; if (!R[a]) return; if (force || sujo[a]) { sujo[a] = false; const host = $('aba-' + a); try { R[a](host); } catch (e) { host.innerHTML = `<div class="vazio">Erro ao desenhar: ${F.esc(e.message)}</div>`; console.error(e); } } }
  addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(() => render(true), 200); });

  /* ---------------- helpers de tabela ---------------- */
  // cols: [{k, t, l(eft), f(fmt)(v,row), html(row), cls(v,row), title, s(sort value)}]
  function tabela(host, id, cols, rows, opt = {}) {
    const st = S.sort[id] || opt.sort || { k: cols[0].k, d: -1 };
    const col = cols.find(c => c.k === st.k) || cols[0];
    const sv = r => col.s ? col.s(r) : r[col.k];
    rows = rows.slice().sort((a, b) => { const x = sv(a), y = sv(b); const nx = x == null || (typeof x === 'number' && !isFinite(x)), ny = y == null || (typeof y === 'number' && !isFinite(y)); if (nx && ny) return 0; if (nx) return 1; if (ny) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * st.d; });
    const lim = opt.limite || rows.length, pag = opt.pagina || 0, vis = rows.slice(pag * lim, pag * lim + lim);
    let h = `<div class="tw" ${opt.maxH ? `style="max-height:${opt.maxH}"` : ''}><table class="t"><thead><tr>${cols.map(c => `<th class="${c.l ? 'l' : ''} ${c.fix ? 'fix' : ''}" data-k="${c.k}" ${c.title ? `title="${F.esc(c.title)}"` : ''}>${c.t}${c.k === st.k ? ` <span class="seta">${st.d > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr></thead><tbody>`;
    for (const r of vis) h += `<tr ${opt.rowAttr ? opt.rowAttr(r) : ''}>${cols.map(c => { const v = r[c.k]; const cl = (c.l ? 'l ' : '') + (c.fix ? 'fix ' : '') + (c.cls ? c.cls(v, r) : (typeof v === 'number' && c.cor ? F.cls(v) : '')) + (c.nome ? ' nome' : '');
      return `<td class="${cl}">${c.html ? c.html(r) : c.f ? c.f(v, r) : (v == null ? '–' : F.esc(v))}</td>`; }).join('')}</tr>`;
    h += '</tbody></table></div>';
    if (opt.limite && rows.length > lim) h += `<div class="pag"><button class="btn" data-p="-1" ${pag ? '' : 'disabled'}>‹</button> ${pag * lim + 1}–${Math.min(rows.length, pag * lim + lim)} de ${rows.length.toLocaleString('pt-BR')} <button class="btn" data-p="1" ${(pag + 1) * lim < rows.length ? '' : 'disabled'}>›</button></div>`;
    host.innerHTML = h;
    host.querySelectorAll('th').forEach(th => th.onclick = () => { const k = th.dataset.k; S.sort[id] = { k, d: st.k === k ? -st.d : (cols.find(c => c.k === k).l ? 1 : -1) }; salvar(); tabela(host, id, cols, rows, Object.assign({}, opt, { pagina: 0 })); });
    host.querySelectorAll('.pag button').forEach(b => b.onclick = () => tabela(host, id, cols, rows, Object.assign({}, opt, { pagina: pag + +b.dataset.p })));
    if (opt.depois) opt.depois(host);
    return rows;
  }
  function csv(nome, cols, rows) {
    const linhas = [cols.map(c => c.t.replace(/<[^>]+>/g, '')).join(';')].concat(rows.map(r => cols.map(c => { const v = c.csv ? c.csv(r) : r[c.k]; return typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/<[^>]+>/g, '') + '"'; }).join(';')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv' })); a.download = nome; a.click();
  }
  function ligarNomes(host) { host.querySelectorAll('[data-robo]').forEach(a => a.onclick = e => { e.preventDefault(); abrirRobo(+a.dataset.robo); }); }
  function abrirRobo(r) { S.robo = ROB[r].w; salvar(); sujo.detalhe = true; abrirAba('detalhe'); }
  function linkRobo(r) { return `<a data-robo="${r}" title="Abrir detalhe">${F.esc(ROB[r].n)}</a>`; }
  function corComp(r) { const k = S.comp.indexOf(ROB[r].w); return k >= 0 ? SLOTS[k] : null; }
  function tile(rot, val, det, cls) { return `<div class="tile"><div class="rot">${rot}</div><div class="val ${cls || ''}">${val}</div>${det ? `<div class="det">${det}</div>` : ''}</div>`; }
  function acum(vals) { let c = 0; return vals.map(v => v == null ? (c) : (c += v)); }
  function submerso(vals) { let c = 0, pk = 0; return vals.map(v => { c += v || 0; if (c > pk) pk = c; return c - pk; }); }

  /* ---------------- VISÃO GERAL ---------------- */
  const R = {};
  R.geral = host => {
    if (!CTX.robos.length || !CTX.dias.length) { host.innerHTML = '<div class="vazio">Nenhum robô/pregão no filtro.</div>'; return; }
    const cd = carteiraDiaria(), lab = CTX.dias.map(d => D.dias[d]);
    const v = cd.filter(x => x != null), tot = v.reduce((a, b) => a + b, 0);
    let diasRobo = 0, robos100 = 0; const porRobo = CTX.robos.map(r => { const x = valsRobo(r); diasRobo += x.length; const s = x.reduce((a, b) => a + b, 0); if (x.length && s / x.length >= 100) robos100++; return { r, n: x.length, s, m: x.length ? s / x.length : 0 }; });
    const sub = submerso(cd), dd = Math.min(0, ...sub);
    const best = Math.max(...v), worst = Math.min(...v), iB = cd.indexOf(best), iW = cd.indexOf(worst);
    host.innerHTML = `<div class="tiles">
      ${tile('Resultado no período', F.brl(tot), `${CTX.robos.length} robôs somados`, tot < 0 ? 'neg' : '')}
      ${tile('Por pregão (carteira)', F.brl(tot / v.length), `${v.length} pregões`, tot < 0 ? 'neg' : '')}
      ${tile('Por robô por dia', F.brl(tot / Math.max(1, diasRobo)), `${diasRobo} dias-robô · alvo R$ 100`)}
      ${tile('Pregões positivos', F.pct(100 * v.filter(x => x > 0).length / v.length), `${v.filter(x => x > 0).length} de ${v.length}`)}
      ${tile('Melhor pregão', F.brl(best), F.dataBrA(lab[iB]))}
      ${tile('Pior pregão', F.brl(worst), F.dataBrA(lab[iW]), 'neg')}
      ${tile('Queda máxima', F.brl(dd), 'do pico ao fundo, carteira', dd < 0 ? 'neg' : '')}
      ${tile('Robôs ≥ R$ 100/dia', robos100 + ' de ' + CTX.robos.length, 'média no período filtrado')}
    </div>
    <div class="card"><div class="cab"><h2>Resultado acumulado da carteira</h2><span class="sub">soma dos robôs filtrados · clique para abrir o dia</span></div><div id="gAcum"></div></div>
    <div class="grid2">
      <div class="card"><div class="cab"><h2>Resultado por pregão</h2><span class="sub">clique na barra para abrir o dia</span></div><div id="gDia"></div></div>
      <div class="card"><div class="cab"><h2>Queda a partir do pico</h2><span class="sub">quanto a carteira estava abaixo do melhor acumulado</span></div><div id="gSub"></div></div>
    </div>
    <div class="grid2">
      <div class="card"><h2>Melhores robôs no período</h2><div id="tTop"></div></div>
      <div class="card"><h2>Piores robôs no período</h2><div id="tBot"></div></div>
    </div>`;
    const ac = acum(cd);
    const tipDia = i => { const d = CTX.dias[i]; let mx = null, mn = null; for (const r of CTX.robos) { const x = RES[r].f[d]; if (isNaN(x)) continue; if (!mx || x > mx.v) mx = { r, v: x }; if (!mn || x < mn.v) mn = { r, v: x }; }
      return `<b>${SEM[DIA[d].dow]} ${F.dataBrA(D.dias[d])}</b><div class="linha"><span>Dia</span><span>${F.sbrl(cd[i])}</span></div><div class="linha"><span>Acumulado</span><span>${F.brl(ac[i])}</span></div>`
        + (mx ? `<div class="linha"><span>Melhor: ${F.esc(ROB[mx.r].n)}</span><span>${F.sbrl(mx.v)}</span></div><div class="linha"><span>Pior: ${F.esc(ROB[mn.r].n)}</span><span>${F.sbrl(mn.v)}</span></div>` : '')
        + `<div class="linha"><span>Amplitude / A10</span><span>${F.n0(DIA[d].amp)} / ${F.n0(DIA[d].a10)}</span></div>`; };
    const abrirDia = i => { S.dia = CTX.dias[i]; abrirAba('dia'); };
    G.line($('gAcum'), { labels: lab, series: [{ name: 'Acumulado', color: 'var(--s1)', vals: ac }], h: 240, fmtX: F.dataBr, tip: tipDia, onClick: abrirDia });
    G.bars($('gDia'), { labels: lab, vals: cd, h: 200, fmtX: F.dataBr, tip: tipDia, onClick: abrirDia });
    G.line($('gSub'), { labels: lab, series: [{ name: 'Queda', color: 'var(--neg)', vals: sub, fill: true }], h: 200, fmtX: F.dataBr });
    const cols = [{ k: 'nome', t: 'Robô', l: 1, nome: 1, html: x => linkRobo(x.r), s: x => ROB[x.r].n }, { k: 'n', t: 'Pregões', f: F.n0 }, { k: 's', t: 'Total', f: v => F.brl(v), cor: 1 }, { k: 'm', t: 'R$/dia', f: v => F.brl(v), cor: 1 }, { k: 'sp', t: 'Curva', html: x => G.spark(valsRobo(x.r)) }];
    porRobo.forEach(x => x.nome = ROB[x.r].n);
    const ord = porRobo.slice().sort((a, b) => b.s - a.s);
    tabela($('tTop'), 'top', cols, ord.slice(0, 8), { sort: { k: 's', d: -1 }, depois: ligarNomes });
    tabela($('tBot'), 'bot', cols, ord.slice(-8), { sort: { k: 's', d: 1 }, depois: ligarNomes });
  };

  /* ---------------- MAPA DE CALOR ---------------- */
  R.calor = host => {
    if (!CTX.robos.length || !CTX.dias.length) { host.innerHTML = '<div class="vazio">Nenhum robô/pregão no filtro.</div>'; return; }
    const clamp = S.calorClamp || 500;
    const rows = CTX.robos.map(r => ({ r, s: valsRobo(r).reduce((a, b) => a + b, 0) })).sort((a, b) => b.s - a.s);
    const cor = v => { if (isNaN(v)) return ''; const p = Math.round(Math.min(1, Math.abs(v) / clamp) * 100); return `background:color-mix(in oklab, ${v < 0 ? 'var(--neg)' : 'var(--pos)'} ${p}%, var(--neutral))`; };
    let h = `<div class="card"><div class="cab"><h2>Resultado por robô e por pregão</h2>
      <div class="ctrl">Saturação em <select id="cClamp">${[100, 250, 500, 1000, 2000].map(c => `<option ${c === clamp ? 'selected' : ''} value="${c}">R$ ${c}</option>`).join('')}</select>
      <span class="escala"><span>−${clamp}</span><span class="gr"></span><span>+${clamp}</span></span></div></div>
      <div class="sub" style="margin-bottom:6px">Clique numa célula para abrir o dia; no nome para abrir o robô. Célula vazia = não operou.</div>
      <div class="tw" style="max-height:75vh"><table class="heat"><thead><tr><th></th>${CTX.dias.map(d => `<th class="dia">${F.dataBr(D.dias[d])}</th>`).join('')}<th>Total</th></tr></thead><tbody>`;
    for (const x of rows) { h += `<tr><td class="r" data-robo="${x.r}">${F.esc(ROB[x.r].n)}</td>`;
      for (const d of CTX.dias) { const v = RES[x.r].f[d]; h += isNaN(v) ? '<td class="c na"></td>' : `<td class="c" style="${cor(v)}" data-r="${x.r}" data-d="${d}"></td>`; }
      h += `<td class="tot ${F.cls(x.s)}">${F.brl(x.s)}</td></tr>`; }
    h += '</tbody></table></div></div>';
    host.innerHTML = h;
    $('cClamp').onchange = e => { S.calorClamp = +e.target.value; salvar(); R.calor(host); };
    host.querySelectorAll('td.r').forEach(td => td.onclick = () => abrirRobo(+td.dataset.robo));
    host.querySelectorAll('td.c[data-r]').forEach(td => {
      td.onmousemove = ev => { const r = +td.dataset.r, d = +td.dataset.d, o = RES[r]; Tip.show(`<b>${F.esc(ROB[r].n)}</b><br>${SEM[DIA[d].dow]} ${F.dataBrA(D.dias[d])}<div class="linha"><span>Final</span><span>${F.sbrl(o.f[d])}</span></div><div class="linha"><span>Mínimo / Máximo</span><span>${F.n0(o.mn[d])} / ${F.n0(o.mx[d])}</span></div><div class="linha"><span>Devolveu do pico</span><span>${F.brl(o.mx[d] - o.f[d])}</span></div>`, ev); };
      td.onmouseleave = Tip.hide; td.onclick = () => { S.dia = +td.dataset.d; abrirAba('dia'); }; });
  };
  const Tip = G.Tip;

  /* ---------------- DIA ---------------- */
  R.dia = host => {
    if (!CTX.dias.length) { host.innerHTML = '<div class="vazio">Nenhum pregão no filtro.</div>'; return; }
    let d = S.dia; if (d == null || !CTX.diaSet.has(d)) d = CTX.dias[CTX.dias.length - 1]; S.dia = d;
    const pos = CTX.dias.indexOf(d);
    const rows = CTX.robos.filter(r => !isNaN(RES[r].f[d]) && (RES[r].f[d] || RES[r].mn[d] || RES[r].mx[d])).map(r => { const o = RES[r]; const ro = ROB[r]; const ops = OPS_R[r].filter(x => x.d === d);
      const trava = ro.pd > 0 && o.f[d] <= -0.95 * ro.pd ? 'PERDA' : ro.mt > 0 && o.f[d] >= 0.95 * ro.mt ? 'META' : '';
      return { r, nome: ro.n, f: o.f[d], mn: o.mn[d], mx: o.mx[d], dev: o.mx[d] - o.f[d], trava, mp: o.mp[d], nops: ops.length, acerto: ops.length ? 100 * ops.filter(x => x.liq > 0).length / ops.length : null }; });
    const tot = rows.reduce((a, b) => a + b.f, 0);
    const intra = D.intra[d] || {};
    host.innerHTML = `<div class="det-cab"><button class="btn" id="dAnt" ${pos > 0 ? '' : 'disabled'}>‹ anterior</button>
      <select id="dSel">${CTX.dias.slice().reverse().map(x => `<option value="${x}" ${x === d ? 'selected' : ''}>${SEM[DIA[x].dow]} ${F.dataBrA(D.dias[x])}</option>`).join('')}</select>
      <button class="btn" id="dProx" ${pos < CTX.dias.length - 1 ? '' : 'disabled'}>próximo ›</button></div>
      <div class="tiles">${tile('Resultado do dia', F.sbrl(tot), `${rows.length} robôs operaram`, tot < 0 ? 'neg' : '')}
      ${tile('Positivos / negativos', `${rows.filter(x => x.f > 0).length} / ${rows.filter(x => x.f < 0).length}`, '')}
      ${tile('Bateram meta / perda', `${rows.filter(x => x.trava === 'META').length} / ${rows.filter(x => x.trava === 'PERDA').length}`, 'final ≥ 95% da meta ou perda da Aba Risco')}
      ${tile('Amplitude do dia', F.n0(DIA[d].amp) + ' pts', `A10 na abertura: ${F.n0(DIA[d].a10)} (${DIA[d].a10 >= 3000 ? 'amplo' : 'estreito'})`)}
      ${tile('Devolução somada', F.brl(rows.reduce((a, b) => a + b.dev, 0)), 'máximo do dia − final, somado')}</div>
      <div class="card"><div class="cab"><h2>Curva intradiária</h2><span class="sub">grade de 10 min · marque robôs na tabela para comparar (até 8)</span></div><div class="legenda" id="dLeg"></div><div id="gIntra"></div></div>
      <div class="card"><h2>Robôs no dia</h2><div id="tDia"></div></div>`;
    $('dSel').onchange = e => { S.dia = +e.target.value; salvar(); R.dia(host); };
    $('dAnt').onclick = () => { S.dia = CTX.dias[pos - 1]; salvar(); R.dia(host); };
    $('dProx').onclick = () => { S.dia = CTX.dias[pos + 1]; salvar(); R.dia(host); };
    const lab = D.grade.map(F.hora);
    const soma = D.grade.map((_, k) => { let s = 0, n = 0; for (const x of rows) { const a = intra[x.r]; if (a) { s += a[k]; n++; } } return n ? s : null; });
    const series = [{ name: 'Soma dos robôs filtrados', color: 'var(--text-secondary)', vals: soma, w: 2.5 }];
    S.comp.forEach((w, k) => { const r = ROB.findIndex(x => x.w === w); if (r >= 0 && intra[r]) series.push({ name: ROB[r].n, color: SLOTS[k], vals: intra[r] }); });
    $('dLeg').innerHTML = series.map(s => `<span><i style="background:${s.color}"></i>${F.esc(s.name)}</span>`).join('');
    G.line($('gIntra'), { labels: lab, series, h: 260, rotulosFim: series.length <= 4 });
    const cols = [
      { k: 'cmp', t: '', html: x => `<input type="checkbox" data-comp="${x.r}" ${corComp(x.r) ? 'checked' : ''}>${corComp(x.r) ? `<span class="cor-dot" style="background:${corComp(x.r)}"></span>` : ''}`, s: x => corComp(x.r) ? 1 : 0 },
      { k: 'nome', t: 'Robô', l: 1, nome: 1, html: x => linkRobo(x.r) }, { k: 'f', t: 'Final', f: v => F.sbrl(v), cor: 1 }, { k: 'mn', t: 'Mínimo', f: F.n0, cor: 1 }, { k: 'mx', t: 'Máximo', f: F.n0 },
      { k: 'dev', t: 'Devolveu', f: F.n0, title: 'máximo do dia − final' }, { k: 'trava', t: 'Trava', l: 1, html: x => x.trava ? `<span class="selo ${x.trava === 'META' ? 'good' : 'bad'}"><i>${x.trava === 'META' ? '✓' : '✕'}</i>${x.trava}</span>` : '' },
      { k: 'mp', t: 'Pos. máx', f: F.n0 }, { k: 'nops', t: 'Operações', f: F.n0 }, { k: 'acerto', t: '% acerto', f: v => F.pct(v) },
      { k: 'sp', t: 'Intradiário', html: x => { const a = intra[x.r]; if (!a) return ''; const dif = a.map((v, k) => k ? v - a[k - 1] : v); return G.spark(dif, 110, 22); } }];
    tabela($('tDia'), 'dia', cols, rows, { sort: { k: 'f', d: -1 }, depois: h => { ligarNomes(h); ligarComp(h, () => R.dia(host)); } });
  };
  function ligarComp(h, refaz) { h.querySelectorAll('[data-comp]').forEach(cb => cb.onchange = () => { const w = ROB[+cb.dataset.comp].w; if (cb.checked) { if (S.comp.length >= 8) { cb.checked = false; cb.title = 'Máximo de 8 robôs na comparação'; return; } S.comp = [...S.comp, w]; } else S.comp = S.comp.filter(x => x !== w); salvar(); refaz(); }); }

  /* ---------------- OPERAÇÕES ---------------- */
  R.ops = host => {
    const ops = CTX.opsF;
    if (!ops.length) { host.innerHTML = '<div class="vazio">Nenhuma operação no filtro.</div>'; return; }
    const m = M.operacoes(ops);
    host.innerHTML = `<div class="tiles">
      ${tile('Operações', F.n0(m.n), `${F.n0(m.nG)} vencedoras · ${F.n0(m.nL)} perdedoras`)}
      ${tile('Líquido total', F.brl(m.liq), `custos ${F.brl(-m.custo)}`, m.liq < 0 ? 'neg' : '')}
      ${tile('Expectativa por operação', F.brl(m.exp, 2), 'média do líquido', m.exp < 0 ? 'neg' : '')}
      ${tile('% vencedoras', F.pct(m.acerto, 1), `payoff ${F.n2(m.payoff)}`)}
      ${tile('Fator de lucro', F.n2(m.pf), `lucro ${F.brl(m.bruto)} / prejuízo ${F.brl(-m.prej)}`)}
      ${tile('Duração média', F.min(m.durMed), `vencedoras ${F.min(m.durG)} · perdedoras ${F.min(m.durL)}`)}
    </div>
    <div class="grid2">
      <div class="card"><div class="cab"><h2>Líquido por hora de entrada</h2><span class="sub">soma das operações que abriram naquela hora</span></div><div id="gHora"></div></div>
      <div class="card"><div class="cab"><h2>Distribuição do resultado por operação</h2><span class="sub">quantas operações em cada faixa de R$</span></div><div id="gHist"></div></div>
    </div>
    <div class="grid3">
      <div class="card"><h2>Compra × venda</h2><div id="tLado"></div></div>
      <div class="card"><h2>Pelo resultado do robô no dia antes da operação</h2><div id="tAntes"></div></div>
      <div class="card"><h2>Por duração</h2><div id="tDur"></div></div>
    </div>
    <div class="card"><div class="cab"><h2>Operações</h2><button class="btn" id="opCsv">Exportar CSV</button></div><div id="tOps"></div></div>`;
    const horas = []; for (let h = 9; h <= 17; h++) horas.push(h);
    const porH = horas.map(h => ops.filter(o => Math.floor(o.ini / 60) === h));
    G.bars($('gHora'), { labels: horas.map(h => h + 'h'), vals: porH.map(a => a.reduce((s, o) => s + o.liq, 0)), h: 200,
      tip: i => { const a = porH[i]; const mm = M.operacoes(a); return `<b>Entradas das ${horas[i]}h às ${horas[i]}h59</b><div class="linha"><span>Líquido</span><span>${F.sbrl(mm.liq)}</span></div><div class="linha"><span>Operações</span><span>${a.length}</span></div><div class="linha"><span>% vencedoras</span><span>${F.pct(mm.acerto)}</span></div><div class="linha"><span>Expectativa</span><span>${F.brl(mm.exp, 2)}</span></div>`; } });
    const lo = Math.min(...ops.map(o => o.liq)), hi = Math.max(...ops.map(o => o.liq));
    const passo = G.nice(lo, hi, 24).ticks; const bs = passo.length > 1 ? passo[1] - passo[0] : 50;
    const b0 = Math.floor(lo / bs) * bs, nb = Math.min(80, Math.ceil((hi - b0) / bs) + 1); const cnt = new Array(nb).fill(0); for (const o of ops) cnt[Math.min(nb - 1, Math.floor((o.liq - b0) / bs))]++;
    G.bars($('gHist'), { labels: cnt.map((_, i) => b0 + i * bs), vals: cnt, h: 200, fmtX: v => F.n0(v), lblW: 50, color: (v, i) => (b0 + i * bs + bs / 2) < 0 ? 'var(--neg)' : 'var(--pos)', fmtY: F.n0,
      tip: i => `<b>${F.brl(b0 + i * bs)} a ${F.brl(b0 + (i + 1) * bs)}</b><br>${cnt[i]} operações` });
    const grp = (fn, nomes) => { const g = {}; for (const o of ops) { const k = fn(o); (g[k] = g[k] || []).push(o); } return Object.keys(g).map(k => Object.assign({ g: nomes ? nomes(k) : k }, M.operacoes(g[k]))); };
    const colsG = [{ k: 'g', t: '', l: 1 }, { k: 'n', t: 'Ops', f: F.n0 }, { k: 'liq', t: 'Líquido', f: v => F.brl(v), cor: 1 }, { k: 'exp', t: 'Por op', f: v => F.brl(v, 2), cor: 1 }, { k: 'acerto', t: '% venc.', f: v => F.pct(v) }, { k: 'pf', t: 'F. lucro', f: F.n2 }];
    tabela($('tLado'), 'oLado', colsG, grp(o => o.lado, k => k === '1' ? 'Compra' : 'Venda'), { sort: { k: 'g', d: 1 } });
    tabela($('tAntes'), 'oAntes', colsG, grp(o => o.antes > 0 ? '1' : o.antes < 0 ? '3' : '2', k => ({ 1: 'Robô positivo', 2: 'Zerado (1ª op)', 3: 'Robô negativo' })[k]), { sort: { k: 'g', d: 1 } });
    const faixas = [[0, 5, 'até 5 min'], [5, 15, '5–15 min'], [15, 30, '15–30 min'], [30, 60, '30–60 min'], [60, 120, '1–2 h'], [120, 1e9, 'mais de 2 h']];
    tabela($('tDur'), 'oDur', colsG, grp(o => faixas.findIndex(f => o.dur >= f[0] && o.dur < f[1]), k => (faixas[k] || [0, 0, '?'])[2]).map(x => Object.assign(x, { ord: faixas.findIndex(f => f[2] === x.g) })), { sort: { k: 'ord', d: 1 } });
    const rows = ops.map(o => ({ o, data: D.dias[o.d], nome: ROB[o.r].n, ini: o.ini, fim: o.fim, lado: o.lado, ct: o.ct, liq: o.liq, dur: o.dur, mae: o.mae < 0 ? null : o.mae, mfe: o.mfe < 0 ? null : o.mfe, antes: o.antes }));
    const cols = [{ k: 'data', t: 'Data', l: 1, f: v => F.dataBrA(v) }, { k: 'nome', t: 'Robô', l: 1, nome: 1, html: x => linkRobo(x.o.r) }, { k: 'ini', t: 'Entrada', f: F.hora }, { k: 'fim', t: 'Saída', f: F.hora },
      { k: 'lado', t: 'Lado', l: 1, f: v => v > 0 ? 'Compra' : 'Venda' }, { k: 'ct', t: 'Ctt máx', f: F.n0 }, { k: 'liq', t: 'Líquido', f: v => F.sbrl(v, 2), cor: 1 }, { k: 'dur', t: 'Duração', f: F.min },
      { k: 'mae', t: 'MAE (pts)', f: F.n0, title: 'quanto foi contra antes de sair' }, { k: 'mfe', t: 'MFE (pts)', f: F.n0, title: 'quanto foi a favor antes de sair' }, { k: 'antes', t: 'Dia antes', f: v => F.sbrl(v), cor: 1, title: 'resultado do robô no dia antes desta operação' }];
    const ord = tabela($('tOps'), 'ops', cols, rows, { sort: { k: 'data', d: -1 }, limite: 200, depois: ligarNomes });
    $('opCsv').onclick = () => csv('operacoes.csv', cols, rows.map(x => Object.assign({}, x, { nome: x.nome })));
  };

  /* ---------------- GRUPOS ---------------- */
  R.grupos = host => {
    const OPC = { familia: 'Família', estrategia: 'Estratégia', grafico: 'Tempo gráfico', conta: 'Conta', semana: 'Dia da semana', regime: 'Regime A10', mes: 'Mês', amp: 'Faixa de amplitude do dia', situacao: 'Situação' };
    const g = S.grupo in OPC ? S.grupo : 'familia';
    const chaveRobo = { familia: r => ROB[r].f, estrategia: r => ROB[r].e || '(removido)', grafico: r => ROB[r].g ? ROB[r].g.split('/')[1] + ' min' : '(removido)', conta: r => ROB[r].c, situacao: r => ROB[r].at ? 'No Profit hoje' : 'Removido' };
    const chaveDia = { semana: d => DIA[d].dow + ' ' + SEM[DIA[d].dow], regime: d => DIA[d].a10 == null ? 'sem A10' : DIA[d].a10 >= 3000 ? 'Amplo (≥ 3000)' : 'Estreito (< 3000)', mes: d => D.dias[d].slice(0, 7),
      amp: d => { const a = DIA[d].amp; return a == null ? 'sem dado' : a < 2000 ? '1: < 2000' : a < 3000 ? '2: 2000–3000' : a < 4000 ? '3: 3000–4000' : '4: ≥ 4000'; } };
    const acc = {};
    for (const r of CTX.robos) for (const d of CTX.dias) { const v = RES[r].f[d]; if (isNaN(v)) continue; const k = chaveRobo[g] ? chaveRobo[g](r) : chaveDia[g](d);
      const a = acc[k] = acc[k] || { g: k, robos: new Set(), dias: new Set(), vals: [], ops: [] }; a.robos.add(r); a.dias.add(d); a.vals.push(v); }
    for (const o of CTX.opsF) { const k = chaveRobo[g] ? chaveRobo[g](o.r) : chaveDia[g](o.d); if (acc[k]) acc[k].ops.push(o); }
    const rows = Object.values(acc).map(a => { const s = a.vals.reduce((x, y) => x + y, 0), mo = M.operacoes(a.ops);
      return { g: a.g, nr: a.robos.size, nd: a.dias.size, ndr: a.vals.length, tot: s, porDR: s / a.vals.length, porPregao: s / a.dias.size, pctPos: 100 * a.vals.filter(x => x > 0).length / a.vals.length, pior: Math.min(...a.vals), melhor: Math.max(...a.vals), nops: mo.n, exp: mo.exp, acerto: mo.acerto, pf: mo.pf }; });
    host.innerHTML = `<div class="card"><div class="cab"><h2>Agrupar por</h2><div class="ctrl"><select id="gSel">${Object.keys(OPC).map(k => `<option value="${k}" ${k === g ? 'selected' : ''}>${OPC[k]}</option>`).join('')}</select></div></div>
      <div class="sub" style="margin-bottom:6px">R$ por dia-robô = resultado médio de um robô num pregão. Alvo: R$ 100.</div><div id="gG"></div></div><div class="card"><div id="tG"></div></div>`;
    $('gSel').onchange = e => { S.grupo = e.target.value; salvar(); R.grupos(host); };
    const ord = rows.slice().sort((a, b) => b.porDR - a.porDR);
    G.hbars($('gG'), { labels: ord.map(x => x.g.replace(/^\d: |^\d /, '')), vals: ord.map(x => x.porDR), fmtV: v => F.brl(v),
      tip: i => { const x = ord[i]; return `<b>${F.esc(x.g)}</b><div class="linha"><span>R$/dia-robô</span><span>${F.brl(x.porDR)}</span></div><div class="linha"><span>Total</span><span>${F.brl(x.tot)}</span></div><div class="linha"><span>Robôs / dias-robô</span><span>${x.nr} / ${x.ndr}</span></div>`; } });
    tabela($('tG'), 'grp', [{ k: 'g', t: OPC[g], l: 1, f: v => F.esc(String(v).replace(/^\d: |^\d /, '')) }, { k: 'nr', t: 'Robôs', f: F.n0 }, { k: 'nd', t: 'Pregões', f: F.n0 }, { k: 'ndr', t: 'Dias-robô', f: F.n0 },
      { k: 'tot', t: 'Total', f: v => F.brl(v), cor: 1 }, { k: 'porDR', t: 'R$/dia-robô', f: v => F.brl(v), cor: 1 }, { k: 'porPregao', t: 'R$/pregão (soma)', f: v => F.brl(v), cor: 1 }, { k: 'pctPos', t: '% dias +', f: v => F.pct(v) },
      { k: 'melhor', t: 'Melhor dia-robô', f: F.n0 }, { k: 'pior', t: 'Pior dia-robô', f: F.n0, cor: 1 }, { k: 'nops', t: 'Operações', f: F.n0 }, { k: 'exp', t: 'R$/operação', f: v => F.brl(v, 2), cor: 1 }, { k: 'acerto', t: '% venc.', f: v => F.pct(v) }, { k: 'pf', t: 'F. lucro', f: F.n2 }], rows, { sort: { k: 'porDR', d: -1 } });
  };

  /* exporta para indicadores.js */
  window.P = { D, F, DIA, ROB, RES, OPS, OPS_R, SLOTS, SEM, R, get S() { return S; }, get CTX() { return CTX; }, salvar, tabela, csv, ligarNomes, ligarComp, abrirRobo, abrirAba, linkRobo, corComp, tile, acum, submerso, valsRobo, carteiraDiaria, render, $ };
  document.addEventListener('DOMContentLoaded', () => { });
  // dentro do claude.ai (frame) downloads são bloqueados: esconde os botões de CSV
  try { if (window.self !== window.top) document.documentElement.classList.add('emframe'); } catch (e) { document.documentElement.classList.add('emframe'); }
  // versão com senha (GitHub Pages): cripto.js decifra os dados, carrega os scripts e chama PainelIniciar
  window.PainelIniciar = () => { montarFiltros(); calcular(); abrirAba(S.aba); };
  window.addEventListener('load', () => { if (!window.PAINEL_MANUAL) window.PainelIniciar(); });
})();
