/*
 * lineart.js — every drawing on this site, as animated ink line art in SVG.
 *
 * Built on line-art-animation (vendor/line-art, MIT): open double-stroke limbs,
 * paper-filled outlines, an ink-wobble filter, a solved walking gait, springs and
 * pendulums. This file adds Monish as a figure (faceless, as the style asks:
 * he reads by his spiky hair, beard and grey blazer), a box of props, and one
 * small scene per panel. Each <div class="art" data-scene> gets an SVG built the
 * first time it nears the viewport; scenes animate only while visible, and
 * prefers-reduced-motion gets a single settled frame. Ink and paper are CSS
 * variables, so the day/night toggle retints everything without a redraw.
 */
import { el, pen as Pen, shape as Shape, blot as Blot, paint, limb, solid, joint, shoe, place, inkDefs, f, PEN, PAPER } from "./vendor/line-art/ink.js";
import { gait } from "./vendor/line-art/gait.js";
import { spring, pendulum, wobble, ease, clamp, seeded } from "./vendor/line-art/motion.js";

const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const STILL_AT = 7; // seconds of simulated time for the reduced-motion frame
const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos;

/* ------------------------------------------------------------ drawing kit */

const R = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
const poly = (pts, close = true) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join("L") + (close ? "Z" : "");
const circ = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;

function kit(g, w = 1) {
  const set = (n, d) => { if (d) n.setAttribute("d", d); return n; };
  const K = {
    g, w,
    pen: (d, lw = w) => set(Pen(g, lw), d),
    detail: (d) => set(Pen(g, w * 0.55), d),
    shape: (d, lw = w) => set(Shape(g, lw), d),
    blot: (d) => set(Blot(g), d),
    tint: (d, c, lw = w) => { const n = paint(g, "none", lw); n.style.fill = `var(--${c})`; return set(n, d); },
    wash: (d, c, op = 1) => { const n = el("path", { opacity: op }, g); n.style.fill = `var(--${c})`; return set(n, d); },
    text: (x, y, s, size, o = {}) => {
      const n = el("text", { x, y, "font-size": size, "text-anchor": o.anchor || "middle", fill: "currentColor", "font-family": "Newsreader, Georgia, serif", "font-style": o.italic ? "italic" : "normal" }, g);
      n.textContent = s; return n;
    },
    group: (attrs) => kit(el("g", attrs || {}, g), w),
  };
  return K;
}

/* ------------------------------------------------------------ Monish */

const walkGait = gait({ kind: "walk" });
const REST = walkGait.pose(0, 0);

function figure(parent) {
  const g = el("g", {}, parent);
  const back = el("g", {}, g); // props held behind the body
  const farArm = limb(g, 3.6);
  const legs = [solid(limb(g, 4.2)), solid(limb(g, 4.2))];
  const shoes = [Blot(g), Blot(g)];
  const coat = paint(g, "none"); coat.style.fill = "var(--blazer)";
  const shirt = Blot(g);
  const lapel = Pen(g, PEN * 0.6);
  const neck = Pen(g, PEN);
  const head = el("ellipse", { rx: 3.7, ry: 4.7, fill: PAPER, stroke: "currentColor", "stroke-width": PEN }, g);
  const ear = Pen(g, PEN * 0.6);
  const beard = Blot(g);
  const hair = Blot(g);
  const nearArm = limb(g, 3.6);
  const front = el("g", {}, g); // props held in front
  [farArm, nearArm].forEach((a) => { const p = a.g.querySelector("path"); p.classList.remove("pp"); p.style.fill = "var(--blazer)"; });
  const swing = [spring(60, 9), spring(60, 9)];

  function arm(L, sh, hand, i, s, dt) {
    if (hand) {
      const elb = joint(sh, hand.p, 17, 16, hand.bend || -1);
      L.draw([sh, elb, hand.p], [0.2, 0.5]);
      return hand.p;
    }
    const a = (swing[i].step(s, dt) * Math.PI) / 180;
    const elb = [sh[0] + 17 * sin(a), sh[1] + 17 * cos(a)];
    const h = [elb[0] + 16 * sin(a + 0.12), elb[1] + 16 * cos(a + 0.12)];
    L.draw([sh, elb, h], [0.2, 0.5]);
    return h;
  }

  /** s: { pose, far, near, seat, lean, swingF, swingN, t, dt } — all in figure space. */
  function draw(s) {
    const p = s.pose || REST, dt = s.dt || 0;
    const breathe = 0.35 * sin((s.t || 0) * 1.7);
    const b = p.bob + breathe;
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
    shirt.setAttribute("d", `M${f(sh[0] - 0.6)} ${f(sh[1] - 0.6)}L${f(sh[0] + 3.4)} ${f(sh[1] - 0.4)}L${f(sh[0] + 1.6)} ${f(sh[1] + 10)}Z`);
    lapel.setAttribute("d", `M${f(sh[0] - 1.2)} ${f(sh[1] - 0.2)}L${f(sh[0] + 1.4)} ${f(sh[1] + 12)}M${f(sh[0] + 3.9)} ${f(sh[1] - 0.2)}L${f(sh[0] + 1.9)} ${f(sh[1] + 12)}M${f(sh[0] + 1.6)} ${f(sh[1] + 12)}L${f(sh[0] + 1.8)} ${f(hy - 4 + b * 0.5)}`);
    const hc = [42.6 + lean * 1.3, 31.4 + b];
    neck.setAttribute("d", `M${f(hc[0] - 1.6)} ${f(hc[1] + 4)}L${f(sh[0] - 0.6)} ${f(sh[1])}M${f(hc[0] + 1.4)} ${f(hc[1] + 4.2)}L${f(sh[0] + 2.4)} ${f(sh[1])}`);
    head.setAttribute("cx", f(hc[0])); head.setAttribute("cy", f(hc[1]));
    ear.setAttribute("d", `M${f(hc[0] - 1.6)} ${f(hc[1] - 1)}q-1.4 0.6 -0.2 2.2`);
    // beard: a crescent of ink along the jaw, heavier at the chin (he faces +x)
    beard.setAttribute("d", `M${f(hc[0] + 3.5)} ${f(hc[1] - 0.6)}Q${f(hc[0] + 4.9)} ${f(hc[1] + 4.6)} ${f(hc[0] + 1)} ${f(hc[1] + 5.9)}Q${f(hc[0] - 2.6)} ${f(hc[1] + 5.6)} ${f(hc[0] - 3.4)} ${f(hc[1] + 1.6)}L${f(hc[0] - 2.4)} ${f(hc[1] + 1.4)}Q${f(hc[0] + 0.2)} ${f(hc[1] + 3.6)} ${f(hc[0] + 2.6)} ${f(hc[1] + 0.6)}Z`);
    // hair: spiky, swept up
    const pts = [[hc[0] - 3.9, hc[1] + 0.8]];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (1.08 + 0.86 * (i / 8));
      const r = i % 2 ? 1.65 : 1.15;
      pts.push([hc[0] + 3.9 * r * cos(a) + (i % 2 ? 0.8 : 0), hc[1] - 0.8 + 4.8 * r * sin(a)]);
    }
    pts.push([hc[0] + 3.7, hc[1] - 1.6], [hc[0] + 1.5, hc[1] - 2.6], [hc[0] - 1.8, hc[1] - 2.2], [hc[0] - 2.8, hc[1] + 0.8]);
    hair.setAttribute("d", poly(pts));

    const shF = [sh[0] - 1, sh[1] + 2], shN = [sh[0] + 1.6, sh[1] + 2.4];
    const legSwing = s.seat ? 0 : (feet[0].ankle[0] - 40) / 12;
    const hf = arm(farArm, shF, s.far, 0, s.swingF != null ? s.swingF : -legSwing * 14, dt);
    const hn = arm(nearArm, shN, s.near, 1, s.swingN != null ? s.swingN : legSwing * 12, dt);
    return { hc, sh, hf, hn, b };
  }
  return { g, back: kit(back, PEN), front: kit(front, PEN), draw };
}

