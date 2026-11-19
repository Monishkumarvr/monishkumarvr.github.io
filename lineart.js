/*
 * lineart.js — every drawing on this site, as animated ink line art in SVG.
 *
 * Built on line-art-animation (vendor/line-art, MIT): open double-stroke limbs,
 * paper-filled outlines, an ink-wobble filter, a solved walking gait, springs and
 * pendulums. Following that library's scene guide, richness lives in the
 * settings — brick courses, cladding, glazing, shelves, windows with sky in
 * them, far skylines in diluted ink, people passing — while colour stays sparse.
 *
 * Monish is drawn faceless, as the style asks: he reads by his spiky hair,
 * beard and grey blazer. Each <div class="art" data-scene> gets an SVG built
 * the first time it nears the viewport; scenes animate only while visible and
 * prefers-reduced-motion gets one settled frame. Ink, paper, lamps, sun and
 * moon all follow CSS variables, so the day/night toggle needs no redraw.
 */
import { el, pen as Pen, blot as Blot, paint, limb, solid, joint, shoe, place, inkDefs, f, PEN, PAPER } from "./vendor/line-art/ink.js";
import { gait } from "./vendor/line-art/gait.js";
import { spring, pendulum, wobble, ease, clamp, seeded } from "./vendor/line-art/motion.js";

const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STILL_AT = 7;
const TAU = Math.PI * 2;
const { sin, cos, min, max, floor } = Math;

/* ============================================================ path helpers */

const R = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
const poly = (pts, close = true) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join("L") + (close ? "Z" : "");
const circ = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
const rep = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join("");

/** Anti-diagonal hatching clipped to a rectangle. */
function hatchD(x, y, w, h, gap) {
  let d = "";
  for (let u = gap; u < w + h; u += gap) {
    const sx = min(u, w), sy = u - sx, ey = min(u, h), ex = u - ey;
    d += `M${f(x + sx)} ${f(y + sy)}L${f(x + ex)} ${f(y + ey)}`;
  }
  return d;
}
/** Brick courses with staggered joints. */
function brickD(x, y, w, h, ch = 5, bw = 12) {
  let d = "";
  for (let r = 0, yy = y + ch; yy < y + h; r++, yy += ch) {
    d += `M${f(x)} ${f(yy)}l${f(w)} 0`;
    for (let xx = x + (r % 2 ? bw / 2 : bw); xx < x + w; xx += bw) d += `M${f(xx)} ${f(yy)}l0 ${f(-ch)}`;
  }
  return d;
}

/* ============================================================ drawing kit */

function kit(g, w, ctx) {
  const set = (n, d) => { if (d) n.setAttribute("d", d); return n; };
  const K = {
    g, w, ctx,
    pen: (d, lw = w) => set(Pen(g, lw), d),
    detail: (d, k = 0.55) => set(Pen(g, w * k), d),
    shape: (d, lw = w) => { const n = el("path", { fill: PAPER, stroke: "currentColor", "stroke-width": lw, "stroke-linejoin": "round", "stroke-linecap": "round" }, g); return set(n, d); },
    blot: (d) => set(Blot(g), d),
    tint: (d, c, lw = w) => { const n = paint(g, "none", lw); n.style.fill = `var(--${c})`; return set(n, d); },
    wash: (d, c, op = 1) => { const n = el("path", { opacity: op }, g); n.style.fill = `var(--${c})`; return set(n, d); },
    text: (x, y, s, size, o = {}) => {
      const n = el("text", { x, y, "font-size": size, "text-anchor": o.anchor || "middle", fill: "currentColor", "font-family": "Newsreader, Georgia, serif", "font-style": o.italic ? "italic" : "normal", "letter-spacing": o.ls || 0 }, g);
      n.textContent = s; return n;
    },
    group: (attrs) => kit(el("g", attrs || {}, g), w, ctx),
    faint: (op = 0.4) => kit(el("g", { opacity: op }, g), w, ctx),
    glow: (cx, cy, rx, ry, cls = "") => el("ellipse", { cx, cy, rx, ry, fill: `url(#${ctx.id}-glow)`, class: cls }, g),
  };
  return K;
}

/* ============================================================ people */

const walkGait = gait({ kind: "walk" });
const REST = walkGait.pose(0, 0);

/**
 * A figure in ink.ts figure space (feet on y 120, facing +x).
 * look: { hair: spiky|short|bun|helmet|cap, beard, coat: css var name, stripes }
 */
function figure(parent, look = {}) {
  const L = Object.assign({ hair: "spiky", beard: true, coat: "blazer", stripes: false, shirt: true }, look);
  const g = el("g", {}, parent);
  el("g", {}, g);
  const farArm = limb(g, 3.6);
  const legs = [solid(limb(g, 4.2)), solid(limb(g, 4.2))];
  const shoes = [Blot(g), Blot(g)];
  const coat = paint(g, "none"); coat.style.fill = `var(--${L.coat})`;
  const shirt = L.shirt ? Blot(g) : null;
  const lapel = Pen(g, PEN * 0.6);
  const neck = Pen(g, PEN);
  const head = el("ellipse", { rx: 3.7, ry: 4.7, fill: PAPER, stroke: "currentColor", "stroke-width": PEN }, g);
  const ear = Pen(g, PEN * 0.6);
  const beard = L.beard ? Blot(g) : null;
  const hair = L.hair === "helmet" ? paint(g, "none", PEN) : Blot(g);
  if (L.hair === "helmet") hair.style.fill = "var(--hivis)";
  const nearArm = limb(g, 3.6);
  const front = el("g", {}, g);
  [farArm, nearArm].forEach((a) => { const p = a.g.querySelector("path"); p.classList.remove("pp"); p.style.fill = `var(--${L.coat})`; });
  const swing = [spring(60, 9), spring(60, 9)];

  function arm(A, sh, hand, i, s, dt) {
    if (hand) {
      const elb = joint(sh, hand.p, 17, 16, hand.bend || -1);
      A.draw([sh, elb, hand.p], [0.2, 0.5]);
      return hand.p;
    }
    const a = (swing[i].step(s, dt) * Math.PI) / 180;
    const elb = [sh[0] + 17 * sin(a), sh[1] + 17 * cos(a)];
    const h = [elb[0] + 16 * sin(a + 0.12), elb[1] + 16 * cos(a + 0.12)];
    A.draw([sh, elb, h], [0.2, 0.5]);
    return h;
  }

  function hairD(hc) {
    const [x, y] = hc;
    switch (L.hair) {
      case "short": return `M${f(x - 3.9)} ${f(y + 0.6)}Q${f(x - 4.8)} ${f(y - 5.8)} ${f(x + 0.4)} ${f(y - 5.4)}Q${f(x + 4.8)} ${f(y - 5)} ${f(x + 3.9)} ${f(y - 1.6)}Q${f(x + 0.6)} ${f(y - 3.4)} ${f(x - 2.4)} ${f(y - 1.2)}Z`;
      case "bun": return `M${f(x - 3.9)} ${f(y + 1.6)}Q${f(x - 4.8)} ${f(y - 5.8)} ${f(x + 0.4)} ${f(y - 5.4)}Q${f(x + 4.8)} ${f(y - 5)} ${f(x + 3.9)} ${f(y - 1.6)}Q${f(x + 0.6)} ${f(y - 3.4)} ${f(x - 2.4)} ${f(y - 1.2)}Z` + circ(x - 4.4, y - 4.4, 2.6);
      case "cap": return `M${f(x - 4)} ${f(y - 0.6)}Q${f(x - 4.4)} ${f(y - 6.2)} ${f(x + 0.4)} ${f(y - 6)}Q${f(x + 4.2)} ${f(y - 5.6)} ${f(x + 4)} ${f(y - 2)}L${f(x + 8.4)} ${f(y - 1.4)}L${f(x + 8)} ${f(y - 0.4)}L${f(x - 4)} ${f(y - 0.4)}Z`;
      case "helmet": return `M${f(x - 5.2)} ${f(y - 1.4)}Q${f(x - 5)} ${f(y - 8.6)} ${f(x + 0.2)} ${f(y - 8.6)}Q${f(x + 5.2)} ${f(y - 8.6)} ${f(x + 5.4)} ${f(y - 1.8)}L${f(x + 7.4)} ${f(y - 1.2)}L${f(x + 7.2)} ${f(y - 0.2)}L${f(x - 5.4)} ${f(y - 0.4)}Z`;
      default: {
        const pts = [[x - 3.9, y + 0.8]];
        for (let i = 0; i <= 8; i++) {
          const a = Math.PI * (1.08 + 0.86 * (i / 8));
          const r = i % 2 ? 1.62 : 1.14;
          pts.push([x + 3.9 * r * cos(a) + (i % 2 ? 0.8 : 0), y - 0.8 + 4.8 * r * sin(a)]);
        }
        pts.push([x + 3.7, y - 1.6], [x + 1.5, y - 2.6], [x - 1.8, y - 2.2], [x - 2.8, y + 0.8]);
        return poly(pts);
      }
    }
  }

  function draw(s) {
    const p = s.pose || REST, dt = s.dt || 0;
    const b = p.bob + 0.35 * sin((s.t || 0) * 1.7 + (L.phase || 0));
    let hip = p.hip, feet = p.feet;
    if (s.seat) {
      hip = [38, 88];
      feet = [{ ankle: [55, 116], knee: [56, 88], pitch: 0 }, { ankle: [51, 117], knee: [52, 89], pitch: 0 }];
    }
    feet.forEach((fo, i) => { legs[i].draw([hip, fo.knee, fo.ankle], [0.3, 0.8]); shoe(shoes[i], fo.ankle, fo.pitch); });
    const fr = s.seat ? 0 : p.front;
    g.insertBefore(legs[1 - fr].g, coat); g.insertBefore(shoes[1 - fr], coat);
    g.insertBefore(legs[fr].g, coat); g.insertBefore(shoes[fr], coat);

    const lean = s.lean || 0;
    const sh = [41 + lean, 41 + b];
    const hy = s.seat ? 82 : 78;
    coat.setAttribute("d", `M${f(sh[0] - 6)} ${f(sh[1] + 1)}Q${f(sh[0] - 1)} ${f(sh[1] - 2.4)} ${f(sh[0] + 5.2)} ${f(sh[1] + 1)}L${f(47.6 + lean * 0.3)} ${f(hy - 3 + b * 0.5)}Q${f(47 + lean * 0.3)} ${f(hy + b * 0.5)} ${f(44)} ${f(hy + b * 0.5)}L${f(34.4)} ${f(hy + 0.6 + b * 0.5)}L${f(33 + lean * 0.3)} ${f(hy - 3 + b * 0.5)}Z`);
    if (shirt) shirt.setAttribute("d", `M${f(sh[0] - 0.6)} ${f(sh[1] - 0.6)}L${f(sh[0] + 3.4)} ${f(sh[1] - 0.4)}L${f(sh[0] + 1.6)} ${f(sh[1] + 10)}Z`);
    let ld = `M${f(sh[0] - 1.2)} ${f(sh[1] - 0.2)}L${f(sh[0] + 1.4)} ${f(sh[1] + 12)}M${f(sh[0] + 3.9)} ${f(sh[1] - 0.2)}L${f(sh[0] + 1.9)} ${f(sh[1] + 12)}M${f(sh[0] + 1.6)} ${f(sh[1] + 12)}L${f(sh[0] + 1.8)} ${f(hy - 4 + b * 0.5)}M${f(sh[0] + 4.4)} ${f(sh[1] + 20)}l2.4 0`;
    if (L.stripes) ld += `M${f(sh[0] - 5.4)} ${f(sh[1] + 14)}L${f(sh[0] + 5.8)} ${f(sh[1] + 14)}M${f(sh[0] - 5.8)} ${f(sh[1] + 22)}L${f(sh[0] + 6.2)} ${f(sh[1] + 22)}`;
    lapel.setAttribute("d", ld);
    const hc = [42.6 + lean * 1.3, 31.4 + b];
    neck.setAttribute("d", `M${f(hc[0] - 1.6)} ${f(hc[1] + 4)}L${f(sh[0] - 0.6)} ${f(sh[1])}M${f(hc[0] + 1.4)} ${f(hc[1] + 4.2)}L${f(sh[0] + 2.4)} ${f(sh[1])}`);
    head.setAttribute("cx", f(hc[0])); head.setAttribute("cy", f(hc[1]));
    ear.setAttribute("d", `M${f(hc[0] - 1.6)} ${f(hc[1] - 1)}q-1.4 0.6 -0.2 2.2`);
    if (beard) beard.setAttribute("d", `M${f(hc[0] + 3.5)} ${f(hc[1] - 0.6)}Q${f(hc[0] + 4.9)} ${f(hc[1] + 4.6)} ${f(hc[0] + 1)} ${f(hc[1] + 5.9)}Q${f(hc[0] - 2.6)} ${f(hc[1] + 5.6)} ${f(hc[0] - 3.4)} ${f(hc[1] + 1.6)}L${f(hc[0] - 2.4)} ${f(hc[1] + 1.4)}Q${f(hc[0] + 0.2)} ${f(hc[1] + 3.6)} ${f(hc[0] + 2.6)} ${f(hc[1] + 0.6)}Z`);
    hair.setAttribute("d", hairD(hc));

    const shF = [sh[0] - 1, sh[1] + 2], shN = [sh[0] + 1.6, sh[1] + 2.4];
    const legSwing = s.seat ? 0 : (feet[0].ankle[0] - 40) / 12;
    const hf = arm(farArm, shF, s.far, 0, s.swingF != null ? s.swingF : -legSwing * 14, dt);
    const hn = arm(nearArm, shN, s.near, 1, s.swingN != null ? s.swingN : legSwing * 12, dt);
    return { hc, sh, hf, hn, b };
  }
  return { g, front: kit(front, PEN), draw };
}

