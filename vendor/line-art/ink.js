/* line-art-animation (https://github.com/JDhruv14/line-art-animation)
 * Copyright (c) 2026 JDhruv14 — MIT License, see LICENSE in this folder.
 * Transpiled from lib/ink.ts without changes. */
const NS = "http://www.w3.org/2000/svg";
const INK = "currentColor";
const PAPER = "#fdfdfc";
const INK_DAY = "#1c1c1c";
const PEN = 1.35;
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (attrs.fill === PAPER) n.classList.add("pp");
  if (parent) parent.appendChild(n);
  return n;
}
const f = (n) => n.toFixed(2);
const pt = (p) => `${f(p[0])} ${f(p[1])}`;
const pen = (parent, w = PEN) => el("path", { fill: "none", stroke: INK, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent);
const shape = (parent, w = PEN) => el("path", { fill: PAPER, stroke: INK, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" }, parent);
const blot = (parent) => el("path", { fill: INK }, parent);
const paint = (parent, colour, w = PEN) => el("path", { fill: colour, stroke: INK, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" }, parent);
function limb(parent, width, w = PEN) {
  const g = el("g", {}, parent);
  const fill = el("path", { fill: PAPER }, g);
  const a = pen(g, w), b = pen(g, w);
  const half = (width - w) / 2;
  return {
    g,
    draw(joints, endGap = [0.4, 0.9]) {
      const s = joints[0], e = joints[joints.length - 1];
      let c = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
      if (joints.length === 3) {
        const m = joints[1];
        c = [m[0] + 0.55 * (m[0] - c[0]), m[1] + 0.55 * (m[1] - c[1])];
      }
      const P = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        P.push([u * u * s[0] + 2 * u * t * c[0] + t * t * e[0], u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]]);
      }
      const side = (sgn) => P.map((p, i) => {
        const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)];
        const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1;
        return [p[0] - dy / l * half * sgn, p[1] + dx / l * half * sgn];
      });
      const L = side(1), R = side(-1);
      fill.setAttribute("d", "M" + L.map(pt).join("L") + "L" + R.slice().reverse().map(pt).join("L") + "Z");
      const cut = (arr, gap) => arr.slice(0, arr.length - Math.round(gap * 2));
      a.setAttribute("d", "M" + cut(L, endGap[0]).map(pt).join("L"));
      b.setAttribute("d", "M" + cut(R, endGap[1]).map(pt).join("L"));
    }
  };
}
function solid(l, colour = INK) {
  const n = l.g.querySelector("path");
  if (n) {
    n.classList.remove("pp");
    n.setAttribute("fill", colour);
  }
  return l;
}
function joint(a, b, l1, l2, bend = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const th = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const c1 = [a[0] + l1 * Math.cos(th - al), a[1] + l1 * Math.sin(th - al)];
  const c2 = [a[0] + l1 * Math.cos(th + al), a[1] + l1 * Math.sin(th + al)];
  return (c1[0] - c2[0]) * bend > 0 ? c1 : c2;
}
const hang = (from, len, deg) => {
  const r = deg * Math.PI / 180;
  return [from[0] + len * Math.sin(r), from[1] + len * Math.cos(r)];
};
function curve(keys, period) {
  return (x) => {
    x = (x % period + period) % period;
    const n = keys.length;
    let i = n - 1;
    for (let j = 0; j < n; j++) if (keys[j][0] <= x) i = j;
    const k = (j) => {
      const w = Math.floor(j / n);
      const e = keys[(j % n + n) % n];
      return [e[0] + w * period, e[1]];
    };
    const p0 = k(i - 1), p1 = k(i), p2 = k(i + 1), p3 = k(i + 2);
    const span = p2[0] - p1[0];
    const u = (x - p1[0]) / span;
    const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * span;
    const m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * span;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
  };
}
function shoe(node, ankle, toe = 0) {
  const r = toe * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const S = (x, y) => [ankle[0] + x * c - y * s, ankle[1] + x * s + y * c];
  node.setAttribute("d", `M${pt(S(-1.6, -0.6))} L${pt(S(4.6, -0.2))} Q${pt(S(6.6, 0.4))} ${pt(S(5.6, 1.6))} L${pt(S(-1.4, 1.5))} Q${pt(S(-2.2, 0.5))} ${pt(S(-1.6, -0.6))}Z`);
}
const place = (g, x, y, dir = 1, s = 0.5) => g.setAttribute("transform", `translate(${f(x)} ${f(y)}) scale(${f(dir * s)} ${f(s)}) translate(-40 -120)`);
const toScene = (x, y, dir, lx, ly, s = 0.5) => [x + dir * s * (lx - 40), y + s * (ly - 120)];
function inkDefs(svg, id = "ink") {
  if (!svg.style.color) svg.style.color = INK_DAY;
  const defs = el("defs", {}, svg);
  const flt = el("filter", { id: `${id}-edge`, x: "-2%", y: "-2%", width: "104%", height: "104%" }, defs);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.6", numOctaves: 1, seed: 7, result: "n" }, flt);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: 0.45, xChannelSelector: "R", yChannelSelector: "G", result: "d" }, flt);
  el("feGaussianBlur", { in: "d", stdDeviation: 0.12 }, flt);
  const stripes = el("pattern", { id: `${id}-stripes`, width: 4, height: 2.2, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-12)" }, defs);
  el("rect", { width: 4, height: 2.2, fill: PAPER }, stripes);
  el("rect", { width: 4, height: 1, fill: INK }, stripes);
  return { defs, filter: `url(#${id}-edge)`, stripes: `url(#${id}-stripes)` };
}
function run(draw) {
  const q = new URLSearchParams(location.search);
  if (q.has("debug")) {
    let t = 0;
    draw(t, 1 / 60);
    window.__step = (s = 1) => {
      for (let i = 0, n = Math.round(s * 60); i < n; i++) draw(t += 1 / 60, 1 / 60);
      return t;
    };
    return () => {
    };
  }
  const frozen = q.has("t") ? Number(q.get("t")) : null;
  const still = frozen !== null || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let id = 0, prev = 0;
  const tick = (now) => {
    const t = frozen != null ? frozen : (now - t0) / 1e3;
    draw(t, Math.min(0.05, t - prev));
    prev = t;
    if (!still) id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
export {
  INK,
  INK_DAY,
  NS,
  PAPER,
  PEN,
  blot,
  curve,
  el,
  f,
  hang,
  inkDefs,
  joint,
  limb,
  paint,
  pen,
  place,
  pt,
  run,
  shape,
  shoe,
  solid,
  toScene
};