/** A faceless bystander: head, shoulders and a little hair, in figure space units. */
function bust(K, x, y, s, hairStyle, colour) {
  const G = K.group({ transform: `translate(${f(x)} ${f(y)}) scale(${f(s)})` });
  if (colour === "paper") G.shape("M-11 22Q-11 8 0 7Q11 8 11 22Z", PEN); else G.tint("M-11 22Q-11 8 0 7Q11 8 11 22Z", colour, PEN);
  G.shape(ell(0, 0, 5, 6.2), PEN);
  if (hairStyle === 0) G.blot("M-5.2 -0.6Q-5.6 -7.6 0 -7.4Q5.8 -7.6 5.2 -0.8Q3 -4.2 0 -4.4Q-3 -4.2 -5.2 -0.6Z");
  else if (hairStyle === 1) G.blot("M-5.4 2Q-6.4 -8 0 -7.6Q6.4 -8 5.4 2Q4.6 -3.4 0 -3.8Q-4.6 -3.4 -5.4 2Z");
  else G.blot("M-4.6 -2.6Q-3 -7.8 1.6 -7Q6 -6 5 -1.6Q2 -4.6 -4.6 -2.6Z");
  return G;
}

/* ------------------------------------------------------------ props */

function ground(K, W, y) { K.pen(`M0 ${y}L${W} ${y}`); K.detail(Array.from({ length: Math.ceil(W / 40) }, (_, i) => `M${i * 40 + 14} ${y + 6}l14 0`).join("")); }

function furnace(K, x, y, s, ctx) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${s})` });
  const glow = el("ellipse", { cx: 0, cy: -60, rx: 70, ry: 46, fill: `url(#${ctx.id}-glow)` }, G.g);
  G.shape("M-38 0L-34 -56L34 -56L38 0Z");
  G.detail([-44, -34, -24, -14].map((yy) => `M-35 ${yy}Q0 ${yy + 4} 35 ${yy}`).join(""));
  G.shape("M-42 -56L42 -56L42 -62L-42 -62Z");
  G.tint(ell(0, -62, 26, 3.6), "glow", K.w * 0.8);
  G.pen("M-30 0l0 6M30 0l0 6");
  const sparks = Array.from({ length: 6 }, () => G.blot(""));
  return (t) => {
    glow.setAttribute("opacity", f(0.75 + 0.2 * sin(t * 3.1) + 0.05 * sin(t * 7.3)));
    sparks.forEach((sp, i) => {
      const ph = (t * 0.45 + i / 6) % 1;
      sp.setAttribute("d", circ(sin(i * 7.7) * 16 + sin(t * 2 + i) * 3 * ph, -66 - ph * 60, 1.4 * (1 - ph) + 0.3));
    });
  };
}

function camera(K, x, y, s, dir = 1) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${dir * s} ${s})` });
  G.shape("M-2 4L2 4L2 90L-2 90Z");
  G.shape("M-6 4L6 4L4 -2L-4 -2Z");
  G.shape(R(-22, -18, 40, 18));
  G.shape("M18 -16L30 -20L30 2L18 -2Z");
  G.detail("M-18 -12l8 0");
  const led = G.tint(circ(-15, -6, 1.8), "rust", 0.6);
  return (t) => led.setAttribute("opacity", (t * 1.2) % 1 < 0.5 ? 1 : 0.2);
}

function board(K, x, y, s) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${s})` });
  G.shape(R(-2, 0, 10, 50));
  G.shape(R(-34, -16, 76, 54));
  G.detail("M-26 -6l18 0M-26 2l12 0M-26 10l20 0M2 -6l30 0M2 4l22 0M2 14l28 0M2 24l16 0");
  return G;
}

function jetson(K, x, y, s) {
  const G = K.group({ transform: `translate(${x} ${y}) scale(${s})` });
  G.shape(R(-34, -20, 68, 40));
  G.detail(Array.from({ length: 6 }, (_, i) => `M${-28 + i * 6} -16l0 32`).join(""));
  G.shape(circ(-10, 0, 13));
  const fan = G.detail("");
  G.shape(R(14, -14, 14, 8)); G.shape(R(14, -3, 14, 8)); G.shape(R(16, 8, 10, 7));
  const led = G.tint(circ(30, -24, 2.2), "moss", 0.6);
  return (t, ph = 0) => {
    const a = t * 6;
    fan.setAttribute("d", [0, 1, 2, 3, 4].map((k) => { const q = a + (k * TAU) / 5; return `M-10 0L${f(-10 + 11 * cos(q))} ${f(11 * sin(q))}`; }).join(""));
    led.setAttribute("opacity", ((t * 0.9 + ph) % 1) < 0.6 ? 1 : 0.25);
  };
}

function laptop(K, x, y, w, open = true) {
  const G = K.group({ transform: `translate(${x} ${y})` });
  const h = w * 0.62;
  if (open) G.shape(`M${-w / 2 + 2} ${-h}L${w / 2 - 2} ${-h}L${w / 2} 0L${-w / 2} 0Z`);
  G.shape(`M${-w / 2 - 6} 0L${w / 2 + 6} 0L${w / 2 + 3} 4L${-w / 2 - 3} 4Z`);
  return { G, h };
}

function screenFrame(K, x, y, w, h) {
  K.shape(R(x - 4, y - 4, w + 8, h + 8));
  K.shape(R(x, y, w, h), K.w * 0.6);
  K.shape(R(x + w / 2 - 8, y + h + 4, 16, 6));
  K.shape(R(x + w / 2 - 22, y + h + 10, 44, 4));
}

function gear(n, r) {
  const pts = [];
  for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * TAU, rr = i % 4 < 2 ? r : r * 0.8; pts.push([cos(a) * rr, sin(a) * rr]); }
  return poly(pts) + circ(0, 0, r * 0.3);
}

function db(K, x, y, w, h) {
  K.shape(`M${x - w / 2} ${y - h}L${x - w / 2} ${y}A${w / 2} ${w / 6} 0 0 0 ${x + w / 2} ${y}L${x + w / 2} ${y - h}Z`);
  K.shape(ell(x, y - h, w / 2, w / 6));
  K.detail(`M${x - w / 2} ${y - h / 2}A${w / 2} ${w / 6} 0 0 0 ${x + w / 2} ${y - h / 2}`);
}

function cloud(K, x, y, s) {
  K.shape(`M${x - 30 * s} ${y + 8 * s}Q${x - 36 * s} ${y - 6 * s} ${x - 20 * s} ${y - 6 * s}Q${x - 16 * s} ${y - 22 * s} ${x} ${y - 18 * s}Q${x + 16 * s} ${y - 26 * s} ${x + 22 * s} ${y - 8 * s}Q${x + 38 * s} ${y - 6 * s} ${x + 30 * s} ${y + 8 * s}Z`);
}