/** Somebody walking across the scene, looping. */
function walker(K, o) {
  const fig = figure(K.g, o.look);
  const W = o.W, dir = o.dir || 1, s = o.s || 1;
  let x = o.x != null ? o.x : 0, ph = o.phase || 0;
  const span = W + 120;
  return (t, dt) => {
    ph += dt / walkGait.period;
    x += dir * walkGait.speed * s * dt;
    const xx = ((x + 60) % span + span) % span - 60;
    place(fig.g, xx, o.y, dir, s);
    fig.draw({ pose: walkGait.pose(ph), t, dt, far: o.carry ? { p: [50, 58], bend: -1 } : null });
  };
}

/** A faceless bystander seen from behind or at a table: head and shoulders. */
function bust(K, x, y, s, hairStyle, colour) {
  const G = K.group({ transform: `translate(${f(x)} ${f(y)}) scale(${f(s)})` });
  if (colour === "paper") G.shape("M-11 22Q-11 8 0 7Q11 8 11 22Z", PEN); else G.tint("M-11 22Q-11 8 0 7Q11 8 11 22Z", colour, PEN);
  G.shape(ell(0, 0, 5, 6.2), PEN);
  if (hairStyle === 0) G.blot("M-5.2 -0.6Q-5.6 -7.6 0 -7.4Q5.8 -7.6 5.2 -0.8Q3 -4.2 0 -4.4Q-3 -4.2 -5.2 -0.6Z");
  else if (hairStyle === 1) G.blot("M-5.4 2Q-6.4 -8 0 -7.6Q6.4 -8 5.4 2Q4.6 -3.4 0 -3.8Q-4.6 -3.4 -5.4 2Z");
  else if (hairStyle === 2) G.blot("M-4.6 -2.6Q-3 -7.8 1.6 -7Q6 -6 5 -1.6Q2 -4.6 -4.6 -2.6Z");
  else G.tint("M-6.4 -1.2Q-6 -9 0 -9Q6 -9 6.4 -1.2Z", "hivis", PEN);
  return G;
}

/* ============================================================ settings */

/** Sky with sun by day, moon and stars by night, drifting cloud strokes. */
function sky(K, W, H, o = {}) {
  K.ctx.sky();
  const seed = seeded(o.seed || 3);
  const night = K.group({ class: "night-only" });
  let stars = "";
  for (let i = 0; i < (o.stars || 26); i++) stars += circ(seed(0, W), seed(4, H * 0.45), seed(0.4, 1));
  night.blot(stars);
  const [mx, my] = o.moon || [W * 0.86, H * 0.16];
  night.g.appendChild(el("circle", { cx: mx, cy: my, r: 34, fill: `url(#${K.ctx.id}-moon)` }));
  night.shape(`M${mx - 9} ${my}a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z`, 0.8);
  night.blot(`M${mx + 3} ${my - 8.6}a9 9 0 0 1 0 17.2a7 9 0 0 0 0 -17.2Z`).setAttribute("opacity", 0.25);
  const day = K.group({ class: "day-only" });
  const [sx, sy] = o.sun || [W * 0.86, H * 0.17];
  day.glow(sx, sy, 46, 46);
  day.shape(circ(sx, sy, 12), 0.8);
  const clouds = (o.clouds || [[W * 0.18, H * 0.16, 70], [W * 0.55, H * 0.1, 90]]).map(([x, y, w]) => ({ x, y, w, n: K.pen("", 0.7) }));
  const curl = (cx, cy, s) => `M${f(cx)} ${f(cy)}q${5 * s} 0 ${5 * s} -4q0 -3.2 ${-3.2 * s} -3.2q-2.2 0 -2.2 2.2q0 1.4 1.4 1.4`;
  return (t) => clouds.forEach((c) => {
    const x = ((c.x + t * 3 + 80) % (W + 160)) - 80, y = c.y, w = c.w;
    c.n.setAttribute("d", `M${f(x)} ${f(y)}L${f(x + w)} ${f(y)}${curl(x + w, y, 1)}${curl(x, y, -1)}M${f(x + w * 0.2)} ${f(y - 7)}L${f(x + w * 0.66)} ${f(y - 7)}${curl(x + w * 0.66, y - 7, 1)}M${f(x + w * 0.4)} ${f(y + 6.5)}L${f(x + w * 0.9)} ${f(y + 6.5)}${curl(x + w * 0.4, y + 6.5, -1)}`);
  });
}

/** Distant industrial skyline in diluted ink. */
function skyline(K, W, y, o = {}) {
  const F = K.faint(o.op || 0.36);
  const seed = seeded(o.seed || 21);
  let x = -10, d = `M-10 ${y}`;
  while (x < W + 10) {
    const w = seed(24, 60), h = seed(10, 34), kind = floor(seed(0, 4));
    if (kind === 0) d += `L${f(x)} ${f(y - h)}L${f(x + w * 0.5)} ${f(y - h - 8)}L${f(x + w)} ${f(y - h)}`;
    else if (kind === 1) d += `L${f(x)} ${f(y - h)}L${f(x + w * 0.4)} ${f(y - h)}L${f(x + w * 0.4)} ${f(y - h - 26)}L${f(x + w * 0.48)} ${f(y - h - 26)}L${f(x + w * 0.48)} ${f(y - h)}L${f(x + w)} ${f(y - h)}`;
    else if (kind === 2) d += `L${f(x)} ${f(y - h)}` + rep(3, (i) => `L${f(x + (w / 3) * (i + 1))} ${f(y - h - 8)}L${f(x + (w / 3) * (i + 1))} ${f(y - h)}`);
    else d += `L${f(x)} ${f(y - h)}Q${f(x + w / 2)} ${f(y - h - 14)} ${f(x + w)} ${f(y - h)}`;
    d += `L${f(x + w)} ${f(y)}`;
    x += w + seed(0, 10);
    d += `L${f(x)} ${f(y)}`;
  }
  F.pen(d, 0.8);
  F.pen(`M0 ${y - 4}Q${W * 0.3} ${y - 30} ${W * 0.55} ${y - 14}T${W} ${y - 22}`, 0.6);
  return F;
}

/** Interior: back wall, skirting and floorboards. */
function room(K, W, H, floorY, o = {}) {
  if (o.wall !== false) K.wash(R(0, 0, W, floorY), "wall", 1);
  K.pen(`M0 ${floorY}L${W} ${floorY}`);
  K.detail(`M0 ${floorY - 6}L${W} ${floorY - 6}`);
  K.detail(rep(Math.ceil(W / 46), (i) => `M${i * 46 + 18} ${floorY + 7}l22 0`) + rep(Math.ceil(W / 60), (i) => `M${i * 60 + 4} ${floorY + 16}l30 0`), 0.4);
}

/** A window that shows the scene's sky (day or night) and, optionally, far chimneys. */
function windowPane(K, x, y, w, h, o = {}) {
  K.shape(R(x - 4, y - 4, w + 8, h + 8));
  el("rect", { x, y, width: w, height: h, fill: K.ctx.skyFill() }, K.g);
  if (o.view !== false) {
    const V = K.faint(0.5);
    V.pen(`M${x} ${y + h * 0.8}L${x + w * 0.2} ${y + h * 0.8}L${x + w * 0.2} ${y + h * 0.42}L${x + w * 0.26} ${y + h * 0.42}L${x + w * 0.26} ${y + h * 0.66}L${x + w * 0.6} ${y + h * 0.66}L${x + w * 0.66} ${y + h * 0.56}L${x + w * 0.72} ${y + h * 0.66}L${x + w} ${y + h * 0.66}`, 0.7);
    const N = K.group({ class: "night-only" });
    N.blot(circ(x + w * 0.75, y + h * 0.22, 3) + circ(x + w * 0.4, y + h * 0.15, 0.8) + circ(x + w * 0.1, y + h * 0.3, 0.7));
  }
  K.pen(`M${x + w / 2} ${y}L${x + w / 2} ${y + h}M${x} ${y + h / 2}L${x + w} ${y + h / 2}`, K.w * 0.9);
  K.shape(R(x - 8, y + h + 4, w + 16, 5));
}

function clock(K, x, y, r) {
  K.shape(circ(x, y, r));
  K.detail(rep(12, (i) => { const a = (i / 12) * TAU; return `M${f(x + cos(a) * r * 0.78)} ${f(y + sin(a) * r * 0.78)}L${f(x + cos(a) * r * 0.9)} ${f(y + sin(a) * r * 0.9)}`; }));
  const hands = K.pen("", K.w * 0.9);
  return (t) => {
    const m = t * 0.6, hA = m / 12;
    hands.setAttribute("d", `M${x} ${y}L${f(x + sin(m) * r * 0.75)} ${f(y - cos(m) * r * 0.75)}M${x} ${y}L${f(x + sin(hA + 2) * r * 0.5)} ${f(y - cos(hA + 2) * r * 0.5)}`);
  };
}

function pendant(K, x, y0, len) {
  const G = K.group();
  G.glow(0, len + 14, 60, 50, "lamp-glow");
  G.pen(`M0 0L0 ${len}`, 0.6);
  G.shape(`M-10 ${len + 10}L10 ${len + 10}L5 ${len}L-5 ${len}Z`);
  G.tint(ell(0, len + 10.5, 6, 1.8), "glow", 0.5);
  const p = pendulum(5, 0.5);
  return (t, dt) => G.g.setAttribute("transform", `translate(${x} ${y0}) rotate(${f(p.step(sin(t * 0.6) * 0.18, dt) * 57.3)})`);
}

function shelf(K, x, y, w, seed = 4) {
  const r = seeded(seed);
  K.shape(R(x, y, w, 4));
  K.detail(`M${x + 8} ${y + 4}l0 6M${x + w - 8} ${y + 4}l0 6`);
  let xx = x + 4;
  while (xx < x + w - 12) {
    const kind = r(0, 1);
    if (kind < 0.72) {
      const bw = r(4, 7), bh = r(14, 22), lean = r(0, 1) < 0.15 ? 3 : 0;
      const col = r(0, 1);
      const d = poly([[xx, y], [xx + bw, y], [xx + bw + lean, y - bh], [xx + lean, y - bh]]);
      if (col < 0.12) K.tint(d, "rust", K.w * 0.8); else if (col < 0.22) K.tint(d, "indigo", K.w * 0.8); else K.shape(d, K.w * 0.8);
      K.detail(`M${f(xx + 1)} ${f(y - bh + 3)}l${f(bw - 2)} 0`, 0.4);
      xx += bw + 0.6 + lean;
    } else if (kind < 0.86) {
      K.shape(`M${xx} ${y}L${xx + 10} ${y}L${xx + 11} ${y - 9}L${xx - 1} ${y - 9}Z`, K.w * 0.8);
      leaves(K, xx + 5, y - 9, 0.6);
      xx += 16;
    } else { xx += r(6, 14); }
  }
}

function leaves(K, x, y, s) {
  const d = [[-60, 14], [-30, 18], [0, 20], [30, 17], [62, 13], [-10, 12], [16, 11]].map(([a, l]) => {
    const r = (a * Math.PI) / 180, ex = x + sin(r) * l * s, ey = y - cos(r) * l * s;
    const nx = cos(r) * 3.4 * s, ny = sin(r) * 3.4 * s;
    return `M${f(x)} ${f(y)}Q${f((x + ex) / 2 + nx)} ${f((y + ey) / 2 + ny)} ${f(ex)} ${f(ey)}Q${f((x + ex) / 2 - nx)} ${f((y + ey) / 2 - ny)} ${f(x)} ${f(y)}Z`;
  }).join("");
  K.tint(d, "moss", K.w * 0.7);
}

function plant(K, x, y, s = 1) {
  K.shape(`M${x - 9 * s} ${y}L${x + 9 * s} ${y}L${x + 11 * s} ${y - 16 * s}L${x - 11 * s} ${y - 16 * s}Z`);
  K.detail(`M${x - 11 * s} ${y - 12 * s}l${22 * s} 0`);
  leaves(K, x, y - 16 * s, 1.7 * s);
}

