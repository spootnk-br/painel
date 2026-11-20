/* Gráficos em SVG puro (sem internet). Cores por variável CSS -> trocar o tema não exige redesenhar. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const F = {
    brl(v, dec) { if (v == null || !isFinite(v)) return '–'; const s = (dec === 2 ? nf2 : nf0).format(Math.abs(v)); return (v < 0 ? '−R$ ' : 'R$ ') + s; },
    sbrl(v, dec) { if (v == null || !isFinite(v)) return '–'; return (v > 0 ? '+' : '') + F.brl(v, dec); },
    n0(v) { return v == null || !isFinite(v) ? '–' : (v < 0 ? '−' : '') + nf0.format(Math.abs(v)); },
    n1(v) { return v == null || !isFinite(v) ? '–' : (v < 0 ? '−' : '') + nf1.format(Math.abs(v)); },
    n2(v) { return v == null || !isFinite(v) ? '–' : (v < 0 ? '−' : '') + nf2.format(Math.abs(v)); },
    pct(v, dec) { return v == null || !isFinite(v) ? '–' : (dec ? nf1 : nf0).format(v) + '%'; },
    min(m) { if (m == null || !isFinite(m)) return '–'; if (m < 1) return Math.round(m * 60) + 's'; if (m < 60) return Math.floor(m) + 'min' + (m % 1 ? String(Math.round((m % 1) * 60)).padStart(2, '0') + 's' : ''); return Math.floor(m / 60) + 'h' + String(Math.round(m % 60)).padStart(2, '0'); },
    hora(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); },
    dataBr(iso) { const p = iso.split('-'); return p[2] + '/' + p[1]; },
    dataBrA(iso) { const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; },
    cls(v) { return v < 0 ? 'neg' : 'pos'; },
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  };

  const tipEl = () => document.getElementById('tip');
  const Tip = {
    show(html, ev) { const t = tipEl(); t.innerHTML = html; t.style.display = 'block'; Tip.move(ev); },
    move(ev) { const t = tipEl(); const w = t.offsetWidth, h = t.offsetHeight; let x = ev.clientX + 14, y = ev.clientY + 14;
      if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y + h > innerHeight - 8) y = ev.clientY - h - 14; t.style.left = x + 'px'; t.style.top = y + 'px'; },
    hide() { tipEl().style.display = 'none'; }
  };

  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function nice(min, max, n) {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (min === max) { min -= 1; max += 1; }
    const span = max - min, raw = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step; const t = [];
    for (let v = lo; v <= hi + step / 2; v += step) t.push(Math.abs(v) < step / 1e6 ? 0 : v);
    return { lo, hi, ticks: t };
  }
  function largura(host) { let w = host.clientWidth; if (!w) { let p = host.parentElement; while (p && !p.clientWidth) p = p.parentElement; w = p ? p.clientWidth - 30 : 800; } return Math.max(260, w); }
  function compactY(v) { const a = Math.abs(v); if (a >= 10000) return (v < 0 ? '−' : '') + nf0.format(a / 1000) + 'k'; return F.n0(v); }
  function eixoX(svg, labels, x, y0, maxLbl, fmtX) {
    const n = labels.length; if (!n) return; const every = Math.max(1, Math.ceil(n / maxLbl));
    for (let i = 0; i < n; i += every) { const t = el('text', { x: x(i), y: y0 + 15, 'text-anchor': 'middle' }, svg); t.textContent = fmtX ? fmtX(labels[i], i) : labels[i]; }
  }
  function eixoY(svg, sc, y, L, W, fmtY) {
    for (const v of sc.ticks) { const yy = y(v);
      el('line', { x1: L, x2: W, y1: yy, y2: yy, style: v === 0 ? 'stroke:var(--axis);stroke-width:1' : 'stroke:var(--grid);stroke-width:1' }, svg);
      const t = el('text', { x: L - 6, y: yy + 4, 'text-anchor': 'end' }, svg); t.textContent = (fmtY || compactY)(v); }
  }
  // barra com ponta arredondada de 4px no lado do dado, ancorada na linha de base
  function barPath(x, w, yb, yv) {
    const h = Math.abs(yv - yb); const r = Math.min(4, w / 2, h);
    if (h < 0.5) return `M${x},${yb}h${w}`;
    if (yv < yb) return `M${x},${yb}V${yv + r}Q${x},${yv} ${x + r},${yv}H${x + w - r}Q${x + w},${yv} ${x + w},${yv + r}V${yb}Z`;
    return `M${x},${yb}V${yv - r}Q${x},${yv} ${x + r},${yv}H${x + w - r}Q${x + w},${yv} ${x + w},${yv - r}V${yb}Z`;
  }

  /* Linhas com mira + tooltip. opt: {labels, series:[{name,color,vals,fill?}], h, fmtY, fmtX, tip(i)->html, onClick(i), rotulosFim} */
  function line(host, opt) {
    host.innerHTML = ''; host.classList.add('chart');
    const W = largura(host), H = opt.h || 220, L = 52, R = opt.rotulosFim ? 120 : 12, T = 10, B = 24;
    const labels = opt.labels, n = labels.length; if (!n) { host.innerHTML = '<div class="vazio">Sem dados no filtro</div>'; return; }
    let mn = Infinity, mx = -Infinity; const viu = v => { if (v != null && isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; } };
    for (const s of opt.series) s.vals.forEach(viu); if (opt.band) { opt.band.lo.forEach(viu); opt.band.hi.forEach(viu); } (opt.refs || []).forEach(r => viu(r.v));
    if (opt.zero !== false) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); }
    const sc = nice(mn, mx, 5);
    const x = i => n === 1 ? (L + W - R) / 2 : L + (W - R - L) * i / (n - 1);
    const y = v => T + (H - T - B) * (1 - (v - sc.lo) / (sc.hi - sc.lo));
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, host);
    if (opt.shade) { const hw = n > 1 ? (W - R - L) / (n - 1) / 2 : 10; opt.shade.forEach((on, i) => { if (on) el('rect', { x: x(i) - hw, y: T, width: 2 * hw, height: H - T - B, style: 'fill:var(--s1);opacity:.07' }, svg); }); }
    eixoY(svg, sc, y, L, W - R, opt.fmtY); eixoX(svg, labels, x, H - B, Math.floor((W - L - R) / 60), opt.fmtX);
    if (opt.vline != null) { el('line', { x1: x(opt.vline), x2: x(opt.vline), y1: T, y2: H - B, style: 'stroke:var(--axis);stroke-width:1' }, svg); if (opt.vlineLbl) { const t = el('text', { x: x(opt.vline) + 4, y: T + 10 }, svg); t.textContent = opt.vlineLbl; } }
    for (const r of (opt.refs || [])) { el('line', { x1: L, x2: W - R, y1: y(r.v), y2: y(r.v), style: `stroke:${r.c || 'var(--muted)'};stroke-width:1;opacity:.8` }, svg); const t = el('text', { x: W - R - 2, y: y(r.v) - 3, 'text-anchor': 'end' }, svg); t.textContent = r.t; }
    if (opt.band) { let up = '', dn = ''; for (let i = 0; i < n; i++) { const a = opt.band.hi[i], b = opt.band.lo[i]; if (a == null || b == null) continue; up += (up ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(a).toFixed(1); }
      for (let i = n - 1; i >= 0; i--) { const b = opt.band.lo[i]; if (b == null || opt.band.hi[i] == null) continue; dn += 'L' + x(i).toFixed(1) + ',' + y(b).toFixed(1); }
      if (up) el('path', { d: up + dn + 'Z', style: `fill:${opt.band.c || 'var(--s1)'};opacity:.13;stroke:none` }, svg); }
    for (const s of opt.series) {
      let d = '', pen = false; s.vals.forEach((v, i) => { if (v == null || !isFinite(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true; });
      if (s.fill) { const y0 = y(Math.max(sc.lo, Math.min(0, sc.hi))); let a = ''; s.vals.forEach((v, i) => { if (v == null) return; a += (a ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); });
        if (a) el('path', { d: a + `L${x(n - 1)},${y0}L${x(0)},${y0}Z`, style: `fill:${s.color};opacity:.14;stroke:none` }, svg); }
      el('path', { d, style: `fill:none;stroke:${s.color};stroke-width:${s.w || 2};stroke-linejoin:round;stroke-linecap:round` }, svg);
      if (n === 1 && s.vals[0] != null) el('circle', { cx: x(0), cy: y(s.vals[0]), r: 4, style: `fill:${s.color}` }, svg);
    }
    if (opt.rotulosFim && opt.series.length <= 4) { // rótulo direto no fim (até 4 séries), afastando colisões
      const ends = opt.series.map(s => { let i = s.vals.length - 1; while (i >= 0 && (s.vals[i] == null || !isFinite(s.vals[i]))) i--; return { s, yy: i >= 0 ? y(s.vals[i]) : null }; }).filter(e => e.yy != null).sort((a, b) => a.yy - b.yy);
      for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 13) ends[i].yy = ends[i - 1].yy + 13;
      for (const e of ends) { const t = el('text', { x: W - R + 6, y: e.yy + 4, class: 'lbl' }, svg); t.textContent = e.s.name.length > 18 ? e.s.name.slice(0, 17) + '…' : e.s.name; }
    }
    const cross = el('line', { y1: T, y2: H - B, style: 'stroke:var(--axis);stroke-width:1;display:none' }, svg);
    const dots = opt.series.map(s => el('circle', { r: 4, style: `fill:${s.color};stroke:var(--surface-1);stroke-width:2;display:none` }, svg));
    const ov = el('rect', { x: L, y: T, width: Math.max(1, W - R - L), height: H - T - B, style: 'fill:transparent;cursor:crosshair' }, svg);
    const idx = ev => { const r = svg.getBoundingClientRect(); const px = ev.clientX - r.left; return Math.max(0, Math.min(n - 1, Math.round((px - L) / ((W - R - L) / Math.max(1, n - 1))))); };
    ov.addEventListener('mousemove', ev => { const i = idx(ev); cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.display = '';
      opt.series.forEach((s, k) => { const v = s.vals[i]; if (v == null || !isFinite(v)) { dots[k].style.display = 'none'; return; } dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(v)); dots[k].style.display = ''; });
      let html = opt.tip ? opt.tip(i) : `<b>${F.esc(opt.fmtX ? opt.fmtX(labels[i], i) : labels[i])}</b>` + opt.series.map(s => `<div class="linha"><span><i style="background:${s.color}"></i>${F.esc(s.name)}</span><span>${(opt.fmtTip || F.brl)(s.vals[i])}</span></div>`).join('');
      Tip.show(html, ev); });
    ov.addEventListener('mouseleave', () => { cross.style.display = 'none'; dots.forEach(d => d.style.display = 'none'); Tip.hide(); });
    if (opt.onClick) ov.addEventListener('click', ev => opt.onClick(idx(ev)));
  }

  /* Barras verticais. opt: {labels, vals, h, color(v,i), fmtY, fmtX, tip(i), onClick(i)} */
  function bars(host, opt) {
    host.innerHTML = ''; host.classList.add('chart');
    const W = largura(host), H = opt.h || 180, L = 52, R = 12, T = 10, B = 24;
    const n = opt.vals.length; if (!n) { host.innerHTML = '<div class="vazio">Sem dados no filtro</div>'; return; }
    let mn = 0, mx = 0; const viu = v => { if (v != null && isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; } };
    opt.vals.forEach(viu); if (opt.whisk) { opt.whisk.lo.forEach(viu); opt.whisk.hi.forEach(viu); } (opt.refs || []).forEach(r => viu(r.v));
    const sc = nice(mn, mx, 4);
    const step = (W - L - R) / n, bw = Math.max(1, Math.min(40, step - 2));
    const x = i => L + step * i + (step - bw) / 2;
    const y = v => T + (H - T - B) * (1 - (v - sc.lo) / (sc.hi - sc.lo));
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, host);
    eixoY(svg, sc, y, L, W - R, opt.fmtY);
    if (opt.whisk) opt.vals.forEach((v, i) => { const a = opt.whisk.lo[i], b = opt.whisk.hi[i]; if (a == null || b == null || !isFinite(a)) return; const cx = x(i) + bw / 2;
      el('line', { x1: cx, x2: cx, y1: y(a), y2: y(b), style: 'stroke:var(--axis);stroke-width:1' }, svg); });
    for (const r of (opt.refs || [])) { el('line', { x1: L, x2: W - R, y1: y(r.v), y2: y(r.v), style: `stroke:${r.c || 'var(--muted)'};stroke-width:1;opacity:.8` }, svg); const t = el('text', { x: W - R - 2, y: y(r.v) - 3, 'text-anchor': 'end' }, svg); t.textContent = r.t; }
    const every = Math.max(1, Math.ceil(n / Math.floor((W - L - R) / (opt.lblW || 46))));
    for (let i = 0; i < n; i += every) { const t = el('text', { x: x(i) + bw / 2, y: H - B + 15, 'text-anchor': 'middle' }, svg); t.textContent = opt.fmtX ? opt.fmtX(opt.labels[i], i) : opt.labels[i]; }
    const y0 = y(0);
    opt.vals.forEach((v, i) => { if (v == null || !isFinite(v)) return;
      const c = opt.color ? opt.color(v, i) : (v < 0 ? 'var(--neg)' : 'var(--pos)');
      el('path', { d: barPath(x(i), bw, y0, y(v)), style: `fill:${c}` }, svg);
      const hit = el('rect', { x: L + step * i, y: T, width: step, height: H - T - B, style: 'fill:transparent;cursor:' + (opt.onClick ? 'pointer' : 'default') }, svg);
      hit.addEventListener('mousemove', ev => Tip.show(opt.tip ? opt.tip(i) : `<b>${F.esc(opt.fmtX ? opt.fmtX(opt.labels[i], i) : opt.labels[i])}</b><br>${(opt.fmtTip || F.sbrl)(v)}`, ev));
      hit.addEventListener('mouseleave', Tip.hide);
      if (opt.onClick) hit.addEventListener('click', () => opt.onClick(i)); });
  }

  /* Barras horizontais (ranking de grupos). opt: {labels, vals, fmtV, tip(i), onClick(i), color(v,i)} */
  function hbars(host, opt) {
    host.innerHTML = ''; host.classList.add('chart');
    const n = opt.vals.length; if (!n) { host.innerHTML = '<div class="vazio">Sem dados no filtro</div>'; return; }
    const W = largura(host), rowH = 22, T = 6, B = 20, Lb = Math.min(200, Math.max(90, ...opt.labels.map(s => String(s).length * 6.6))), R = 70;
    const H = T + B + rowH * n;
    let mn = 0, mx = 0; for (const v of opt.vals) if (isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const sc = nice(mn, mx, 4); const x = v => Lb + (W - Lb - R) * (v - sc.lo) / (sc.hi - sc.lo);
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, host);
    for (const v of sc.ticks) { el('line', { x1: x(v), x2: x(v), y1: T, y2: H - B, style: v === 0 ? 'stroke:var(--axis)' : 'stroke:var(--grid)' }, svg); const t = el('text', { x: x(v), y: H - B + 14, 'text-anchor': 'middle' }, svg); t.textContent = compactY(v); }
    opt.vals.forEach((v, i) => { const yy = T + rowH * i; const lab = el('text', { x: Lb - 8, y: yy + rowH / 2 + 4, 'text-anchor': 'end', style: 'fill:var(--text-secondary)' }, svg); lab.textContent = opt.labels[i];
      if (!isFinite(v)) return; const x0 = x(0), x1 = x(v), bh = rowH - 6;
      const c = opt.color ? opt.color(v, i) : (v < 0 ? 'var(--neg)' : 'var(--pos)'); const r = Math.min(4, bh / 2, Math.abs(x1 - x0));
      const d = v >= 0 ? `M${x0},${yy + 3}H${x1 - r}Q${x1},${yy + 3} ${x1},${yy + 3 + r}V${yy + 3 + bh - r}Q${x1},${yy + 3 + bh} ${x1 - r},${yy + 3 + bh}H${x0}Z`
                       : `M${x0},${yy + 3}H${x1 + r}Q${x1},${yy + 3} ${x1},${yy + 3 + r}V${yy + 3 + bh - r}Q${x1},${yy + 3 + bh} ${x1 + r},${yy + 3 + bh}H${x0}Z`;
      el('path', { d, style: `fill:${c}` }, svg);
      const vt = el('text', { x: v >= 0 ? x1 + 5 : x1 - 5, y: yy + rowH / 2 + 4, 'text-anchor': v >= 0 ? 'start' : 'end', style: 'fill:var(--text-secondary)' }, svg); vt.textContent = (opt.fmtV || F.n0)(v);
      const hit = el('rect', { x: 0, y: yy, width: W, height: rowH, style: 'fill:transparent;cursor:' + (opt.onClick ? 'pointer' : 'default') }, svg);
      if (opt.tip) { hit.addEventListener('mousemove', ev => Tip.show(opt.tip(i), ev)); hit.addEventListener('mouseleave', Tip.hide); }
      if (opt.onClick) hit.addEventListener('click', () => opt.onClick(i)); });
  }

  /* Dispersão. opt: {pts:[{x,y,c,tip}], fmtX, fmtY, xRot, yRot, h, diag} */
  function scatter(host, opt) {
    host.innerHTML = ''; host.classList.add('chart');
    const pts = opt.pts.filter(p => isFinite(p.x) && isFinite(p.y)); if (!pts.length) { host.innerHTML = '<div class="vazio">Sem dados (MAE/MFE desconhecidos neste filtro)</div>'; return; }
    const W = largura(host), H = opt.h || 260, L = 52, R = 12, T = opt.yRot ? 24 : 10, B = 34;
    const sx = nice(Math.min(0, ...pts.map(p => p.x)), Math.max(...pts.map(p => p.x)), 6), sy = nice(Math.min(0, ...pts.map(p => p.y)), Math.max(...pts.map(p => p.y)), 5);
    const x = v => L + (W - L - R) * (v - sx.lo) / (sx.hi - sx.lo), y = v => T + (H - T - B) * (1 - (v - sy.lo) / (sy.hi - sy.lo));
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, host);
    eixoY(svg, sy, y, L, W - R, opt.fmtY);
    for (const v of sx.ticks) { const t = el('text', { x: x(v), y: H - B + 14, 'text-anchor': 'middle' }, svg); t.textContent = (opt.fmtX || compactY)(v); }
    if (opt.xRot) { const t = el('text', { x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle' }, svg); t.textContent = opt.xRot; }
    if (opt.yRot) { const t = el('text', { x: 4, y: 11, 'text-anchor': 'start' }, svg); t.textContent = '↑ ' + opt.yRot; }
    const g = el('g', {}, svg);
    for (const p of pts) el('circle', { cx: x(p.x), cy: y(p.y), r: 3.5, style: `fill:${p.c || 'var(--s1)'};opacity:.6;stroke:var(--surface-1);stroke-width:1` }, g);
    const ov = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, style: 'fill:transparent' }, svg);
    ov.addEventListener('mousemove', ev => { const r = svg.getBoundingClientRect(); const px = ev.clientX - r.left, py = ev.clientY - r.top; let best = null, bd = 900;
      for (const p of pts) { const d = (x(p.x) - px) ** 2 + (y(p.y) - py) ** 2; if (d < bd) { bd = d; best = p; } }
      if (best && best.tip) Tip.show(best.tip, ev); else Tip.hide(); });
    ov.addEventListener('mouseleave', Tip.hide);
  }

  /* sparkline do acumulado (string svg) */
  function spark(vals, w = 90, h = 22) {
    const v = []; let c = 0; for (const x of vals) { if (x == null || !isFinite(x)) continue; c += x; v.push(c); }
    if (v.length < 2) return '';
    const mn = Math.min(0, ...v), mx = Math.max(0, ...v), sp = mx - mn || 1;
    const X = i => (i * (w - 2) / (v.length - 1) + 1).toFixed(1), Y = x => (h - 2 - (x - mn) * (h - 4) / sp).toFixed(1);
    const y0 = Y(0); const cor = v[v.length - 1] < 0 ? 'var(--neg)' : 'var(--pos)';
    return `<svg width="${w}" height="${h}" style="vertical-align:middle"><line x1="0" x2="${w}" y1="${y0}" y2="${y0}" style="stroke:var(--grid)"/><path d="${v.map((x, i) => (i ? 'L' : 'M') + X(i) + ',' + Y(x)).join('')}" style="fill:none;stroke:${cor};stroke-width:1.5"/></svg>`;
  }

  window.G = { line, bars, hbars, scatter, spark, Tip, F, nice };
})();