function arrow(K, x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 6;
  K.pen(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}M${f(x2 - L * cos(a - 0.45))} ${f(y2 - L * sin(a - 0.45))}L${f(x2)} ${f(y2)}L${f(x2 - L * cos(a + 0.45))} ${f(y2 - L * sin(a + 0.45))}`);
}

function lamp(K, x, y, h, ctx) {
  if (ctx) el("ellipse", { class: "lamp-glow", cx: x, cy: y - h - 4, rx: 70, ry: 60, fill: `url(#${ctx.id}-glow)` }, K.g);
  K.shape(`M${x - 2} ${y}L${x - 1.4} ${y - h}L${x + 1.4} ${y - h}L${x + 2} ${y}Z`);
  K.shape(`M${x - 9} ${y - h}L${x + 9} ${y - h}L${x + 6} ${y - h - 12}L${x - 6} ${y - h - 12}Z`);
  K.detail(`M${x} ${y - h - 12}l0 -5`);
}

function smoke(K, x, y, n = 4) {
  const puffs = Array.from({ length: n }, () => K.shape("", K.w * 0.8));
  return (t) => puffs.forEach((p, i) => {
    const ph = (t * 0.12 + i / n) % 1;
    p.setAttribute("d", circ(x + ph * 40 + wobble(t + i, 0.5) * 3, y - ph * 80, 4 + ph * 12));
    p.setAttribute("opacity", f(1 - ph * 0.9));
  });
}

/* ------------------------------------------------------------ scenes
 * Each scene: [W, H, build(K, ctx) -> update(t, dt)]. K is a kit on the
 * filtered root group, in scene units. Figures go through place(). */

const SCENES = {};
const scene = (name, W, H, build) => { SCENES[name] = { W, H, build }; };

const posed = (K, x, y, s, dir, fn) => {
  const fig = figure(K.g);
  place(fig.g, x, y, dir, s);
  return (t, dt) => fn(fig, t, dt);
};

const hand = (p, bend = -1) => ({ p, bend });

/* cover: he walks along a factory street, stops by the lamp and waves */
function coverBuild(K, ctx, W, H, opt = {}) {
  const G = H - 40;
  ctx.sky();
  // factory: sawtooth shed, chimney, gate
  K.shape(`M24 ${G}L24 ${G - 92}L54 ${G - 122}L54 ${G - 92}L84 ${G - 122}L84 ${G - 92}L114 ${G - 122}L114 ${G - 92}L144 ${G - 122}L144 ${G - 92}L174 ${G - 122}L174 ${G}Z`);
  K.detail([54, 84, 114, 144].map((x) => `M${x} ${G - 92}l0 -26`).join("") + [0, 1, 2, 3, 4].map((i) => R(34 + i * 28, G - 78, 18, 22)).join(""));
  K.detail([0, 1, 2, 3, 4].map((i) => `M${43 + i * 28} ${G - 78}l0 22M${34 + i * 28} ${G - 67}l18 0`).join(""));
  K.shape(`M186 ${G}L190 ${G - 168}L204 ${G - 168}L208 ${G}Z`);
  K.detail(`M188 ${G - 150}l18 0M188 ${G - 140}l18 0`);
  const puffs = smoke(K, 197, G - 176, 5);
  K.shape(R(196, G - 54, 120, 54));
  K.detail(R(206, G - 44, 32, 44) + R(248, G - 40, 22, 18) + R(280, G - 40, 22, 18) + `M206 ${G - 22}l32 0M222 ${G - 44}l0 44`);
  K.shape(`M190 ${G - 54}L322 ${G - 54}L316 ${G - 64}L196 ${G - 64}Z`);
  // lamp post with a swinging sign
  lamp(K, 500, G, 150, ctx);
  const signG = K.group();
  const sign = signG.shape(""), chain = signG.detail("");
  const pend = pendulum(9, 1.2);
  ground(K, W, G);
  // birds on the wire
  K.pen(`M330 ${G - 140}Q420 ${G - 126} 500 ${G - 146}`, 0.7);
  K.blot(ell(372, G - 136, 3, 2) + ell(392, G - 135, 3, 2));

  const fig = figure(K.g);
  const S = opt.scale || 1.75, stopX = opt.stopX || 440;
  let x = opt.startX != null ? opt.startX : -40, phase = 0, go = 1, waveT = 0;
  return (t, dt) => {
    puffs(t);
    if (x < stopX) { go = clamp((stopX - x) / 30, 0, 1) * 0.85 + 0.15; }
    else go = Math.max(0, go - dt * 2.5);
    phase += (dt / walkGait.period) * go;
    if (x < stopX) x += walkGait.speed * S * dt * go;
    place(fig.g, x, G, 1, S);
    const p = walkGait.pose(phase, go);
    let near = null;
    if (go < 0.2) { waveT += dt; const u = ease(clamp(waveT / 0.6, 0, 1)); near = hand([44 + 6 * u + 3 * sin(waveT * 7) * u, 46 - 28 * u], 1); }
    fig.draw({ pose: p, near, t, dt });
    const a = pend.step(sin(t * 0.7) * 0.25 + (go > 0.2 ? 0 : 0), dt);
    signG.g.setAttribute("transform", `rotate(${f(a * 57.3)} 512 ${G - 140})`);
    chain.setAttribute("d", `M500 ${G - 140}L512 ${G - 140}M512 ${G - 140}l0 6`);
    sign.setAttribute("d", R(500, G - 134, 26, 14));
  };
}
scene("cover", 640, 360, (K, ctx) => coverBuild(K, ctx, 640, 360));
scene("og", 640, 360, (K, ctx) => coverBuild(K, ctx, 640, 360, { startX: 440 }));

/* chapter 1 */
scene("origin-forge", 400, 300, (K, ctx) => {
  const fz = furnace(K, 120, 260, 1.15, ctx);
  K.shape("M200 260L204 214L232 214L236 260Z"); K.detail("M206 230l26 0M206 244l26 0");
  ground(K, 400, 260);
  return posed(K, 312, 260, 1.8, -1, (fig, t, dt) => { fz(t); fig.draw({ near: hand([66 + 2 * wobble(t, 0.6), 50]), t, dt }); });
});
scene("origin-books", 400, 300, (K) => {
  [0, 1, 2, 3].forEach((i) => K[i === 1 ? "tint" : "shape"](R(56 + i * 3, 238 - i * 20, 120 - i * 6, 20), "rust"));
  K.detail("M66 252l90 0M72 212l80 0");
  K.blot("M84 158L118 146L152 158L118 170Z"); K.blot(R(108, 162, 20, 10)); K.pen("M146 160L150 186");
  ground(K, 400, 260);
  return posed(K, 290, 260, 1.8, 1, (fig, t, dt) => {
    const r = fig.draw({ near: hand([55, 60]), far: hand([51, 61]), t, dt });
    book(fig, r, t);
  });
});
function book(fig, r, t) {
  if (!fig.bookN) { fig.bookN = fig.front.shape(""); fig.bookP = fig.front.detail(""); fig.bookC = fig.front.tint("", "rust"); }
  const c = [(r.hn[0] + r.hf[0]) / 2 + 1, (r.hn[1] + r.hf[1]) / 2 - 3];
  fig.bookC.setAttribute("d", poly([[c[0] - 1, c[1] - 9], [c[0] + 3, c[1] - 10], [c[0] + 3, c[1] + 6], [c[0] - 1, c[1] + 7]]));
  const turn = (t * 0.3) % 1 < 0.15 ? sin(((t * 0.3) % 1) / 0.15 * Math.PI) : 0;
  fig.bookN.setAttribute("d", poly([[c[0] - 1, c[1] - 9], [c[0] - 9 + turn * 6, c[1] - 11], [c[0] - 9 + turn * 6, c[1] + 5], [c[0] - 1, c[1] + 7]]));
  fig.bookP.setAttribute("d", `M${f(c[0] - 7)} ${f(c[1] - 6)}l4 1M${f(c[0] - 7)} ${f(c[1] - 2)}l4 1`);
}
scene("origin-ai", 400, 300, (K, ctx) => {
  const fz = furnace(K, 74, 260, 0.62, ctx);
  const cam = camera(K, 152, 120, 0.9, -1);
  K.pen("M126 112L84 196M126 120L60 200", 0.5).setAttribute("stroke-dasharray", "3 4");
  const fig = figure(K.g); place(fig.g, 262, 260, 1, 1.4);
  const { G } = laptop(K, 300, 186, 44);
  K.shape("M220 186L380 186L380 192L220 192Z"); K.shape("M232 192L238 260L244 260L240 192Z"); K.shape("M360 192L356 260L362 260L368 192Z");
  K.shape("M240 214L268 214L268 220L240 220Z"); K.pen("M254 220L254 260");
  ground(K, 400, 260);
  return (t, dt) => { fz(t); cam(t); fig.draw({ seat: true, near: hand([60 + sin(t * 9) * 0.8, 62 + Math.abs(sin(t * 9)) * 1.2]), far: hand([56 + sin(t * 9 + 2) * 0.8, 63]), t, dt }); };
});

/* chapter 2 — pipeline */
scene("pipe-sense", 300, 240, (K) => {
  const cam = camera(K, 74, 76, 1, 1);
  const rays = [0, 1, 2].map(() => K.pen("", 0.8));
  K.shape(circ(212, 150, 42)); K.detail(Array.from({ length: 7 }, (_, k) => { const a = Math.PI + (k / 6) * Math.PI; return `M${f(212 + cos(a) * 32)} ${f(150 + sin(a) * 32)}L${f(212 + cos(a) * 38)} ${f(150 + sin(a) * 38)}`; }).join(""));
  const needle = K.tint("", "rust", 0.8); K.blot(circ(212, 150, 3));
  return (t) => {
    cam(t);
    rays.forEach((r, i) => { const ph = (t * 0.5 + i / 3) % 1; r.setAttribute("d", `M${f(112 + ph * 50)} ${f(60 - ph * 20)}Q${f(118 + ph * 56)} ${f(70)} ${f(112 + ph * 50)} ${f(80 + ph * 20)}`); r.setAttribute("opacity", f(1 - ph)); });
    const a = Math.PI * 1.3 + wobble(t, 0.8) * 0.5;
    needle.setAttribute("d", `M${f(212 + cos(a + 1.57) * 2)} ${f(150 + sin(a + 1.57) * 2)}L${f(212 + cos(a) * 30)} ${f(150 + sin(a) * 30)}L${f(212 - cos(a + 1.57) * 2)} ${f(150 - sin(a + 1.57) * 2)}Z`);
  };
});
scene("pipe-edge", 300, 240, (K) => {
  K.pen("M40 186L260 186"); K.detail("M60 186l0 20M240 186l0 20");
  K.pen("M40 150Q20 150 20 120M260 150Q290 150 280 100", 0.7);
  const j = jetson(K, 150, 140, 1.8);
  return (t) => j(t);
});
scene("pipe-data", 300, 240, (K) => {
  K.shape(R(40, 34, 220, 172));
  const cells = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { K.detail(R(50 + c * 52, 44 + r * 22, 46, 14)); cells.push(K.wash(R(51 + c * 52, 45 + r * 22, 44, 12), c === 1 ? "rust" : "blazer", 0.0)); }
  return (t) => { const n = Math.floor((t * 3) % 34); cells.forEach((c, i) => c.setAttribute("opacity", i < n ? 0.55 : 0)); };
});
scene("pipe-optimize", 300, 240, (K) => {
  const G1 = K.group(), G2 = K.group(), G3 = K.group();
  G1.shape(gear(10, 52)); G2.tint(gear(7, 34), "glow"); G3.shape(gear(6, 26));
  K.shape(ell(76, 46, 34, 18)); K.text(76, 51, "MILP", 14, { italic: true });
  K.pen("M92 62Q98 70 104 76", 0.7);
  return (t) => {
    G1.g.setAttribute("transform", `translate(120 140) rotate(${f(t * 24)})`);
    G2.g.setAttribute("transform", `translate(205 100) rotate(${f(-t * 34 + 12)})`);
    G3.g.setAttribute("transform", `translate(212 184) rotate(${f(-t * 41 + 8)})`);
  };
});
scene("pipe-decide", 300, 240, (K) => {
  board(K, 210, 70, 1.3);
  const ticks = [0, 1, 2].map((i) => { K.detail(R(176, 66 + i * 18, 9, 9)); K.detail(`M190 ${70 + i * 18}l50 0`); return K.pen("", 1.2); });
  ground(K, 300, 220);
  return posed(K, 72, 220, 1.32, 1, (fig, t, dt) => {
    fig.draw({ near: hand([82, 46]), t, dt });
    ticks.forEach((tk, i) => tk.setAttribute("d", (t * 0.6) % 4 > i + 0.6 ? `M177 ${71 + i * 18}l3 3l6 -8` : ""));
  });
});

/* chapter 3 — the workbench */
scene("belt", 800, 200, (K, ctx) => {
  K.shape("M20 150L780 150L780 160L20 160Z");
  K.pen("M40 160L40 200M760 160L760 200M400 160L400 200");
  K.shape("M60 60L740 60L740 66L60 66Z"); K.detail("M90 66l0 10M710 66l0 10");
  // pegboard tools
  K.pen("M120 30L120 60M120 30l-6 -8M120 30l6 -8", 0.9);
  K.shape(R(150, 26, 34, 34)); K.text(167, 50, "C++", 12);
  K.shape(R(196, 26, 34, 34)); K.text(213, 50, "Py", 13, { italic: true });
  db(K, 270, 58, 30, 26);
  cloud(K, 650, 46, 0.9);
  K.text(700, 42, "AWS · GCP", 11, { anchor: "start" });
  const { G } = laptop(K, 110, 150, 70); G.detail("M-26 -36l30 0M-26 -28l40 0M-26 -20l22 0");
  const j = jetson(K, 250, 128, 0.9);
  const cam = camera(K, 380, 104, 0.7, 1);
  const gG = K.group(); gG.shape(gear(8, 18));
  K.shape(R(470, 118, 60, 32)); K.detail("M480 128l40 0M480 136l30 0");
  K.shape(R(560, 112, 26, 38)); K.shape(R(592, 104, 26, 46)); K.shape(R(624, 96, 26, 54));
  // a hanging work lamp swinging gently
  const lG = K.group(); lG.pen("M440 66L440 96", 0.8); lG.shape("M428 96L452 96L446 84L434 84Z");
  const pend = pendulum(6, 0.6);
  return (t, dt) => {
    j(t); cam(t);
    gG.g.setAttribute("transform", `translate(${f(700)} ${f(128)}) rotate(${f(t * 30)})`);
    lG.g.setAttribute("transform", `rotate(${f(pend.step(sin(t * 0.8) * 0.4, dt) * 57.3)} 440 66)`);
  };
});

/* chapter 4 — experience */
scene("exp-np", 520, 300, (K) => {
  K.shape(R(220, 40, 260, 150));
  const fl = K.group();
  fl.pen(R(240, 60, 50, 26) + ell(350, 73, 26, 14) + R(240, 120, 50, 26)); fl.tint(R(330, 120, 50, 26), "glow");
  arrow(fl, 292, 73, 322, 73); arrow(fl, 265, 88, 265, 118); arrow(fl, 292, 133, 328, 133); arrow(fl, 350, 89, 354, 118);
  K.pen("M240 190L232 248M460 190L468 248");
  ground(K, 520, 262);
  [[290, 0, "indigo"], [360, 1, "rust"], [430, 2, "blazer"]].forEach(([x, hs, c]) => bust(K, x, 268, 2.1, hs, c));
  return posed(K, 130, 262, 1.8, 1, (fig, t, dt) => fig.draw({ near: hand([76, 34 + 2 * sin(t * 0.9)]), t, dt }));
});
scene("exp-bf", 300, 300, (K, ctx) => {
  K.shape(R(40, 30, 22, 236)); K.shape(R(238, 30, 22, 236)); K.shape(R(30, 18, 240, 24));
  const ramG = K.group(); ramG.shape(R(90, 0, 120, 46)); ramG.detail("M150 -100L150 0M100 12l100 0");
  K.shape(R(70, 230, 160, 36)); K.detail("M80 244l140 0");
  K.g.appendChild(el("ellipse", { cx: 150, cy: 224, rx: 60, ry: 22, fill: `url(#${ctx.id}-glow)` }));
  K.tint("M114 230Q114 216 150 216Q186 216 186 230Z", "glow");
  ground(K, 300, 266);
  return (t) => {
    const c = (t * 0.45) % 1, y = c < 0.12 ? 54 + 116 * ease(c / 0.12) : c < 0.2 ? 170 : 170 - 116 * ease((c - 0.2) / 0.8);
    ramG.g.setAttribute("transform", `translate(0 ${f(y)})`);
  };
});

/* chapter 5 — case files */
function thought(K, x, y, rx, ry, tx, ty) {
  K.shape(ell(x, y, rx, ry));
  K.shape(circ(tx + (x - tx) * 0.35, ty + (y - ty) * 0.35, 5)); K.shape(circ(tx + (x - tx) * 0.12, ty + (y - ty) * 0.12, 3));
}
scene("mcp-1", 400, 300, (K) => {
  db(K, 300, 252, 64, 50); db(K, 300, 186, 64, 34);
  K.shape(R(232, 224, 40, 30)); K.shape(R(226, 230, 40, 30)); K.detail("M232 238l26 0M232 246l20 0");
  thought(K, 236, 74, 50, 30, 150, 132);
  const q = K.text(236, 84, "?", 34, { italic: true });
  ground(K, 400, 262);
  return posed(K, 110, 262, 1.85, 1, (fig, t, dt) => { q.setAttribute("y", f(84 + wobble(t, 0.7) * 2)); fig.draw({ near: hand([45.5, 37]), far: hand([47, 62]), lean: -0.6, t, dt }); });
});
scene("mcp-2", 400, 300, (K) => {
  const src = [[64, 80], [64, 150], [64, 220]], hub = [196, 150];
  src.forEach((s) => K.pen(`M${s[0] + 24} ${s[1]}L${hub[0] - 32} ${hub[1]}`, 0.8));
  db(K, 64, 98, 40, 34); K.shape(R(42, 134, 44, 32)); K.detail("M50 146l28 0M50 154l20 0"); K.shape("M64 202L80 230Q64 244 48 230Z");
  const hex = []; for (let k = 0; k < 6; k++) hex.push([hub[0] + cos((k / 6) * TAU) * 32, hub[1] + sin((k / 6) * TAU) * 32]);
  K.tint(poly(hex), "indigo"); K.shape(circ(hub[0], hub[1], 10));
  K.text(196, 104, "ontology", 12, { italic: true });
  arrow(K, 230, 150, 262, 150); K.shape(R(264, 128, 44, 44)); K.text(286, 155, "MCP", 12);
  arrow(K, 310, 150, 330, 150);
  K.shape("M334 132Q334 126 340 126L376 126Q382 126 382 132L382 160Q382 166 376 166L350 166L340 176L342 166L340 166Q334 166 334 160Z");
  const dots = src.map(() => K.blot("")), talk = [0, 1, 2].map(() => K.blot(""));
  return (t) => {
    src.forEach((s, i) => { const ph = (t * 0.4 + i / 3) % 1; dots[i].setAttribute("d", circ(s[0] + 24 + (hub[0] - 32 - s[0] - 24) * ph, s[1] + (hub[1] - s[1]) * ph, 2.6)); });
    talk.forEach((d, i) => d.setAttribute("d", circ(348 + i * 10, 146, (Math.floor(t * 3) % 3) === i ? 3 : 1.8)));
  };
});
scene("mcp-3", 400, 300, (K) => {
  const seed = seeded(5);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) bust(K, 204 + c * 46 + (r % 2) * 18, 96 + r * 56, 1.9, Math.floor(seed(0, 3)), (r * 4 + c) === 5 ? "rust" : (r * 4 + c) === 10 ? "indigo" : "paper");
  ground(K, 400, 262);
  return posed(K, 86, 262, 1.85, 1, (fig, t, dt) => fig.draw({ near: hand([50 + 2 * sin(t * 6), 18], 1), t, dt }));
});