function mug(K, x, y) {
  K.shape(`M${x - 5} ${y}L${x + 5} ${y}L${x + 5.5} ${y - 11}L${x - 5.5} ${y - 11}Z`, K.w * 0.8);
  K.pen(`M${x + 5.4} ${y - 8}q4 0 3.4 3.4q-0.6 2.6 -3.6 2.4`, K.w * 0.7);
  const st = [0, 1].map(() => K.pen("", K.w * 0.5));
  return (t) => st.forEach((n, i) => { const ph = (t * 0.5 + i * 0.5) % 1; n.setAttribute("d", `M${f(x - 2 + i * 3)} ${f(y - 13 - ph * 10)}q${f(2 + sin(t + i))} -3 0 -6q-2 -3 0 -6`); n.setAttribute("opacity", f(1 - ph)); });
}

/* ------------------------------------------------------------ industry */

function furnace(K, x, y, s) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${s})` });
  const glow = G.glow(0, -64, 74, 50);
  G.shape("M-38 0L-34 -56L34 -56L38 0Z");
  G.detail([-46, -38, -30, -22, -14, -6].map((yy) => `M-35 ${yy}Q0 ${yy + 4} 35 ${yy}`).join(""));
  G.detail(hatchD(-30, -52, 14, 48, 5), 0.4);
  G.shape("M-44 -56L44 -56L44 -63L-44 -63Z");
  G.detail("M-44 -59.5l88 0");
  G.tint(ell(0, -63, 27, 3.8), "glow", 0.8);
  G.shape("M-40 0L40 0L40 6L-40 6Z");
  G.shape("M38 -40L58 -40L58 -36L38 -36Z"); G.pen("M58 -40l0 46");
  const sparks = Array.from({ length: 7 }, () => G.blot(""));
  return (t) => {
    glow.setAttribute("opacity", f(0.72 + 0.2 * sin(t * 3.1) + 0.06 * sin(t * 7.3)));
    sparks.forEach((sp, i) => {
      const ph = (t * 0.45 + i / 7) % 1;
      sp.setAttribute("d", circ(sin(i * 7.7) * 16 + sin(t * 2 + i) * 3 * ph, -68 - ph * 64, 1.4 * (1 - ph) + 0.3));
    });
  };
}

function ladle(K) {
  K.shape("M-16 -26L16 -26L12 0L-12 0Z"); K.detail("M-15 -18l30 0");
  K.tint(ell(0, -26, 16, 3), "glow", 0.6);
  K.pen("M-16 -24Q-24 -44 0 -48Q24 -44 16 -24", 1);
  K.pen("M0 -48l0 -30", 0.8);
}

function camera(K, x, y, s, dir = 1) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${dir * s} ${s})` });
  G.shape("M-24 -20L20 -20L20 0L-24 0Z");
  G.shape("M20 -17L32 -21L32 3L20 -1Z");
  G.shape("M-26 -24L22 -24L24 -20L-28 -20Z");
  G.detail("M-18 -13l10 0M-18 -8l6 0");
  G.shape("M-3 0L3 0L3 10L-3 10Z");
  const led = G.tint(circ(-16, -4, 1.8), "rust", 0.6);
  return (t) => led.setAttribute("opacity", (t * 1.2) % 1 < 0.5 ? 1 : 0.2);
}

function jetson(K, x, y, s) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${s})` });
  G.shape(R(-34, -20, 68, 40));
  G.detail(rep(6, (i) => `M${-28 + i * 6} -16l0 32`));
  G.shape(circ(-10, 0, 13));
  const fan = G.detail("");
  G.shape(R(14, -14, 14, 8)); G.shape(R(14, -3, 14, 8)); G.shape(R(16, 8, 10, 7));
  G.detail("M-34 14l-8 0M-34 8l-8 0");
  const led = G.tint(circ(30, -24, 2.2), "moss", 0.6);
  return (t, ph = 0) => {
    const a = t * 6;
    fan.setAttribute("d", rep(5, (k) => { const q = a + (k * TAU) / 5; return `M-10 0L${f(-10 + 11 * cos(q))} ${f(11 * sin(q))}`; }));
    led.setAttribute("opacity", ((t * 0.9 + ph) % 1) < 0.6 ? 1 : 0.25);
  };
}

function laptop(K, x, y, w, fn) {
  const G = K.group({ transform: `translate(${x} ${y})` });
  const h = w * 0.62;
  G.shape(`M${-w / 2 + 2} ${-h}L${w / 2 - 2} ${-h}L${w / 2} 0L${-w / 2} 0Z`);
  G.shape(`M${-w / 2 + 6} ${-h + 5}L${w / 2 - 6} ${-h + 5}L${w / 2 - 5} -4L${-w / 2 + 5} -4Z`, K.w * 0.6);
  G.shape(`M${-w / 2 - 6} 0L${w / 2 + 6} 0L${w / 2 + 3} 4L${-w / 2 - 3} 4Z`);
  if (fn) fn(G, -w / 2 + 6, -h + 5, w - 12, h - 9);
  return G;
}

function monitor(K, x, y, w, h) {
  K.shape(R(x - 4, y - 4, w + 8, h + 8));
  K.shape(R(x, y, w, h), K.w * 0.6);
  K.shape(R(x + w / 2 - 6, y + h + 4, 12, 8));
  K.shape(R(x + w / 2 - 20, y + h + 12, 40, 4));
}

function gearD(n, r) {
  const pts = [];
  for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * TAU, rr = i % 4 < 2 ? r : r * 0.8; pts.push([cos(a) * rr, sin(a) * rr]); }
  return poly(pts) + circ(0, 0, r * 0.3);
}

function db(K, x, y, w, h) {
  K.shape(`M${x - w / 2} ${y - h}L${x - w / 2} ${y}A${w / 2} ${w / 6} 0 0 0 ${x + w / 2} ${y}L${x + w / 2} ${y - h}Z`);
  K.shape(ell(x, y - h, w / 2, w / 6));
  K.detail(`M${x - w / 2} ${y - h / 2}A${w / 2} ${w / 6} 0 0 0 ${x + w / 2} ${y - h / 2}`);
}

function cloudShape(K, x, y, s) {
  K.shape(`M${x - 30 * s} ${y + 8 * s}Q${x - 36 * s} ${y - 6 * s} ${x - 20 * s} ${y - 6 * s}Q${x - 16 * s} ${y - 22 * s} ${x} ${y - 18 * s}Q${x + 16 * s} ${y - 26 * s} ${x + 22 * s} ${y - 8 * s}Q${x + 38 * s} ${y - 6 * s} ${x + 30 * s} ${y + 8 * s}Z`);
}

function arrow(K, x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 6;
  K.pen(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}M${f(x2 - L * cos(a - 0.45))} ${f(y2 - L * sin(a - 0.45))}L${f(x2)} ${f(y2)}L${f(x2 - L * cos(a + 0.45))} ${f(y2 - L * sin(a + 0.45))}`);
}

function lampPost(K, x, y, h) {
  K.glow(x, y - h - 2, 80, 70, "lamp-glow");
  K.shape(`M${x - 2.4} ${y}L${x - 1.4} ${y - h}L${x + 1.4} ${y - h}L${x + 2.4} ${y}Z`);
  K.shape(`M${x - 6} ${y}L${x + 6} ${y}L${x + 4} ${y - 8}L${x - 4} ${y - 8}Z`);
  K.shape(`M${x - 9} ${y - h}L${x + 9} ${y - h}L${x + 6} ${y - h - 12}L${x - 6} ${y - h - 12}Z`);
  K.wash(R(x - 5, y - h - 10, 10, 8), "glow", 1).setAttribute("class", "lamp-lit");
  K.detail(`M${x} ${y - h - 12}l0 -5M${x - 9} ${y - h}l18 0`);
}

function smoke(K, x, y, n = 4, spread = 40) {
  const puffs = Array.from({ length: n }, () => K.shape("", K.w * 0.7));
  return (t) => puffs.forEach((p, i) => {
    const ph = (t * 0.1 + i / n) % 1;
    p.setAttribute("d", circ(x + ph * spread + wobble(t + i, 0.5) * 3, y - ph * 90, 3 + ph * 13));
    p.setAttribute("opacity", f(1 - ph * 0.95));
  });
}

function sparrows(K, pts) {
  const birds = pts.map(([x, y]) => ({ x, y, n: K.blot(""), tail: K.pen("", 0.6), ph: x * 0.37 }));
  return (t) => birds.forEach((b) => {
    const hop = max(0, sin(t * 1.3 + b.ph)) > 0.97 ? -2 : 0, turn = sin(t * 0.4 + b.ph) > 0 ? 1 : -1;
    b.n.setAttribute("d", ell(b.x, b.y - 2.4 + hop, 2.8, 2.1) + circ(b.x + turn * 2.4, b.y - 4.4 + hop, 1.4));
    b.tail.setAttribute("d", `M${f(b.x - turn * 2.4)} ${f(b.y - 2 + hop)}l${f(-turn * 3)} 2`);
  });
}

function street(K, W, G) {
  K.pen(`M0 ${G}L${W} ${G}`);
  K.detail(rep(Math.ceil(W / 28), (i) => `M${i * 28} ${G}l0 7`) + `M0 ${G + 7}L${W} ${G + 7}`);
  K.detail(rep(Math.ceil(W / 60), (i) => `M${i * 60 + 20} ${G + 22}l26 0`), 0.4);
}

function ground(K, W, y) { K.pen(`M0 ${y}L${W} ${y}`); K.detail(rep(Math.ceil(W / 40), (i) => `M${i * 40 + 14} ${y + 6}l14 0`)); }

/* ============================================================ scenes */

const SCENES = {};
const scene = (name, W, H, build) => { SCENES[name] = { W, H, build }; };
const posed = (K, x, y, s, dir, fn, look) => { const fig = figure(K.g, look); place(fig.g, x, y, dir, s); return (t, dt) => fn(fig, t, dt); };
const hand = (p, bend = -1) => ({ p, bend });
const all = (...fns) => (t, dt) => fns.forEach((fn) => fn && fn(t, dt));

/* ---------------------------------------------------------------- cover */
function coverBuild(K, opt = {}) {
  const W = 640, H = 360, G = 316;
  const skyU = sky(K, W, H, { sun: [574, 58], moon: [574, 58], clouds: [[60, 52, 80], [300, 34, 100], [470, 92, 60]] });
  skyline(K, W, 214, { seed: 8 });

  // behind: water tower and gantry crane
  const B = K.group();
  B.shape(`M560 ${G}L566 150L570 150L572 ${G}Z`); B.shape(`M600 ${G}L594 150L598 150L606 ${G}Z`);
  B.detail(`M567 ${G - 40}L602 ${G - 90}M568 ${G - 90}L601 ${G - 40}M566 200l34 0`);
  B.shape("M552 150L612 150L608 112L556 112Z"); B.shape("M556 112L608 112L582 98Z"); B.detail(brickD(558, 116, 48, 30, 6, 48), 0.4);
  B.shape(`M390 ${G}L394 120L400 120L404 ${G}Z`); B.detail(rep(9, (i) => `M391 ${G - 20 - i * 20}l12 -12M391 ${G - 32 - i * 20}l12 12`), 0.4);
  B.shape("M330 112L548 112L548 120L330 120Z"); B.detail(rep(27, (i) => `M${334 + i * 8} 112l4 8`), 0.4);
  B.shape("M388 100L404 100L404 112L388 112Z");
  const hookG = B.group(); hookG.pen("M0 0L0 64", 0.7); hookG.shape("M-6 64L6 64L4 72L-4 72Z"); hookG.pen("M0 72q0 8 -5 6", 1);
  const trolley = B.shape(R(-8, 120, 16, 6));
  const hookP = pendulum(4, 0.4);

  // the foundry hall: sawtooth roof with glazing, cladding, brick plinth, roller door
  const F = K.group();
  F.shape(`M18 ${G}L18 ${G - 112}L48 ${G - 146}L48 ${G - 112}L78 ${G - 146}L78 ${G - 112}L108 ${G - 146}L108 ${G - 112}L138 ${G - 146}L138 ${G - 112}L168 ${G - 146}L168 ${G - 112}L198 ${G - 146}L198 ${G}Z`);
  F.detail(rep(6, (i) => `M${48 + i * 30} ${G - 112}l0 -34M${48 + i * 30 - 3} ${G - 140}l-22 24M${48 + i * 30 - 3} ${G - 128}l-10 11`));
  F.detail(rep(46, (i) => `M${20 + i * 3.9} ${G - 108}l0 52`), 0.35);
  F.detail(brickD(18, G - 56, 180, 56, 6, 14), 0.42);
  F.shape(R(18, G - 112, 180, 6));
  F.shape(R(36, G - 96, 42, 26)); F.detail(rep(3, (i) => `M${36 + (i + 1) * 10.5} ${G - 96}l0 26`) + `M36 ${G - 83}l42 0`);
  F.shape(R(138, G - 96, 42, 26)); F.detail(rep(3, (i) => `M${138 + (i + 1) * 10.5} ${G - 96}l0 26`) + `M138 ${G - 83}l42 0`);
  F.wash(R(36.5, G - 95.5, 41, 25) + R(138.5, G - 95.5, 41, 25), "glow", 1).setAttribute("class", "win-lit");
  F.shape(R(88, G - 66, 40, 66)); F.detail(rep(10, (i) => `M88 ${G - 60 + i * 6}l40 0`), 0.45);
  F.shape(R(84, G - 70, 48, 5));
  F.text(108, G - 74, "BAY 2", 8, { ls: 1 });

  // chimney with bands, ladder and smoke
  K.shape(`M208 ${G}L212 ${G - 196}L228 ${G - 196}L232 ${G}Z`);
  K.detail(`M211 ${G - 176}l18 0M211 ${G - 170}l18 0M210 ${G - 120}l20 0M209 ${G - 60}l22 0`);
  K.detail(`M226 ${G - 6}L227 ${G - 190}M230 ${G - 6}L230.6 ${G - 190}` + rep(30, (i) => `M226.2 ${G - 10 - i * 6}l4 0`), 0.4);
  K.tint(R(210, G - 200, 20, 5), "rust", 0.7);
  const puffs = smoke(K, 220, G - 204, 5, 50);

  // pipe rack with a valve wheel
  K.shape(`M236 ${G - 82}L340 ${G - 82}L340 ${G - 76}L236 ${G - 76}Z`); K.shape(`M236 ${G - 70}L340 ${G - 70}L340 ${G - 64}L236 ${G - 64}Z`);
  K.pen(`M260 ${G - 64}L260 ${G}M318 ${G - 64}L318 ${G}`); K.detail(`M260 ${G - 40}l58 0M260 ${G - 40}L318 ${G - 64}`);
  const valve = K.group(); valve.shape(circ(0, 0, 7), 0.8); valve.detail("M-7 0l14 0M0 -7l0 14");
  K.detail(rep(5, (i) => `M${246 + i * 20} ${G - 82}l0 18`), 0.4);

  // power line with sparrows
  K.shape(`M454 ${G}L456 168L460 168L462 ${G}Z`); K.pen("M444 172L472 172", 1); K.detail("M446 172l0 -4M470 172l0 -4");
  K.pen("M340 166Q400 188 446 172", 0.6); K.pen("M472 172Q560 196 652 170", 0.6);
  const birds = sparrows(K, [[372, 175], [384, 178.5], [508, 181], [524, 183]]);

  // lamp post, a parked forklift
  lampPost(K, 500, G, 140);
  const FL = K.group({ transform: `translate(568 ${G})` });
  FL.shape("M-20 -30L18 -30L22 -10L-20 -10Z"); FL.shape("M-14 -52L10 -52L14 -30L-14 -30Z", 0.8); FL.detail("M-10 -48l0 18M8 -48l3 18");
  FL.shape(circ(-10, -6, 6)); FL.shape(circ(14, -6, 6)); FL.blot(circ(-10, -6, 2) + circ(14, -6, 2));
  FL.pen("M-24 -52L-24 0M-24 -2l-14 0", 1.2); FL.tint(R(-12, -26, 26, 8), "hivis", 0.6);

  street(K, W, G);

  // a colleague walks the back lane; Monish arrives on the front lane
  const colleague = walker(K, { W, y: G + 2, s: 1.05, dir: -1, x: 300, look: { hair: "helmet", beard: false, coat: "hivis", stripes: true, phase: 1 } });
  const fig = figure(K.g);
  const S = opt.scale || 1.62, stopX = opt.stopX || 430;
  let x = opt.startX != null ? opt.startX : -40, phase = 0, go = 1, waveT = 0;
  return (t, dt) => {
    skyU(t); puffs(t); birds(t); colleague(t, dt);
    const a = hookP.step(sin(t * 0.5) * 0.1, dt);
    const tx = 470 + sin(t * 0.25) * 40;
    hookG.g.setAttribute("transform", `translate(${f(tx)} 126) rotate(${f(a * 57.3)})`);
    trolley.setAttribute("transform", `translate(${f(tx)} 0)`);
    valve.g.setAttribute("transform", `translate(288 ${G - 40}) rotate(${f(t * 12)})`);
    if (x < stopX) go = clamp((stopX - x) / 30, 0, 1) * 0.85 + 0.15; else go = max(0, go - dt * 2.5);
    phase += (dt / walkGait.period) * go;
    if (x < stopX) x += walkGait.speed * S * dt * go;
    place(fig.g, x, G + 8, 1, S);
    let near = null;
    if (go < 0.2) { waveT += dt; const u = ease(clamp(waveT / 0.6, 0, 1)); near = hand([44 + 6 * u + 3 * sin(waveT * 7) * u, 46 - 28 * u], 1); }
    fig.draw({ pose: walkGait.pose(phase, go), near, t, dt });
  };
}
scene("cover", 640, 360, (K) => coverBuild(K));
scene("og", 640, 360, (K) => coverBuild(K, { startX: 430 }));

/* ---------------------------------------------------------------- chapter 1 */
function foundryShed(K, W, G, o = {}) {
  K.wash(R(0, 0, W, G), "wall", 1);
  K.detail(rep(Math.ceil(W / 6), (i) => `M${i * 6} 20l0 ${G - 70}`), 0.3);
  K.pen(`M0 ${G - 50}L${W} ${G - 50}`, K.w * 0.8);
  K.detail(brickD(0, G - 50, W, 50, 6, 16), 0.4);
  if (o.windows !== false) [0.18, 0.62].forEach((u) => windowPane(K, W * u, 34, 46, 54, { view: false }));
  K.shape(`M0 14L${W} 14L${W} 20L0 20Z`); K.detail(rep(Math.ceil(W / 10), (i) => `M${i * 10} 14l5 6`), 0.4);
  ground(K, W, G);
}

scene("origin-forge", 400, 300, (K) => {
  foundryShed(K, 400, 262);
  const lad = K.group(); ladle(lad);
  const fz = furnace(K, 112, 262, 1.1);
  K.shape("M190 262L194 226L224 226L228 262Z"); K.detail(hatchD(196, 230, 26, 30, 6), 0.4);
  K.shape("M188 226L230 226L230 220L188 220Z");
  const p = pendulum(3, 0.3);
  return all(fz, posed(K, 318, 262, 1.8, -1, (fig, t, dt) => fig.draw({ near: hand([66 + 2 * wobble(t, 0.6), 50]), t, dt })),
    (t, dt) => lad.g.setAttribute("transform", `translate(196 98) rotate(${f(p.step(sin(t * 0.4) * 0.1, dt) * 57.3)} 0 -78)`));
});

scene("origin-books", 400, 300, (K) => {
  room(K, 400, 300, 262);
  windowPane(K, 30, 30, 70, 84);
  shelf(K, 140, 70, 240, 7); shelf(K, 140, 126, 240, 12); shelf(K, 140, 182, 120, 19);
  K.shape(R(140, 50, 240, 4));
  const lamp = pendant(K, 90, 0, 26);
  [0, 1, 2, 3].forEach((i) => K[i === 1 ? "tint" : "shape"](R(36 + i * 3, 240 - i * 18, 100 - i * 6, 18), "rust"));
  K.detail("M46 252l80 0M52 216l70 0");
  K.blot("M58 168L90 156L122 168L90 180Z"); K.blot(R(80, 172, 20, 10)); K.pen("M116 170L120 196");
  return all(lamp, posed(K, 296, 262, 1.8, 1, (fig, t, dt) => book(fig, fig.draw({ near: hand([55, 60]), far: hand([51, 61]), t, dt }), t)));
});
function book(fig, r, t) {
  if (!fig.bookN) { fig.bookC = fig.front.tint("", "rust"); fig.bookN = fig.front.shape(""); fig.bookP = fig.front.detail(""); }
  const c = [(r.hn[0] + r.hf[0]) / 2 + 1, (r.hn[1] + r.hf[1]) / 2 - 3];
  fig.bookC.setAttribute("d", poly([[c[0] - 1, c[1] - 9], [c[0] + 3, c[1] - 10], [c[0] + 3, c[1] + 6], [c[0] - 1, c[1] + 7]]));
  const u = (t * 0.3) % 1, turn = u < 0.15 ? sin((u / 0.15) * Math.PI) : 0;
  fig.bookN.setAttribute("d", poly([[c[0] - 1, c[1] - 9], [c[0] - 9 + turn * 6, c[1] - 11], [c[0] - 9 + turn * 6, c[1] + 5], [c[0] - 1, c[1] + 7]]));
  fig.bookP.setAttribute("d", `M${f(c[0] - 7)} ${f(c[1] - 6)}l4 1M${f(c[0] - 7)} ${f(c[1] - 2)}l4 1M${f(c[0] - 7)} ${f(c[1] + 2)}l3 1`);
}

function desk(K, x0, x1, y) {
  K.shape(`M${x0} ${y}L${x1} ${y}L${x1} ${y + 6}L${x0} ${y + 6}Z`);
  K.shape(`M${x1 - 46} ${y + 6}L${x1 - 6} ${y + 6}L${x1 - 6} ${y + 60}L${x1 - 46} ${y + 60}Z`);
  K.detail(`M${x1 - 46} ${y + 24}l40 0M${x1 - 46} ${y + 42}l40 0M${x1 - 30} ${y + 15}l10 0M${x1 - 30} ${y + 33}l10 0M${x1 - 30} ${y + 51}l10 0`);
  K.pen(`M${x0 + 8} ${y + 6}L${x0 + 10} ${y + 70}`);
}
function chair(K, x, y) {
  K.shape(`M${x - 4} ${y - 70}L${x + 4} ${y - 70}L${x + 6} ${y - 22}L${x - 2} ${y - 22}Z`);
  K.shape(`M${x - 4} ${y - 30}L${x + 30} ${y - 30}L${x + 30} ${y - 24}L${x - 4} ${y - 24}Z`);
  K.pen(`M${x + 13} ${y - 24}L${x + 13} ${y - 8}M${x} ${y}L${x + 13} ${y - 8}L${x + 26} ${y}`);
}

scene("origin-ai", 400, 300, (K) => {
  room(K, 400, 300, 262);
  windowPane(K, 24, 30, 92, 80);
  const clk = clock(K, 180, 52, 14);
  K.shape(R(220, 30, 60, 44)); K.detail("M228 40l20 0M228 48l40 0M228 56l30 0M228 64l36 0"); K.pen("M250 30l0 -6", 0.5);
  plant(K, 372, 262, 1.1);
  chair(K, 238, 262);
  const fig = figure(K.g); place(fig.g, 250, 262, 1, 1.42);
  desk(K, 210, 360, 186);
  laptop(K, 316, 186, 46, (G, x, y, w) => G.detail(`M${x + 4} ${y + 6}l${w - 14} 0M${x + 4} ${y + 12}l${w - 22} 0M${x + 4} ${y + 18}l${w - 10} 0`, 0.4));
  const steam = mug(K, 352, 186);
  return (t, dt) => { clk(t); steam(t); fig.draw({ seat: true, near: hand([60 + sin(t * 9) * 0.8, 62 + Math.abs(sin(t * 9)) * 1.2]), far: hand([56 + sin(t * 9 + 2) * 0.8, 63]), t, dt }); };
});