scene("edge-1", 400, 300, (K, ctx) => {
  const glow = el("ellipse", { cx: 330, cy: 60, rx: 60, ry: 50, fill: `url(#${ctx.id}-glow)` }, K.g);
  K.shape("M310 76L350 76L346 52Q330 36 314 52Z"); K.shape(R(304, 76, 52, 8));
  const { G } = laptop(K, 190, 240, 170);
  G.shape("M0 -84L34 -30L-34 -30Z"); G.pen("M0 -70L0 -46"); G.blot(circ(0, -38, 2.4));
  ground(K, 400, 244);
  return (t) => glow.setAttribute("opacity", f(0.45 + 0.55 * Math.max(0, sin(t * 5))));
});
scene("edge-2", 400, 300, (K) => {
  const xs = [44, 122, 200, 278, 356];
  for (let i = 0; i < 4; i++) arrow(K, xs[i] + 22, 120, xs[i + 1] - 22, 120);
  xs.forEach((x) => K.shape(R(x - 20, 100, 40, 40)));
  const labels = ["build", "prepare", "approve", "activate", "verify"];
  xs.forEach((x, i) => K.text(x, 90, labels[i], 11, { italic: true }));
  K.detail("M117 112l10 0l0 16l-10 0z" + "M190 120l7 7l12 -14");
  K.pen("M356 144Q346 230 278 144", 0.9).setAttribute("stroke-dasharray", "5 5");
  K.text(318, 222, "rollback", 12, { italic: true });
  const tok = K.tint("", "rust", 0.8);
  return (t) => { const p = (t * 0.3) % 1; tok.setAttribute("d", circ(xs[0] + (xs[4] - xs[0]) * ease(p), 70, 5)); };
});
scene("edge-3", 400, 300, (K) => {
  cloud(K, 200, 54, 1.2);
  const pos = [[70, 160], [200, 150], [330, 160], [130, 240], [270, 240]];
  pos.forEach((p) => K.pen(`M200 70L${p[0]} ${p[1] - 18}`, 0.6).setAttribute("stroke-dasharray", "3 4"));
  const js = pos.map((p) => jetson(K, p[0], p[1], 0.62));
  return (t) => js.forEach((j, i) => j(t, i * 0.23));
});