/* ---------------------------------------------------------------- chapter 2 */
scene("pipe-sense", 300, 240, (K) => {
  K.wash(R(0, 0, 300, 196), "wall", 1); K.detail(rep(50, (i) => `M${i * 6} 0l0 196`), 0.25);
  const cam = camera(K, 64, 64, 1, 1); K.shape("M54 74L58 74L58 196L54 196Z");
  const rays = [0, 1, 2].map(() => K.pen("", 0.8));
  K.shape("M100 176L300 176L300 184L100 184Z"); K.detail(rep(25, (i) => `M${104 + i * 8} 176l0 8`), 0.4);
  K.pen("M110 184l0 12M290 184l0 12");
  const parts = [0, 1, 2, 3].map(() => K.shape("", 0.9));
  K.shape(circ(232, 96, 30)); K.detail(rep(7, (k) => { const a = Math.PI + (k / 6) * Math.PI; return `M${f(232 + cos(a) * 22)} ${f(96 + sin(a) * 22)}L${f(232 + cos(a) * 27)} ${f(96 + sin(a) * 27)}`; }));
  const needle = K.tint("", "rust", 0.8); K.blot(circ(232, 96, 2.6)); K.pen("M232 126l0 50", 0.7);
  ground(K, 300, 196);
  return (t) => {
    cam(t);
    rays.forEach((r, i) => { const ph = (t * 0.5 + i / 3) % 1; r.setAttribute("d", `M${f(100 + ph * 40)} ${f(50 - ph * 16)}Q${f(106 + ph * 46)} ${f(58)} ${f(100 + ph * 40)} ${f(66 + ph * 16)}`); r.setAttribute("opacity", f(1 - ph)); });
    parts.forEach((p, i) => { const x = 100 + ((t * 18 + i * 55) % 220); p.setAttribute("d", `M${f(x)} 176L${f(x + 22)} 176L${f(x + 18)} 162L${f(x + 4)} 162Z`); p.setAttribute("opacity", x > 290 ? 0 : 1); });
    const a = Math.PI * 1.3 + wobble(t, 0.8) * 0.5;
    needle.setAttribute("d", `M${f(232 + cos(a + 1.57) * 2)} ${f(96 + sin(a + 1.57) * 2)}L${f(232 + cos(a) * 22)} ${f(96 + sin(a) * 22)}L${f(232 - cos(a + 1.57) * 2)} ${f(96 - sin(a + 1.57) * 2)}Z`);
  };
});
scene("pipe-edge", 300, 240, (K) => {
  K.wash(R(0, 0, 300, 220), "wall", 1);
  K.shape(R(52, 24, 196, 176)); K.shape(R(60, 32, 180, 160), 0.7);
  K.detail("M62 44l176 0M62 176l176 0" + rep(18, (i) => `M${70 + i * 9} 178l0 10`), 0.4);
  K.pen("M80 192Q70 214 40 214M110 192Q110 210 130 220M200 192Q210 214 260 212", 0.9);
  K.tint(R(212, 50, 20, 24), "hivis", 0.7); K.pen("M224 54l-6 8l6 0l-6 8", 0.8);
  const j = jetson(K, 140, 110, 1.6);
  return (t) => j(t);
});
scene("pipe-data", 300, 240, (K) => {
  room(K, 300, 240, 220);
  K.shape(R(36, 24, 228, 160)); K.shape(R(32, 20, 236, 8));
  const cells = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { K.detail(R(46 + c * 54, 36 + r * 23, 48, 15), 0.6); cells.push(K.wash(R(47 + c * 54, 37 + r * 23, 46, 13), c === 1 ? "rust" : c === 3 ? "moss" : "blazer", 0)); }
  K.pen("M150 184L150 220M120 220L180 220", 1);
  return (t) => { const n = floor((t * 3) % 30); cells.forEach((c, i) => c.setAttribute("opacity", i < n ? 0.6 : 0)); };
});
scene("pipe-optimize", 300, 240, (K) => {
  K.wash(R(0, 0, 300, 240), "wall", 1); K.detail(brickD(0, 0, 300, 240, 8, 22), 0.25);
  const G1 = K.group(), G2 = K.group(), G3 = K.group();
  G1.shape(gearD(12, 54)); G1.detail(rep(6, (i) => { const a = (i / 6) * TAU; return `M${f(cos(a) * 18)} ${f(sin(a) * 18)}L${f(cos(a) * 40)} ${f(sin(a) * 40)}`; }));
  G2.tint(gearD(8, 34), "glow"); G3.shape(gearD(7, 26));
  K.shape(ell(76, 40, 36, 20)); K.text(76, 45, "MILP", 14, { italic: true });
  K.shape(circ(104, 66, 4)); K.shape(circ(110, 76, 2.4));
  return (t) => {
    G1.g.setAttribute("transform", `translate(120 146) rotate(${f(t * 20)})`);
    G2.g.setAttribute("transform", `translate(210 102) rotate(${f(-t * 31 + 12)})`);
    G3.g.setAttribute("transform", `translate(220 188) rotate(${f(-t * 36 + 8)})`);
  };
});
scene("pipe-decide", 300, 240, (K) => {
  room(K, 300, 240, 220);
  K.shape(R(150, 28, 128, 96)); K.pen("M164 124L158 220M264 124L270 220");
  const ticks = [0, 1, 2].map((i) => { K.detail(R(162, 46 + i * 22, 10, 10), 0.8); K.detail(`M180 ${51 + i * 22}l${80 - i * 14} 0`); return K.pen("", 1.2); });
  return posed(K, 74, 220, 1.32, 1, (fig, t, dt) => {
    fig.draw({ near: hand([82, 46]), t, dt });
    ticks.forEach((tk, i) => tk.setAttribute("d", (t * 0.6) % 4 > i + 0.6 ? `M163 ${51 + i * 22}l3 4l6 -9` : ""));
  });
});

/* ---------------------------------------------------------------- chapter 3 */
scene("belt", 800, 200, (K) => {
  K.wash(R(0, 0, 800, 200), "wall", 1);
  K.shape(R(40, 14, 330, 104)); K.detail(rep(11, (r) => rep(28, (c) => circ(52 + c * 11.5, 24 + r * 9, 0.6))), 0.5);
  K.pen("M70 30L70 92M70 30l-7 -8M70 30l7 -8M70 92l-4 4M70 92l4 4", 1);
  K.pen("M100 40L100 70Q100 80 108 80L108 96", 1); K.shape(R(96, 26, 8, 14), 0.8);
  K.shape("M130 28L150 28L150 52L130 52Z"); K.text(140, 45, "C++", 9);
  K.shape("M160 28L180 28L180 52L160 52Z"); K.text(170, 45, "Py", 10, { italic: true });
  K.shape("M190 28L216 28L216 52L190 52Z"); K.text(203, 45, "SQL", 9);
  K.pen("M240 40Q252 26 264 40Q252 54 240 40Z", 0.9); K.pen("M264 40L296 40", 0.9);
  const coil = K.pen("", 0.8);
  K.shape(R(320, 26, 36, 46)); K.detail("M326 36l24 0M326 44l18 0M326 52l22 0M326 60l14 0");
  K.shape("M420 70L760 70L760 76L420 76Z"); K.detail("M440 76l0 10M740 76l0 10");
  [440, 492, 544].forEach((x, i) => { K.shape(`M${x} 70L${x + 44} 70L${x + 40} 44L${x + 4} 44Z`); K.detail(`M${x + 14} 54l16 0`); K.text(x + 22, 66, ["ONNX", "TRT", "YOLO"][i], 7, { ls: 0.5 }); });
  cloudShape(K, 640, 50, 0.8); K.text(690, 40, "AWS · GCP", 10, { anchor: "start" });
  db(K, 610, 70, 22, 16);
  K.shape("M20 150L780 150L780 160L20 160Z"); K.detail(rep(19, (i) => `M${40 + i * 40} 152l20 0`), 0.35);
  K.pen("M40 160L40 200M760 160L760 200M400 160L400 200");
  laptop(K, 110, 150, 70, (G, x, y) => G.detail(`M${x + 4} ${y + 6}l30 0M${x + 4} ${y + 13}l40 0M${x + 4} ${y + 20}l22 0`, 0.4));
  const j = jetson(K, 250, 128, 0.9);
  const cam = camera(K, 360, 118, 0.7, 1); K.shape("M357 125L363 125L363 150L357 150Z");
  const gG = K.group(); gG.shape(gearD(8, 18));
  K.shape(R(470, 118, 60, 32)); K.detail("M480 128l40 0M480 136l30 0");
  K.shape(R(560, 112, 26, 38)); K.shape(R(592, 104, 26, 46)); K.shape(R(624, 96, 26, 54));
  K.detail(hatchD(560, 112, 26, 38, 5) + hatchD(624, 96, 26, 54, 5), 0.35);
  const steam = mug(K, 750, 150);
  const lamp = pendant(K, 420, 0, 82);
  return (t, dt) => {
    j(t); cam(t); steam(t); lamp(t, dt);
    gG.g.setAttribute("transform", `translate(700 128) rotate(${f(t * 30)})`);
    coil.setAttribute("d", "M296 40" + rep(6, (i) => `q3 ${f(-6 - sin(t * 3 + i) * 1.5)} 6 0`));
  };
});

/* ---------------------------------------------------------------- chapter 4 */
scene("exp-np", 520, 300, (K) => {
  room(K, 520, 300, 262);
  windowPane(K, 24, 36, 70, 90);
  const clk = clock(K, 496, 40, 12);
  K.shape(R(200, 34, 280, 156));
  const fl = K.group();
  fl.pen(R(222, 56, 52, 26) + ell(336, 69, 28, 14) + R(222, 118, 52, 26)); fl.tint(R(312, 118, 54, 26), "glow");
  arrow(fl, 276, 69, 306, 69); arrow(fl, 248, 84, 248, 116); arrow(fl, 276, 131, 310, 131); arrow(fl, 338, 85, 340, 116);
  fl.detail("M390 60l70 0M390 72l52 0M390 84l64 0M390 120l60 0M390 132l40 0");
  K.shape("M200 190L480 190L480 196L200 196Z");
  K.pen("M220 196L212 262M460 196L468 262");
  plant(K, 506, 262, 1);
  [[270, 1, "paper"], [340, 0, "indigo"], [410, 2, "paper"], [470, 1, "rust"]].forEach(([x, hs, c]) => bust(K, x, 270, 2.1, hs, c));
  return all(clk, posed(K, 130, 262, 1.8, 1, (fig, t, dt) => fig.draw({ near: hand([76, 34 + 2 * sin(t * 0.9)]), t, dt })));
});
scene("exp-bf", 300, 300, (K) => {
  foundryShed(K, 300, 266, { windows: false });
  K.shape(R(40, 30, 22, 236)); K.shape(R(238, 30, 22, 236)); K.shape(R(30, 18, 240, 24));
  K.detail(hatchD(42, 32, 18, 232, 7) + hatchD(240, 32, 18, 232, 7), 0.35);
  K.detail(rep(10, (i) => circ(40 + i * 24, 30, 1.4)), 0.6);
  const ramG = K.group(); ramG.shape(R(90, 0, 120, 46)); ramG.detail("M150 -100L150 0M100 12l100 0M100 34l100 0");
  K.shape(R(70, 230, 160, 36)); K.detail("M80 244l140 0");
  K.glow(150, 224, 60, 22);
  K.tint("M114 230Q114 216 150 216Q186 216 186 230Z", "glow");
  const sp = [0, 1, 2, 3].map(() => K.blot(""));
  return (t) => {
    const c = (t * 0.45) % 1, y = c < 0.12 ? 54 + 116 * ease(c / 0.12) : c < 0.2 ? 170 : 170 - 116 * ease((c - 0.2) / 0.8);
    ramG.g.setAttribute("transform", `translate(0 ${f(y)})`);
    sp.forEach((s, i) => { const k = c < 0.12 || c > 0.4 ? -1 : (c - 0.12) / 0.28; s.setAttribute("d", k < 0 ? "" : circ(150 + (i - 1.5) * 30 * k * 2, 220 - sin(k * Math.PI) * 30 + k * 10, 1.4)); });
  };
});

/* ---------------------------------------------------------------- chapter 5 */
function thought(K, x, y, rx, ry, tx, ty) {
  K.shape(ell(x, y, rx, ry));
  K.shape(circ(tx + (x - tx) * 0.35, ty + (y - ty) * 0.35, 5)); K.shape(circ(tx + (x - tx) * 0.12, ty + (y - ty) * 0.12, 3));
}
function cabinetRow(K, x, y, n) { for (let i = 0; i < n; i++) { K.shape(R(x + i * 34, y - 92, 30, 92)); K.detail(rep(3, (k) => `M${x + i * 34 + 3} ${y - 66 + k * 28}l24 0M${x + i * 34 + 12} ${y - 80 + k * 28}l6 0`)); } }

scene("mcp-1", 400, 300, (K) => {
  room(K, 400, 300, 262);
  cabinetRow(K, 210, 262, 5);
  K.shape(R(220, 160, 40, 10)); K.shape(R(226, 152, 40, 10)); K.shape(R(222, 144, 40, 10));
  thought(K, 250, 64, 54, 32, 160, 126);
  const q = K.text(250, 76, "?", 34, { italic: true });
  K.detail("M216 56l18 0M270 56l14 0", 0.5);
  return posed(K, 110, 262, 1.85, 1, (fig, t, dt) => { q.setAttribute("y", f(76 + wobble(t, 0.7) * 2)); fig.draw({ near: hand([45.5, 37]), far: hand([47, 62]), lean: -0.6, t, dt }); });
});
scene("mcp-2", 400, 300, (K) => {
  K.wash(R(0, 0, 400, 300), "wall", 1); K.detail(rep(20, (r) => rep(20, (c) => circ(10 + c * 20, 10 + r * 20, 0.5))), 0.5);
  const src = [[64, 80], [64, 150], [64, 220]], hub = [196, 150];
  src.forEach((s) => K.pen(`M${s[0] + 24} ${s[1]}L${hub[0] - 32} ${hub[1]}`, 0.8));
  db(K, 64, 98, 40, 34); K.text(64, 116, "ERP", 8);
  K.shape(R(42, 134, 44, 32)); K.detail("M50 146l28 0M50 154l20 0"); K.text(64, 178, "sensors", 8, { italic: true });
  K.shape("M64 202L80 230Q64 244 48 230Z"); K.text(64, 256, "chemistry", 8, { italic: true });
  const hex = []; for (let k = 0; k < 6; k++) hex.push([hub[0] + cos((k / 6) * TAU) * 32, hub[1] + sin((k / 6) * TAU) * 32]);
  K.tint(poly(hex), "indigo"); K.shape(circ(hub[0], hub[1], 10));
  K.text(196, 104, "ontology", 12, { italic: true });
  arrow(K, 230, 150, 262, 150); K.shape(R(264, 128, 44, 44)); K.text(286, 155, "MCP", 12);
  K.shape(R(250, 206, 72, 34)); K.text(286, 227, "question bank", 9, { italic: true }); arrow(K, 286, 206, 286, 176);
  arrow(K, 310, 150, 330, 150);
  K.shape("M334 132Q334 126 340 126L376 126Q382 126 382 132L382 160Q382 166 376 166L350 166L340 176L342 166L340 166Q334 166 334 160Z");
  const dots = src.map(() => K.blot("")), talk = [0, 1, 2].map(() => K.blot(""));
  return (t) => {
    src.forEach((s, i) => { const ph = (t * 0.4 + i / 3) % 1; dots[i].setAttribute("d", circ(s[0] + 24 + (hub[0] - 32 - s[0] - 24) * ph, s[1] + (hub[1] - s[1]) * ph, 2.6)); });
    talk.forEach((d, i) => d.setAttribute("d", circ(348 + i * 10, 146, (floor(t * 3) % 3) === i ? 3 : 1.8)));
  };
});
scene("mcp-3", 400, 300, (K) => {
  room(K, 400, 300, 262);
  windowPane(K, 300, 24, 80, 60);
  const lamp = pendant(K, 230, 0, 20);
  const seed = seeded(5);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const i = r * 4 + c; bust(K, 196 + c * 46 + (r % 2) * 16, 116 + r * 52, 1.9, i === 7 ? 3 : floor(seed(0, 3)), i === 5 ? "rust" : i === 10 ? "indigo" : "paper"); }
  return all(lamp, posed(K, 86, 262, 1.85, 1, (fig, t, dt) => fig.draw({ near: hand([50 + 2 * sin(t * 6), 18], 1), t, dt })));
});