scene("vis-1", 400, 300, (K, ctx) => {
  const fz = furnace(K, 220, 262, 1.15, ctx);
  const cam = camera(K, 60, 70, 0.9, 1);
  K.pen("M86 62L170 180M86 70L130 200", 0.5).setAttribute("stroke-dasharray", "3 4");
  ground(K, 400, 262);
  const marks = [0, 1, 2].map((i) => K.text(300 + i * 26, 70, "?", 26, { italic: true }));
  return (t) => { fz(t); cam(t); marks.forEach((m, i) => m.setAttribute("y", f(70 + wobble(t + i, 0.8) * 4))); };
});
scene("vis-2", 400, 300, (K) => {
  screenFrame(K, 30, 24, 340, 214);
  K.shape("M120 92L190 92L180 150L130 150Z"); K.tint(ell(155, 92, 36, 6), "glow", 0.8);
  K.shape(R(190, 200, 80, 30));
  const stream = K.tint("", "glow", 0.6);
  const b1 = K.pen("", 0.9), b2 = K.pen("", 0.9);
  b1.setAttribute("stroke-dasharray", "5 4"); b2.setAttribute("stroke-dasharray", "5 4");
  const l1 = K.text(0, 0, "ladle 0.94", 10, { anchor: "start" }), l2 = K.text(0, 0, "pour 0.91", 10, { anchor: "start" });
  return (t) => {
    const w = 4 + sin(t * 8);
    stream.setAttribute("d", `M184 100L192 100L${f(214 + w)} 200L${f(206 + w)} 200Z`);
    const j = wobble(t, 2) * 2;
    b1.setAttribute("d", R(108 + j, 74, 96, 86)); b2.setAttribute("d", R(176 - j, 180, 106, 56));
    l1.setAttribute("x", f(110 + j)); l1.setAttribute("y", 70); l2.setAttribute("x", f(178 - j)); l2.setAttribute("y", 176);
  };
});
scene("vis-3", 400, 300, (K) => {
  K.shape(R(30, 40, 340, 150));
  const names = ["heat start", "tapping", "deslag", "heat end"];
  const bars = names.map((n, i) => { K.text(40, 66 + i * 32, n, 11, { anchor: "start", italic: true }); K.detail(`M120 ${62 + i * 32}l236 0`); return K.tint("", ["rust", "glow", "indigo", "moss"][i], 0.8); });
  K.shape(circ(300, 246, 36)); const arc = K.pen("", 3);
  return (t) => {
    const g = clamp(((t * 0.25) % 1.3), 0, 1);
    bars.forEach((b, i) => { const w = 56 * clamp(g * 4 - i, 0, 1); b.setAttribute("d", w > 1 ? R(126 + i * 56, 55 + i * 32, w, 14) : ""); });
    const a = Math.PI * Math.max(0.02, g);
    arc.setAttribute("d", `M270 246A30 30 0 0 1 ${f(300 - 30 * cos(a))} ${f(246 - 30 * sin(a))}`);
  };
});

scene("opt-1", 400, 300, (K) => {
  [[250, 0], [318, 1], [372, 2]].forEach(([x, i]) => {
    K[i === 1 ? "tint" : "shape"](`M${x - 48} 262L${x - 30} ${222 - i * 6}L${x - 6} ${208 - i * 8}L${x + 18} ${224}L${x + 42} 262Z`, "rust");
    K.detail(`M${x - 30} 240l40 -6M${x - 20} 252l44 -4M${x - 10} 230l20 -4`);
  });
  thought(K, 220, 76, 52, 28, 140, 128);
  K.text(220, 82, "cost? grade?", 14, { italic: true });
  ground(K, 400, 262);
  return posed(K, 96, 262, 1.85, 1, (fig, t, dt) => fig.draw({ near: hand([45.5, 37]), far: hand([47, 62]), t, dt }));
});
scene("opt-2", 400, 300, (K) => {
  K.shape("M170 262L230 262L208 112L192 112Z");
  const beam = K.group(); const pans = [K.group(), K.group()];
  beam.pen("M-130 0L130 0", 2.2);
  pans.forEach((P, i) => { P.pen("M0 0L-24 46M0 0L24 46", 0.7); P.shape("M-32 46L32 46L22 56L-22 56Z"); P[i ? "tint" : "shape"](R(-16, 22, 32, 24), "glow"); });
  K.blot(circ(200, 110, 5));
  const s = spring(8, 2.2);
  return (t, dt) => {
    const a = s.step(0.14 * sin(t * 0.7), dt);
    beam.g.setAttribute("transform", `translate(200 110) rotate(${f(a * 57.3)})`);
    pans.forEach((P, i) => { const d = i ? 1 : -1; P.g.setAttribute("transform", `translate(${f(200 + d * 130 * cos(a))} ${f(110 + d * 130 * sin(a))})`); });
  };
});
scene("opt-3", 400, 300, (K) => {
  K.text(110, 54, "melt cost", 13, { italic: true }); K.text(290, 54, "capacity", 13, { italic: true });
  K.pen("M36 70L36 240L184 240M216 70L216 240L364 240");
  const L = [0, 1, 2, 3].map(() => K.shape("")), Rr = [0, 1, 2, 3].map(() => K.tint("", "moss"));
  return (t) => {
    const g = ease(clamp((t * 0.3) % 1.4, 0, 1));
    [0.9, 0.86, 0.8 - 0.06 * g, 0.74 - 0.1 * g].forEach((v, i) => L[i].setAttribute("d", R(46 + i * 34, 240 - v * 160, 22, v * 160)));
    [0.5, 0.58, 0.64 + 0.06 * g, 0.7 + 0.12 * g].forEach((v, i) => Rr[i].setAttribute("d", R(226 + i * 34, 240 - v * 160, 22, v * 160)));
  };
});