scene("edge-1", 400, 300, (K) => {
  room(K, 400, 300, 262);
  const beacon = K.glow(330, 56, 70, 56);
  K.shape("M312 72L348 72L344 50Q330 36 316 50Z"); K.shape(R(306, 72, 48, 8)); K.detail("M318 56l24 0M316 64l28 0");
  monitor(K, 30, 40, 80, 54); K.detail("M40 52l40 0M40 62l56 0M40 72l30 0");
  monitor(K, 140, 52, 60, 42); K.tint("M170 60L188 86L152 86Z", "hivis", 0.6);
  K.shape("M10 140L390 140L390 146L10 146Z");
  laptop(K, 200, 236, 160, (G, x, y, w, h) => { G.shape(`M${x + w / 2} ${y + 10}L${x + w / 2 + 30} ${y + h - 10}L${x + w / 2 - 30} ${y + h - 10}Z`); G.pen(`M${x + w / 2} ${y + 26}L${x + w / 2} ${y + h - 30}`); G.blot(circ(x + w / 2, y + h - 20, 2.4)); });
  K.shape(R(70, 240, 260, 6)); K.pen("M90 246L86 262M310 246L314 262");
  return (t) => beacon.setAttribute("opacity", f(0.2 + 0.8 * max(0, sin(t * 5))));
});
scene("edge-2", 400, 300, (K) => {
  room(K, 400, 300, 262);
  K.shape(R(20, 40, 360, 180)); K.pen("M40 220L34 262M360 220L366 262");
  const xs = [56, 128, 200, 272, 344];
  for (let i = 0; i < 4; i++) arrow(K, xs[i] + 20, 130, xs[i + 1] - 20, 130);
  xs.forEach((x) => K.shape(R(x - 18, 112, 36, 36)));
  ["build", "prepare", "approve", "activate", "verify"].forEach((l, i) => K.text(xs[i], 100, l, 11, { italic: true }));
  K.detail(R(122, 120, 12, 18) + "M192 130l6 6l10 -12");
  K.detail(hatchD(254, 112, 36, 36, 6), 0.45);
  K.pen("M344 152Q332 214 272 152", 0.9).setAttribute("stroke-dasharray", "5 5");
  K.text(310, 206, "rollback", 12, { italic: true });
  K.shape(R(60, 232, 70, 6)); K.tint(R(64, 228, 12, 4), "rust", 0.5); K.tint(R(84, 228, 12, 4), "indigo", 0.5);
  const tok = K.tint("", "rust", 0.8);
  return (t) => { const p = (t * 0.3) % 1; tok.setAttribute("d", circ(xs[0] + (xs[4] - xs[0]) * ease(p), 76, 5)); };
});
scene("edge-3", 400, 300, (K) => {
  const skyU = sky(K, 400, 300, { sun: [60, 50], moon: [60, 50], clouds: [[230, 30, 60]], stars: 16 });
  cloudShape(K, 200, 54, 1.2);
  const pos = [[60, 196], [140, 236], [210, 190], [280, 240], [350, 200]];
  ground(K, 400, 262);
  pos.forEach((p) => {
    K.pen(`M200 72L${p[0]} ${p[1] - 50}`, 0.6).setAttribute("stroke-dasharray", "3 4");
    K.shape(`M${p[0] - 24} ${p[1]}L${p[0] - 24} ${p[1] - 30}L${p[0] - 12} ${p[1] - 40}L${p[0] - 12} ${p[1] - 30}L${p[0]} ${p[1] - 40}L${p[0]} ${p[1] - 30}L${p[0] + 24} ${p[1] - 30}L${p[0] + 24} ${p[1]}Z`);
    K.shape(R(p[0] + 8, p[1] - 56, 6, 26));
    K.detail(`M${p[0] - 20} ${p[1] - 18}l10 0M${p[0] + 4} ${p[1] - 18}l14 0`);
  });
  const leds = pos.map((p) => K.tint(circ(p[0] - 18, p[1] - 8, 2.6), "moss", 0.5));
  const signals = pos.map(() => K.pen("", 0.6));
  return (t) => { skyU(t); leds.forEach((l, i) => l.setAttribute("opacity", ((t * 0.9 + i * 0.23) % 1) < 0.6 ? 1 : 0.2)); signals.forEach((s, i) => { const p = pos[i], ph = (t * 0.6 + i * 0.2) % 1; s.setAttribute("d", `M${f(p[0] - 8 - ph * 8)} ${f(p[1] - 52 - ph * 6)}q${f(8 + ph * 8)} ${f(-8 - ph * 6)} ${f(16 + ph * 16)} 0`); s.setAttribute("opacity", f(1 - ph)); }); };
});

scene("vis-1", 400, 300, (K) => {
  foundryShed(K, 400, 262);
  const fz = furnace(K, 230, 262, 1.15);
  const cam = camera(K, 62, 64, 0.9, 1); K.pen("M62 54L62 20", 0.8);
  K.pen("M88 60L180 180M88 68L140 210", 0.5).setAttribute("stroke-dasharray", "3 4");
  const marks = [0, 1, 2].map((i) => K.text(310 + i * 24, 140, "?", 24, { italic: true }));
  return (t) => { fz(t); cam(t); marks.forEach((m, i) => m.setAttribute("y", f(140 + wobble(t + i, 0.8) * 4))); };
});
scene("vis-2", 400, 300, (K) => {
  room(K, 400, 300, 280);
  monitor(K, 30, 20, 340, 214);
  const view = K.group();
  view.wash(R(30, 20, 340, 214), "wall", 1);
  view.detail(rep(56, (i) => `M${32 + i * 6} 22l0 120`), 0.25);
  view.detail(brickD(30, 142, 340, 90, 8, 20), 0.25);
  view.shape("M120 92L190 92L180 150L130 150Z"); view.tint(ell(155, 92, 36, 6), "glow", 0.8); view.detail(hatchD(124, 96, 20, 52, 5), 0.4);
  view.shape(R(190, 200, 80, 30));
  const stream = view.tint("", "glow", 0.6);
  const b1 = view.pen("", 0.9), b2 = view.pen("", 0.9);
  b1.setAttribute("stroke-dasharray", "5 4"); b2.setAttribute("stroke-dasharray", "5 4");
  const l1 = view.text(0, 0, "ladle 0.94", 10, { anchor: "start" }), l2 = view.text(0, 0, "pour 0.91", 10, { anchor: "start" });
  view.tint(circ(356, 34, 4), "rust", 0.5); view.text(346, 37, "REC", 8, { anchor: "end" });
  return (t) => {
    const w = 4 + sin(t * 8);
    stream.setAttribute("d", `M184 100L192 100L${f(214 + w)} 200L${f(206 + w)} 200Z`);
    const j = wobble(t, 2) * 2;
    b1.setAttribute("d", R(108 + j, 74, 96, 86)); b2.setAttribute("d", R(176 - j, 180, 106, 52));
    l1.setAttribute("x", f(110 + j)); l1.setAttribute("y", 70); l2.setAttribute("x", f(178 - j)); l2.setAttribute("y", 176);
  };
});
scene("vis-3", 400, 300, (K) => {
  room(K, 400, 300, 262);
  K.shape(R(24, 30, 352, 160));
  const names = ["heat start", "tapping", "deslag", "heat end"];
  K.detail(rep(8, (i) => `M${120 + i * 32} 40l0 140`), 0.3);
  const bars = names.map((n, i) => { K.text(34, 66 + i * 32, n, 11, { anchor: "start", italic: true }); K.detail(`M120 ${62 + i * 32}l244 0`); return K.tint("", ["rust", "glow", "indigo", "moss"][i], 0.8); });
  K.shape("M24 190L376 190L376 196L24 196Z"); K.pen("M60 196L56 262M340 196L344 262");
  K.shape(circ(300, 236, 22)); const arc = K.pen("", 3);
  plant(K, 40, 262, 0.9);
  return (t) => {
    const g = clamp((t * 0.25) % 1.3, 0, 1);
    bars.forEach((b, i) => { const w = 58 * clamp(g * 4 - i, 0, 1); b.setAttribute("d", w > 1 ? R(126 + i * 58, 55 + i * 32, w, 14) : ""); });
    const a = Math.PI * max(0.02, g);
    arc.setAttribute("d", `M282 236A18 18 0 0 1 ${f(300 - 18 * cos(a))} ${f(236 - 18 * sin(a))}`);
  };
});

scene("opt-1", 400, 300, (K) => {
  const skyU = sky(K, 400, 300, { sun: [330, 40], moon: [330, 40], clouds: [[60, 40, 60]], stars: 14 });
  skyline(K, 400, 180, { seed: 3 });
  K.shape("M380 262L384 60L390 60L394 262Z"); K.shape("M232 60L398 60L398 66L232 66Z"); K.detail(rep(20, (i) => `M${236 + i * 8} 60l4 6`), 0.4);
  const mag = K.group(); mag.pen("M0 0L0 70", 0.7); mag.shape(ell(0, 76, 14, 6)); mag.shape("M-14 76L14 76L14 84L-14 84Z");
  const mp = pendulum(3, 0.3);
  [[250, 0], [318, 1], [372, 2]].forEach(([x, i]) => {
    K[i === 1 ? "tint" : "shape"](`M${x - 48} 262L${x - 30} ${222 - i * 6}L${x - 6} ${208 - i * 8}L${x + 18} 224L${x + 42} 262Z`, "rust");
    K.detail(`M${x - 30} 240l40 -6M${x - 20} 252l44 -4M${x - 10} 230l20 -4M${x - 36} 256l10 -8M${x + 10} 248l14 4`);
  });
  thought(K, 200, 92, 52, 26, 140, 138);
  K.text(200, 98, "cost? grade?", 14, { italic: true });
  ground(K, 400, 262);
  return all(skyU, posed(K, 96, 262, 1.85, 1, (fig, t, dt) => fig.draw({ near: hand([45.5, 37]), far: hand([47, 62]), t, dt })),
    (t, dt) => mag.g.setAttribute("transform", `translate(${f(300 + sin(t * 0.3) * 40)} 66) rotate(${f(mp.step(cos(t * 0.3) * 0.08, dt) * 57.3)})`));
});
scene("opt-2", 400, 300, (K) => {
  room(K, 400, 300, 262);
  K.shape("M164 262L236 262L208 112L192 112Z"); K.detail(hatchD(196, 124, 10, 130, 5), 0.4); K.shape(R(150, 256, 100, 6));
  const beam = K.group(); const pans = [K.group(), K.group()];
  beam.pen("M-130 0L130 0", 2.2); beam.detail("M-120 -3l240 0", 0.4);
  pans.forEach((P, i) => { P.pen("M0 0L-24 46M0 0L24 46", 0.7); P.shape("M-32 46L32 46L22 56L-22 56Z"); if (i) P.tint(R(-16, 22, 32, 24), "glow"); else { P.shape(R(-18, 32, 14, 14)); P.tint(R(-4, 26, 18, 20), "rust"); } });
  K.blot(circ(200, 110, 5));
  K.text(70, 230, "melt cost", 11, { italic: true }); K.text(330, 230, "grade window", 11, { italic: true });
  const s = spring(8, 2.2);
  return (t, dt) => {
    const a = s.step(0.14 * sin(t * 0.7), dt);
    beam.g.setAttribute("transform", `translate(200 110) rotate(${f(a * 57.3)})`);
    pans.forEach((P, i) => { const d = i ? 1 : -1; P.g.setAttribute("transform", `translate(${f(200 + d * 130 * cos(a))} ${f(110 + d * 130 * sin(a))})`); });
  };
});
scene("opt-3", 400, 300, (K) => {
  room(K, 400, 300, 280);
  K.shape(R(20, 30, 360, 226)); K.pen("M40 256L36 280M360 256L364 280");
  K.text(110, 56, "melt cost", 13, { italic: true }); K.text(290, 56, "capacity", 13, { italic: true });
  K.pen("M36 70L36 236L184 236M216 70L216 236L364 236");
  K.detail(rep(5, (i) => `M36 ${200 - i * 34}l148 0M216 ${200 - i * 34}l148 0`), 0.3);
  const Lb = [0, 1, 2, 3].map(() => K.shape("")), Rb = [0, 1, 2, 3].map(() => K.tint("", "moss"));
  return (t) => {
    const g = ease(clamp((t * 0.3) % 1.4, 0, 1));
    [0.9, 0.86, 0.8 - 0.06 * g, 0.74 - 0.1 * g].forEach((v, i) => Lb[i].setAttribute("d", R(46 + i * 34, 236 - v * 156, 22, v * 156)));
    [0.5, 0.58, 0.64 + 0.06 * g, 0.7 + 0.12 * g].forEach((v, i) => Rb[i].setAttribute("d", R(226 + i * 34, 236 - v * 156, 22, v * 156)));
  };
});

/* ---------------------------------------------------------------- chapters 6–8 */
scene("quests", 400, 300, (K) => {
  K.wash(R(0, 0, 400, 300), "wall", 1);
  K.detail(rep(9, (i) => `M${40 + i * 40} 20l0 260`) + rep(7, (i) => `M20 ${40 + i * 40}l360 0`), 0.25);
  K.pen("M30 280L30 20M30 280L380 280", 0.9);
  const seed = seeded(9);
  [[110, 110, 0], [260, 96, 1], [170, 214, 2], [312, 214, 3]].forEach(([cx, cy, k]) => {
    K.detail(ell(cx, cy, 46, 38), 0.5).setAttribute("stroke-dasharray", "3 4");
    for (let i = 0; i < 18; i++) {
      const x = cx + seed(-34, 34), y = cy + seed(-28, 28);
      if (k === 0) K.blot(circ(x, y, 3)); else if (k === 1) K.shape(circ(x, y, 3.2), 0.8);
      else if (k === 2) K.pen(`M${f(x - 3)} ${f(y - 3)}l6 6M${f(x + 3)} ${f(y - 3)}l-6 6`, 0.8); else K.tint(circ(x, y, 3), "rust", 0.6);
    }
  });
  const mag = K.group(); mag.shape(circ(0, 0, 32), 2); mag.detail("M-18 -14q8 -10 20 -8", 0.6); mag.pen("M23 23L52 52", 5);
  return (t) => mag.g.setAttribute("transform", `translate(${f(200 + cos(t * 0.35) * 90)} ${f(150 + sin(t * 0.5) * 56)})`);
});
scene("lab", 400, 300, (K) => {
  room(K, 400, 300, 262);
  shelf(K, 230, 60, 150, 31);
  K.shape("M20 210L380 210L380 218L20 218Z"); K.pen("M40 218L40 262M360 218L360 262");
  K.shape("M120 70L156 70L156 132L208 210L68 210L120 132Z");
  K.tint("M95 172L181 172L208 210L68 210Z", "moss", 0);
  K.pen("M120 70L156 70L156 132L208 210L68 210L120 132Z");
  K.shape(R(114, 62, 48, 8)); K.detail("M130 150l12 0M126 162l20 0", 0.5);
  K.shape("M240 210L240 150L256 150L256 210Z"); K.tint("M241 210L241 180L255 180L255 210Z", "indigo", 0); K.shape("M268 210L268 136L280 136L280 210Z"); K.shape(R(232, 200, 56, 10));
  const bub = Array.from({ length: 6 }, () => K.shape("", 0.8));
  const nodes = [[310, 110], [350, 140], [310, 170], [350, 190]];
  nodes.forEach((a, i) => nodes.forEach((b, k) => { if (k > i) K.detail(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`); }));
  nodes.forEach((a) => K.shape(circ(a[0], a[1], 7)));
  const hot = K.tint("", "glow");
  return (t) => {
    bub.forEach((b, i) => { const ph = (t * 0.35 + i / 6) % 1; b.setAttribute("d", circ(138 + sin(i * 2.3) * 18 + wobble(t + i) * 2, 200 - ph * 190, 2.6 + ph * 4)); b.setAttribute("opacity", f(1 - ph)); });
    const n = nodes[floor(t * 1.2) % 4]; hot.setAttribute("d", circ(n[0], n[1], 7));
  };
});
scene("fame", 400, 300, (K) => {
  room(K, 400, 300, 262);
  const lamp = pendant(K, 200, 0, 14);
  K.shape(R(40, 50, 60, 76)); K.shape(R(48, 58, 44, 60), 0.6); K.detail("M56 74l28 0M56 84l20 0M56 94l24 0", 0.5); K.tint(circ(70, 108, 5), "rust", 0.5);
  K.shape(R(300, 50, 60, 76)); K.shape(R(308, 58, 44, 60), 0.6); K.detail("M316 74l28 0M316 84l20 0M316 94l24 0", 0.5); K.tint(circ(330, 108, 5), "indigo", 0.5);
  K.shape(R(120, 216, 160, 46)); K.detail(hatchD(124, 220, 152, 40, 7), 0.3); K.shape(R(112, 210, 176, 8));
  K.shape("M164 80L236 80L228 126Q220 160 200 166Q180 160 172 126Z"); K.tint("M168 88L232 88L228 114L172 114Z", "glow", 0);
  K.pen("M166 88Q138 90 146 114Q152 130 174 132M234 88Q262 90 254 114Q248 130 226 132");
  K.shape(R(192, 166, 16, 26)); K.shape(R(170, 192, 60, 18));
  K.text(200, 205, "Top 10", 10, { italic: true });
  [-1, 1].forEach((d) => { K.pen(`M${200 + d * 64} 206Q${200 + d * 100} 150 ${200 + d * 68} 84`, 0.9); for (let i = 0; i < 5; i++) { const y = 196 - i * 24, x = 200 + d * (82 + 12 * sin((i / 5) * Math.PI)); K.tint(`M${x} ${y}q${d * 14} -6 ${d * 18} -18q${-d * 16} 2 ${-d * 18} 18Z`, "moss", 0.8); } });
  const pts = [[150, 70], [258, 64], [270, 150]];
  const glints = pts.map(() => K.pen("", 0.9));
  return all(lamp, (t) => glints.forEach((g, i) => { const s = max(0, sin(t * 1.4 + i * 2.1)) * 7, p = pts[i]; g.setAttribute("d", `M${p[0] - s} ${p[1]}L${p[0] + s} ${p[1]}M${p[0]} ${p[1] - s}L${p[0]} ${p[1] + s}`); }));
});

/* ---------------------------------------------------------------- finale */
scene("contact", 640, 300, (K) => {
  const skyU = sky(K, 640, 300, { sun: [560, 50], moon: [560, 50], clouds: [[80, 40, 70], [330, 60, 90]] });
  skyline(K, 640, 196, { seed: 14 });
  const S = K.group();
  [[300, 120, "POST"], [420, 110, ""]].forEach(([x, w, label]) => {
    S.shape(R(x, 120, w, 142)); S.shape(`M${x - 6} 120L${x + w + 6} 120L${x + w} 108L${x} 108Z`);
    S.detail(brickD(x, 124, w, 50, 6, 14), 0.35);
    S.shape(R(x + 10, 180, w * 0.45, 60));
    S.wash(R(x + 10.5, 180.5, w * 0.45 - 1, 59), "glow", 1).setAttribute("class", "win-lit");
    S.detail(`M${x + 10 + w * 0.225} 180l0 60M${x + 10} 210l${w * 0.45} 0`);
    S.shape(R(x + w * 0.62, 186, w * 0.28, 76));
    if (label) { S.shape(R(x + 14, 140, 60, 18)); S.text(x + 44, 153, label, 10, { ls: 2 }); }
  });
  K.shape("M560 262L564 196L574 196L578 262Z");
  K.tint("M548 196L590 196L590 168Q569 150 548 168Z", "rust"); K.detail("M556 176l26 0"); K.shape(R(556, 184, 26, 6), 0.6);
  lampPost(K, 620, 262, 130);
  street(K, 640, 262);
  const passer = walker(K, { W: 640, y: 264, s: 1.25, dir: 1, x: 380, look: { hair: "bun", beard: false, coat: "indigo", phase: 2 }, carry: true });
  const planes = [0, 1].map(() => K.group());
  planes.forEach((P) => { P.shape("M0 0L30 -8L10 6Z"); P.shape("M10 6L30 -8L12 12Z"); });
  return all(skyU, passer, posed(K, 180, 270, 1.9, 1, (fig, t, dt) => {
    fig.draw({ near: hand([52 + 3 * sin(t * 6), 18], 1), t, dt });
    planes.forEach((P, i) => { const ph = (t * 0.1 + i * 0.5) % 1; P.g.setAttribute("transform", `translate(${f(220 + ph * 460)} ${f(130 - ph * 90 + sin(ph * 9) * 10)}) rotate(${f(-8 + cos(ph * 9) * 8)})`); P.g.setAttribute("opacity", f(min(1, (1 - ph) * 4))); });
  }));
});

/* ---------------------------------------------------------------- bonus issue */
function rug(K, x, y, w) { K.shape(`M${x} ${y}L${x + w} ${y}L${x + w - 10} ${y + 10}L${x + 10} ${y + 10}Z`, 0.7); K.detail(rep(floor(w / 8), (i) => `M${x + 4 + i * 8} ${y + 10}l0 4`), 0.4); }

scene("off-reading", 400, 300, (K) => {
  room(K, 400, 300, 262);
  windowPane(K, 30, 34, 76, 92);
  shelf(K, 250, 90, 120, 44); shelf(K, 250, 140, 120, 52);
  K.glow(330, 140, 110, 120, "lamp-glow");
  K.shape("M324 262L326 130L330 130L332 262Z"); K.shape("M306 130L350 130L340 102L316 102Z"); K.shape(R(314, 256, 28, 6));
  K.shape("M100 262L100 196Q100 176 120 176L230 176Q248 176 248 196L248 262Z"); K.shape("M88 262L88 210L112 210L112 262Z"); K.shape("M236 262L236 210L260 210L260 262Z");
  K.detail("M114 220l120 0" + hatchD(102, 222, 132, 38, 7), 0.35);
  rug(K, 60, 266, 240);
  const steam = mug(K, 286, 216); K.shape(R(272, 216, 32, 4)); K.pen("M288 220L288 262");
  return all(steam, posed(K, 156, 262, 1.75, 1, (fig, t, dt) => book(fig, fig.draw({ near: hand([55, 60]), far: hand([51, 61]), t, dt }), t)));
});
scene("off-baelance", 400, 300, (K) => {
  room(K, 400, 300, 262);
  K.pen("M10 22Q200 40 390 22", 0.6);
  const cloth = [0, 1, 2].map(() => K.group());
  cloth.forEach((C, i) => { if (i === 1) C.tint("M-12 0L12 0L10 28L-10 28Z", "indigo", 0.9); else C.shape("M-12 0L12 0L14 22L6 20L0 30L-6 20L-14 22Z", 0.9); C.blot(R(-8, -2, 3, 5) + R(5, -2, 3, 5)); });
  const cp = cloth.map(() => pendulum(5, 0.5));
  K.shape("M34 180L34 132L72 102L110 132L110 180Z"); K.shape("M22 134L72 92L122 134L116 138L72 102L28 138Z");
  K.shape(R(60, 148, 22, 32)); K.detail(R(88, 142, 14, 14) + "M95 142l0 14M88 149l14 0");
  K.shape(R(26, 180, 92, 6));
  monitor(K, 168, 70, 196, 124);
  const rows = [0, 1, 2, 3].map((i) => { K.detail(R(184, 86 + i * 26, 12, 12)); return [K.pen("", 1.3), K.detail(`M206 ${92 + i * 26}l${120 - (i % 2) * 30} 0`)]; });
  K.text(266, 80, "Baelance", 9, { italic: true });
  K.pen("M40 262L96 196", 1.4); K.shape("M30 254L54 254L52 272L28 272Z"); K.detail("M32 262l20 0", 0.5);
  K.shape("M330 262L334 226L360 226L364 262Z"); K.detail("M334 236l26 0", 0.5);
  return (t, dt) => {
    const n = floor((t * 0.8) % 5);
    rows.forEach(([tk, ln], i) => { tk.setAttribute("d", i < n ? `M186 ${92 + i * 26}l3 4l6 -9` : ""); ln.setAttribute("opacity", i < n ? 0.35 : 1); });
    cloth.forEach((C, i) => { const x = 110 + i * 90, y = 22 + sin((x / 400) * Math.PI) * 9; C.g.setAttribute("transform", `translate(${x} ${f(y)}) rotate(${f(cp[i].step(sin(t * 0.9 + i) * 0.3, dt) * 57.3)})`); });
  };
});
scene("off-gym", 400, 300, (K) => {
  room(K, 400, 300, 268);
  K.shape(R(250, 40, 120, 170)); el("rect", { x: 256, y: 46, width: 108, height: 158, fill: K.ctx.skyFill(), opacity: 0.5 }, K.g); K.detail("M270 60l20 30M300 60l30 40", 0.4);
  K.pen("M30 268L30 70M110 268L110 70M30 120L110 120M30 200L110 200", 1.4); K.detail("M24 120l6 0M110 120l6 0", 1);
  [140, 160].forEach((y) => { K.shape(circ(40, y + 60, 14)); K.shape(circ(40, y + 60, 4), 0.6); });
  K.shape(R(140, 250, 60, 18)); K.detail("M146 258l48 0", 0.5);
  const clk = clock(K, 200, 50, 12);
  return all(clk, posed(K, 200, 268, 1.85, 1, (fig, t, dt) => {
    const k = ease((1 + sin(t * 1.6)) / 2), y = 42 - 26 * k;
    const r = fig.draw({ far: hand([28, y], -1), near: hand([54, y], 1), swingF: 0, t, dt });
    if (!fig.bar) { fig.bar = fig.front.pen("", 2); fig.plates = fig.front.blot(""); }
    const yy = (r.hf[1] + r.hn[1]) / 2;
    fig.bar.setAttribute("d", `M6 ${f(yy)}L76 ${f(yy)}`);
    fig.plates.setAttribute("d", R(8, yy - 9, 5, 18) + R(15, yy - 7, 4, 14) + R(69, yy - 9, 5, 18) + R(63, yy - 7, 4, 14));
  }));
});
scene("off-badminton", 400, 300, (K) => {
  K.wash(R(0, 0, 400, 262), "wall", 1);
  K.detail(rep(10, (i) => `M${i * 44} 0l0 262`), 0.25);
  [80, 200, 320].forEach((x) => { K.glow(x, 26, 50, 30, "lamp-glow"); K.shape(R(x - 20, 14, 40, 8)); K.pen(`M${x} 0l0 14`, 0.5); });
  K.pen("M0 262L400 262"); K.detail("M0 272L400 272M40 262L20 300M360 262L380 300", 0.6);
  K.pen("M330 262L330 128"); K.detail(rep(7, (i) => `M330 ${132 + i * 8}l70 0`) + rep(9, (i) => `M${330 + i * 8} 132l0 48`), 0.6); K.shape(R(330, 128, 70, 4), 0.6);
  const sh = K.group(); sh.shape("M-3 0L3 0L8 -14L-8 -14Z", 0.8); sh.detail("M-1 0l-3 -14M1 0l3 -14", 0.5); sh.blot(circ(0, 2.5, 3));
  return posed(K, 130, 262, 1.85, 1, (fig, t, dt) => {
    const c = (t * 0.6) % 1, sw = c < 0.25 ? ease(c / 0.25) : 1 - ease((c - 0.25) / 0.75);
    const r = fig.draw({ near: hand([40 + 18 * sw, 20 - 4 * sw], sw > 0.5 ? 1 : -1), t, dt });
    if (!fig.racket) { fig.racket = fig.front.pen("", 1.2); fig.head = fig.front.shape("", 1); }
    const a = -1.9 + sw * 1.6, h = r.hn, e = [h[0] + cos(a) * 14, h[1] + sin(a) * 14];
    fig.racket.setAttribute("d", `M${f(h[0])} ${f(h[1])}L${f(e[0])} ${f(e[1])}`);
    const cx = e[0] + cos(a) * 7, cy = e[1] + sin(a) * 7;
    fig.head.setAttribute("d", ell(cx, cy, 5, 7)); fig.head.setAttribute("transform", `rotate(${f(a * 57.3 + 90)} ${f(cx)} ${f(cy)})`);
    sh.g.setAttribute("transform", `translate(${f(220 + c * 150)} ${f(70 - sin(c * Math.PI) * 40 + c * 60)}) rotate(${f(70 + c * 60)})`);
  });
});
scene("off-fan", 400, 300, (K) => {
  room(K, 400, 300, 262);
  K.shape(R(28, 200, 236, 10)); K.shape(R(40, 210, 212, 52)); K.detail("M146 210l0 52M60 236l10 0M226 236l10 0", 0.6);
  monitor(K, 46, 50, 200, 124);
  const car = K.group(); car.tint("M-40 0L-34 -8L-10 -10L-2 -16L10 -16L16 -9L36 -6L42 0Z", "rust"); car.blot(circ(-24, 2, 7) + circ(26, 2, 7)); car.shape(R(-46, -12, 7, 10));
  K.detail("M46 150l200 0M46 168l200 0" + rep(8, (i) => `M${52 + i * 26} 159l12 0`), 0.4);
  const lines = [0, 1, 2].map(() => K.detail(""));
  K.text(70, 66, "LAP 41", 8, { anchor: "start", ls: 1 });
  K.shape("M300 260L304 140L312 140L316 260Z"); K.shape("M296 140L320 140L318 128L298 128Z");
  const bat = K.group({ transform: "translate(350 256) rotate(14)" }); bat.shape(R(-3, -118, 6, 28)); bat.shape("M-9 -90L9 -90L10 0Q0 6 -10 0Z"); bat.detail("M0 -84l0 80");
  K.tint(circ(378, 252, 7), "rust"); K.detail("M372 249q6 4 12 0");
  rug(K, 30, 266, 300);
  return (t) => {
    const x = 146 + wobble(t, 0.8) * 40;
    car.g.setAttribute("transform", `translate(${f(x)} 160)`);
    lines.forEach((l, i) => l.setAttribute("d", `M${f(x - 56 - i * 6)} ${150 + i * 6}l${-12 - i * 6} 0`));
  };
});
scene("off-hobbies", 400, 300, (K) => {
  room(K, 400, 300, 262);
  windowPane(K, 280, 24, 90, 70);
  [[30, 40, -4], [86, 34, 3], [150, 44, -2]].forEach(([x, y, r]) => { const P = K.group({ transform: `rotate(${r} ${x + 22} ${y})` }); P.shape(R(x, y, 44, 56)); P.detail(`M${x + 6} ${y + 40}q8 -20 16 -8t16 -14`, 0.6); P.blot(circ(x + 22, y + 2, 2)); });
  K.shape(R(226, 196, 156, 46));
  const keys = Array.from({ length: 9 }, (_, i) => K.shape(R(234 + i * 16, 204, 14, 32), 0.8));
  [0, 1, 3, 4, 5, 7].forEach((i) => K.blot(R(243 + i * 16, 204, 8, 19)));
  K.pen("M246 242L236 262M362 242L372 262M240 252l126 0");
  const notes = [0, 1, 2].map(() => { const g = K.group(); g.blot(ell(0, 0, 4.4, 3.4)); g.pen("M4 0L4 -16L10 -12", 1.2); return g; });
  return posed(K, 116, 262, 1.85, 1, (fig, t, dt) => {
    const r = fig.draw({ far: hand([50, 58]), near: hand([56 + 2 * sin(t * 5), 54 + sin(t * 7)]), t, dt });
    if (!fig.pad) { fig.pad = fig.front.shape(""); fig.sk = fig.front.detail(""); }
    const c = r.hf;
    fig.pad.setAttribute("d", R(c[0] - 2, c[1] - 14, 16, 20));
    fig.sk.setAttribute("d", `M${f(c[0] + 1)} ${f(c[1] - 2)}q3 -8 6 -3t6 -6`);
    const press = floor(t * 3) % 9;
    keys.forEach((k, i) => { k.style.fill = i === press ? "var(--glow)" : ""; });
    notes.forEach((n, i) => { const ph = (t * 0.3 + i / 3) % 1; n.g.setAttribute("transform", `translate(${f(260 + i * 40 + sin(ph * 6) * 8)} ${f(180 - ph * 120)})`); n.g.setAttribute("opacity", f(1 - ph)); });
  });
});

/* ---------------------------------------------------------------- 404 */
scene("notfound", 640, 340, (K) => {
  const skyU = sky(K, 640, 340, { sun: [80, 60], moon: [80, 60], clouds: [[300, 40, 90]] });
  skyline(K, 640, 230, { seed: 31 });
  lampPost(K, 120, 300, 170);
  K.shape(R(430, 110, 150, 80)); K.shape(R(436, 116, 138, 68), 0.6); K.pen("M446 190L440 300M564 190L570 300");
  K.text(505, 166, "404", 40);
  street(K, 640, 300);
  const cat = K.group({ transform: "translate(380 300)" });
  cat.shape("M0 0Q-2 -18 8 -20L10 -26L13 -21L17 -26L18 -19Q24 -14 22 0Z", 0.9); const tail = cat.pen("", 0.9);
  return all(skyU, posed(K, 290, 300, 2.0, 1, (fig, t, dt) => {
    const s = ease(clamp(((t * 0.4) % 1) * 3, 0, 1)) * (1 - ease(clamp(((t * 0.4) % 1) * 3 - 2, 0, 1)));
    const r = fig.draw({ far: hand([50, 60 - s * 3]), near: hand([56, 60 - s * 3]), t, dt });
    if (!fig.lap) fig.lap = fig.front.shape("");
    const c = [(r.hf[0] + r.hn[0]) / 2 + 2, (r.hf[1] + r.hn[1]) / 2];
    fig.lap.setAttribute("d", R(c[0] - 2, c[1] - 16, 4, 20) + R(c[0] - 2, c[1] + 2, 16, 3));
  }), (t) => tail.setAttribute("d", `M0 -2Q-14 ${f(-4 + sin(t * 2) * 6)} -16 ${f(-16 + sin(t * 2) * 6)}`));
});

/* ============================================================ runtime */

const items = [];
let running = false, last = 0, uid = 0;

function build(it) {
  const sc = it.sc;
  const svg = el("svg", { viewBox: `0 0 ${sc.W} ${sc.H}`, "aria-hidden": "true", focusable: "false" });
  svg.style.color = "var(--ink)";
  const id = "a" + uid++;
  const { defs, filter } = inkDefs(svg, id);
  const grad = el("radialGradient", { id: `${id}-glow` }, defs);
  el("stop", { offset: "0", style: "stop-color:var(--glow);stop-opacity:.5" }, grad);
  el("stop", { offset: "1", style: "stop-color:var(--glow);stop-opacity:0" }, grad);
  const moon = el("radialGradient", { id: `${id}-moon` }, defs);
  el("stop", { offset: "0", style: "stop-color:#e9e4ff;stop-opacity:.35" }, moon);
  el("stop", { offset: "1", style: "stop-color:#e9e4ff;stop-opacity:0" }, moon);
  let skyGrad = null;
  const skyFill = () => {
    if (!skyGrad) {
      skyGrad = el("linearGradient", { id: `${id}-sky`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: "0", class: "sky-top" }, skyGrad); el("stop", { offset: "1", class: "sky-bottom" }, skyGrad);
    }
    return `url(#${id}-sky)`;
  };
  const root = el("g", { filter }, svg);
  const ctx = { id, skyFill, sky() { svg.insertBefore(el("rect", { width: sc.W, height: sc.H, fill: skyFill() }), root); } };
  it.el.appendChild(svg);
  it.update = sc.build(kit(root, 1, ctx)) || (() => {});
  it.built = true;
  it.t = 0;
  if (REDUCE) { for (let s = 0; s < STILL_AT; s += 1 / 30) { it.t = s; it.update(s, 1 / 30); } }
  else it.update(0, 0);
}

function frame(now) {
  const dt = min(0.05, (now - last) / 1000 || 0);
  if (now - last >= 30) {
    last = now;
    items.forEach((it) => { if (it.vis && it.built) { it.t += dt; it.update(it.t, dt); } });
  }
  running = items.some((it) => it.vis);
  if (running) requestAnimationFrame(frame);
}
function kick() { if (!REDUCE && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

function init() {
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const it = e.target.__art; if (!it) return;
      it.vis = e.isIntersecting;
      if (it.vis && !it.built) build(it);
    });
    kick();
  }, { rootMargin: "200px" }) : null;

  document.querySelectorAll(".art[data-scene]").forEach((node) => {
    const sc = SCENES[node.getAttribute("data-scene")];
    if (!sc) return;
    const it = { el: node, sc, vis: !io, built: false, t: 0 };
    node.__art = it;
    items.push(it);
    if (io) io.observe(node); else build(it);
  });
  kick();
  window.addEventListener("art:show", kick);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