/* chapters 6–8 */
scene("quests", 400, 300, (K) => {
  const seed = seeded(9);
  [[110, 110, 0], [260, 96, 1], [170, 214, 2], [312, 214, 3]].forEach(([cx, cy, k]) => {
    for (let i = 0; i < 16; i++) {
      const x = cx + seed(-34, 34), y = cy + seed(-28, 28);
      if (k === 0) K.blot(circ(x, y, 3)); else if (k === 1) K.shape(circ(x, y, 3.2), 0.8);
      else if (k === 2) K.pen(`M${f(x - 3)} ${f(y - 3)}l6 6M${f(x + 3)} ${f(y - 3)}l-6 6`, 0.8); else K.tint(circ(x, y, 3), "rust", 0.6);
    }
  });
  const mag = K.group(); mag.shape(circ(0, 0, 32), 2); mag.pen("M23 23L52 52", 5);
  return (t) => mag.g.setAttribute("transform", `translate(${f(200 + cos(t * 0.35) * 90)} ${f(150 + sin(t * 0.5) * 56)})`);
});
scene("lab", 400, 300, (K) => {
  K.shape("M150 60L190 60L190 128L246 252L94 252L150 128Z");
  K.tint("M124 194L216 194L246 252L94 252Z", "moss", 0);
  K.pen("M150 60L190 60L190 128L246 252L94 252L150 128Z");
  K.shape(R(144, 52, 52, 8));
  const bub = Array.from({ length: 6 }, () => K.shape("", 0.8));
  const nodes = [[300, 80], [352, 120], [300, 160], [352, 200]], nn = [];
  nodes.forEach((a, i) => nodes.forEach((b, k) => { if (k > i) K.detail(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`); }));
  nodes.forEach((a) => nn.push(K.shape(circ(a[0], a[1], 9))));
  const hot = K.tint("", "glow");
  return (t) => {
    bub.forEach((b, i) => { const ph = (t * 0.35 + i / 6) % 1; b.setAttribute("d", circ(170 + sin(i * 2.3) * 22 + wobble(t + i) * 2, 238 - ph * 210, 3 + ph * 4)); b.setAttribute("opacity", f(1 - ph)); });
    const n = nodes[Math.floor(t * 1.2) % 4]; hot.setAttribute("d", circ(n[0], n[1], 9));
  };
});
scene("fame", 400, 300, (K) => {
  K.shape("M164 70L236 70L228 116Q220 150 200 156Q180 150 172 116Z"); K.tint("M168 78L232 78L228 104L172 104Z", "glow", 0);
  K.pen("M166 78Q138 80 146 104Q152 120 174 122M234 78Q262 80 254 104Q248 120 226 122");
  K.shape(R(192, 156, 16, 34)); K.shape(R(166, 190, 68, 18)); K.shape(R(156, 208, 88, 12));
  K.text(200, 202, "Top 10", 11, { italic: true });
  // laurels
  [-1, 1].forEach((d) => { K.pen(`M${200 + d * 70} 230Q${200 + d * 110} 160 ${200 + d * 72} 80`, 0.9); for (let i = 0; i < 6; i++) { const y = 216 - i * 24, x = 200 + d * (88 + 12 * sin((i / 6) * Math.PI)); K.shape(`M${x} ${y}q${d * 14} -6 ${d * 18} -18q${-d * 16} 2 ${-d * 18} 18Z`, 0.8); } });
  const glints = [[150, 60], [258, 54], [272, 150]].map(() => K.pen("", 0.9));
  return (t) => glints.forEach((g, i) => { const s = Math.max(0, sin(t * 1.4 + i * 2.1)) * 7; const p = [[150, 60], [258, 54], [272, 150]][i]; g.setAttribute("d", `M${p[0] - s} ${p[1]}L${p[0] + s} ${p[1]}M${p[0]} ${p[1] - s}L${p[0]} ${p[1] + s}`); });
});

/* finale */
scene("contact", 640, 300, (K) => {
  K.shape("M470 262L476 168L486 168L492 262Z");
  K.shape("M452 168L510 168L510 132Q481 112 452 132Z"); K.detail("M462 146l38 0"); K.tint(R(508, 132, 4, 22), "rust", 0.6);
  ground(K, 640, 262);
  const planes = [0, 1].map(() => K.group());
  planes.forEach((P) => { P.shape("M0 0L30 -8L10 6Z"); P.shape("M10 6L30 -8L12 12Z"); });
  return posed(K, 220, 262, 1.9, 1, (fig, t, dt) => {
    fig.draw({ near: hand([52 + 3 * sin(t * 6), 18], 1), t, dt });
    planes.forEach((P, i) => { const ph = (t * 0.12 + i * 0.5) % 1; P.g.setAttribute("transform", `translate(${f(260 + ph * 420)} ${f(130 - ph * 70 + sin(ph * 9) * 10)}) rotate(${f(-8 + cos(ph * 9) * 8)})`); P.g.setAttribute("opacity", f(Math.min(1, (1 - ph) * 4))); });
  });
});

/* bonus issue */
scene("off-reading", 400, 300, (K, ctx) => {
  K.g.appendChild(el("ellipse", { cx: 318, cy: 130, rx: 110, ry: 120, fill: `url(#${ctx.id}-glow)` }));
  lamp(K, 320, 262, 150);
  K.shape("M96 262L96 196Q96 176 116 176L240 176Q258 176 258 196L258 262Z"); K.shape("M84 262L84 210L108 210L108 262Z"); K.shape("M246 262L246 210L270 210L270 262Z");
  K.detail("M110 220l130 0");
  ground(K, 400, 262);
  return posed(K, 160, 262, 1.75, 1, (fig, t, dt) => { const r = fig.draw({ near: hand([55, 60]), far: hand([51, 61]), t, dt }); book(fig, r, t); });
});
scene("off-baelance", 400, 300, (K) => {
  K.shape("M44 150L44 102L82 72L120 102L120 150Z"); K.shape("M32 104L82 62L132 104L126 108L82 72L38 108Z");
  K.shape(R(70, 118, 22, 32)); K.detail(R(98, 112, 14, 14) + "M105 112l0 14M98 119l14 0");
  screenFrame(K, 168, 70, 196, 124);
  const rows = [0, 1, 2, 3].map((i) => { K.detail(R(184, 86 + i * 26, 12, 12)); return [K.pen("", 1.3), K.detail(`M206 ${92 + i * 26}l${120 - (i % 2) * 30} 0`)]; });
  K.pen("M40 262L96 166", 1.4); K.shape("M30 254L54 254L52 280L28 280Z");
  ground(K, 400, 262);
  return (t) => { const n = Math.floor((t * 0.8) % 5); rows.forEach(([tk, ln], i) => { tk.setAttribute("d", i < n ? `M186 ${92 + i * 26}l3 4l6 -9` : ""); ln.setAttribute("opacity", i < n ? 0.35 : 1); }); };
});
scene("off-gym", 400, 300, (K) => {
  ground(K, 400, 268);
  return posed(K, 200, 268, 1.85, 1, (fig, t, dt) => {
    const k = ease((1 + sin(t * 1.6)) / 2), y = 42 - 26 * k;
    const r = fig.draw({ far: hand([28, y], -1), near: hand([54, y], 1), swingF: 0, t, dt });
    if (!fig.bar) { fig.bar = fig.front.pen("", 2); fig.plates = fig.front.blot(""); }
    const yy = (r.hf[1] + r.hn[1]) / 2;
    fig.bar.setAttribute("d", `M6 ${f(yy)}L76 ${f(yy)}`);
    fig.plates.setAttribute("d", R(8, yy - 9, 5, 18) + R(15, yy - 7, 4, 14) + R(69, yy - 9, 5, 18) + R(63, yy - 7, 4, 14));
  });
});
scene("off-badminton", 400, 300, (K) => {
  K.pen("M330 262L330 128"); K.detail(Array.from({ length: 7 }, (_, i) => `M330 ${132 + i * 8}l60 0`).join("") + Array.from({ length: 8 }, (_, i) => `M${330 + i * 8} 132l0 48`).join(""));
  ground(K, 400, 262);
  const sh = K.group(); sh.shape("M-3 0L3 0L8 -14L-8 -14Z", 0.8); sh.blot(circ(0, 2.5, 3));
  return posed(K, 130, 262, 1.85, 1, (fig, t, dt) => {
    const c = (t * 0.6) % 1, sw = c < 0.25 ? ease(c / 0.25) : 1 - ease((c - 0.25) / 0.75);
    const r = fig.draw({ near: hand([40 + 18 * sw, 20 - 4 * sw], sw > 0.5 ? 1 : -1), t, dt });
    if (!fig.racket) { fig.racket = fig.front.pen("", 1.2); fig.head = fig.front.shape("", 1); fig.strings = fig.front.detail(""); }
    const a = -1.9 + sw * 1.6, h = r.hn, e = [h[0] + cos(a) * 14, h[1] + sin(a) * 14];
    fig.racket.setAttribute("d", `M${f(h[0])} ${f(h[1])}L${f(e[0])} ${f(e[1])}`);
    const cx = e[0] + cos(a) * 7, cy = e[1] + sin(a) * 7;
    fig.head.setAttribute("d", ell(cx, cy, 5, 7)); fig.head.setAttribute("transform", `rotate(${f(a * 57.3 + 90)} ${f(cx)} ${f(cy)})`);
    const p = c;
    sh.g.setAttribute("transform", `translate(${f(220 + p * 150)} ${f(70 - sin(p * Math.PI) * 40 + p * 60)}) rotate(${f(70 + p * 60)})`);
  });
});
scene("off-fan", 400, 300, (K) => {
  screenFrame(K, 34, 50, 220, 136);
  K.detail("M34 150l220 0M34 170l220 0");
  const car = K.group(); car.tint("M-40 0L-34 -8L-10 -10L-2 -16L10 -16L16 -9L36 -6L42 0Z", "rust"); car.blot(circ(-24, 2, 7) + circ(26, 2, 7)); car.shape(R(-46, -12, 7, 10));
  const lines = [0, 1, 2].map(() => K.detail(""));
  const bat = K.group({ transform: "translate(318 210) rotate(18)" }); bat.shape(R(-4, -120, 8, 30)); bat.shape("M-10 -90L10 -90L11 30Q0 36 -11 30Z"); bat.detail("M0 -84l0 106");
  K.tint(circ(352, 254, 8), "rust"); K.detail("M346 250q6 4 12 0");
  ground(K, 400, 262);
  return (t) => {
    const x = 144 + wobble(t, 0.8) * 40;
    car.g.setAttribute("transform", `translate(${f(x)} 160)`);
    lines.forEach((l, i) => l.setAttribute("d", `M${f(x - 56 - i * 6)} ${150 + i * 6}l${-12 - i * 6} 0`));
  };
});
scene("off-hobbies", 400, 300, (K) => {
  K.shape(R(226, 196, 156, 46));
  const keys = Array.from({ length: 9 }, (_, i) => K.shape(R(234 + i * 16, 204, 14, 32), 0.8));
  [0, 1, 3, 4, 5, 7].forEach((i) => K.blot(R(243 + i * 16, 204, 8, 19)));
  const notes = [0, 1, 2].map(() => { const g = K.group(); g.blot(ell(0, 0, 4.4, 3.4)); g.pen("M4 0L4 -16L10 -12", 1.2); return g; });
  ground(K, 400, 262);
  return posed(K, 116, 262, 1.85, 1, (fig, t, dt) => {
    const r = fig.draw({ far: hand([50, 58]), near: hand([56 + 2 * sin(t * 5), 54 + sin(t * 7)]), t, dt });
    if (!fig.pad) { fig.pad = fig.front.shape(""); fig.sk = fig.front.detail(""); }
    const c = r.hf;
    fig.pad.setAttribute("d", R(c[0] - 2, c[1] - 14, 16, 20));
    fig.sk.setAttribute("d", `M${f(c[0] + 1)} ${f(c[1] - 2)}q3 -8 6 -3t6 -6`);
    const press = Math.floor(t * 3) % 9;
    keys.forEach((k, i) => k.style.fill = i === press ? "var(--glow)" : "");
    notes.forEach((n, i) => { const ph = (t * 0.3 + i / 3) % 1; n.g.setAttribute("transform", `translate(${f(260 + i * 40 + sin(ph * 6) * 8)} ${f(180 - ph * 120)})`); n.g.setAttribute("opacity", f(1 - ph)); });
  });
});

/* 404 */
scene("notfound", 640, 340, (K, ctx) => {
  lamp(K, 120, 300, 170, ctx);
  K.shape(R(430, 120, 140, 70)); K.pen("M446 190L440 300M554 190L560 300");
  K.text(500, 170, "404", 40);
  ground(K, 640, 300);
  return posed(K, 300, 300, 2.0, 1, (fig, t, dt) => {
    const s = ease(clamp(((t * 0.4) % 1) * 3, 0, 1)) * (1 - ease(clamp(((t * 0.4) % 1) * 3 - 2, 0, 1)));
    const r = fig.draw({ far: hand([50, 60 - s * 3]), near: hand([56, 60 - s * 3]), t, dt });
    if (!fig.lap) { fig.lap = fig.front.shape(""); fig.face = fig.front.detail(""); }
    const c = [(r.hf[0] + r.hn[0]) / 2 + 2, (r.hf[1] + r.hn[1]) / 2];
    fig.lap.setAttribute("d", R(c[0] - 2, c[1] - 16, 4, 20) + R(c[0] - 2, c[1] + 2, 16, 3));
    fig.face.setAttribute("d", "");
  });
});

/* ------------------------------------------------------------ runtime */

const items = [];
let running = false, last = 0, uid = 0;

function build(it) {
  const sc = it.sc;
  const svg = el("svg", { viewBox: `0 0 ${sc.W} ${sc.H}`, "aria-hidden": "true", focusable: "false", preserveAspectRatio: "xMidYMid meet" });
  svg.style.color = "var(--ink)";
  const id = "a" + uid++;
  const { defs, filter } = inkDefs(svg, id);
  const grad = el("radialGradient", { id: `${id}-glow` }, defs);
  el("stop", { offset: "0", style: "stop-color:var(--glow);stop-opacity:.55" }, grad);
  el("stop", { offset: "1", style: "stop-color:var(--glow);stop-opacity:0" }, grad);
  let skyRect = null;
  const ctx = {
    id,
    sky() {
      const lg = el("linearGradient", { id: `${id}-sky`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: "0", class: "sky-top" }, lg); el("stop", { offset: "1", class: "sky-bottom" }, lg);
      skyRect = el("rect", { width: sc.W, height: sc.H, fill: `url(#${id}-sky)` }, svg);
      svg.insertBefore(skyRect, root);
    },
  };
  const root = el("g", { filter }, svg);
  it.el.appendChild(svg);
  it.update = sc.build(kit(root, 1), ctx) || (() => {});
  it.built = true;
  it.t = 0;
  if (REDUCE) { for (let s = 0; s < STILL_AT; s += 1 / 30) { it.t = s; it.update(s, 1 / 30); } }
  else it.update(0, 0);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  if (now - last >= 30) { // ~30 fps is plenty for line art and kinder to phones
    last = now;
    items.forEach((it) => { if (it.vis && it.built && !it.el.closest("[hidden]")) { it.t += dt; it.update(it.t, dt); } });
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
    node.style.aspectRatio = `${sc.W} / ${sc.H}`;
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
