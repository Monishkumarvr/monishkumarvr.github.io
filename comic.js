/*
 * comic.js — every drawing on this site, generated at runtime on <canvas>.
 *
 * A tiny ink library (wobbly hand-drawn lines, halftone dots, bursts, speed
 * lines, hatching, SFX lettering), a procedural version of Monish as a comic
 * character, a box of props, and a registry of panel scenes. Each
 * <canvas data-scene="name"> on the page is drawn in its scene's design
 * coordinates and scaled to fit. Animation runs "on twos" (12 fps), only for
 * panels on screen; line work "boils" (re-jitters) a few times a second like
 * hand-drawn animation. prefers-reduced-motion gets one still frame.
 * Canvases are decorative (aria-hidden); all real content is in the HTML.
 */
(function () {
  "use strict";

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;
  var PAL = {};

  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, f) { return (cs.getPropertyValue(n) || "").trim() || f; }
    PAL = {
      ink: v("--ink", "#141414"),
      paper: v("--panel", "#fffaf0"),
      red: v("--accent", "#d62839"),
      yellow: v("--accent-2", "#ffcf33"),
      blue: v("--accent-3", "#1f6fd1"),
      dot: v("--dot", "rgba(20,20,20,.1)"),
      skin: "#c98a5e",
      hair: "#17120f",
      blazer: "#8b9098",
      black: "#1d1d20",
      metal: "#ef7a2b",
      white: "#fffdf7",
      green: "#25b56b",
      wood: "#c38d55",
      steel: "#6d727a",
      dark: document.documentElement.getAttribute("data-theme") === "dark"
    };
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ------------------------------------------------------------------ pen */

  function pen(ctx, seed) {
    var r = mulberry(seed);
    function J(a) { return (r() - 0.5) * 2 * a; }
    var P = { ctx: ctx, r: r, J: J };

    function trace(pts, close, j, smooth) {
      var q = pts.map(function (p) { return [p[0] + J(j), p[1] + J(j)]; });
      var n = q.length, i;
      ctx.beginPath();
      if (!smooth) {
        for (i = 0; i < n; i++) { if (i) ctx.lineTo(q[i][0], q[i][1]); else ctx.moveTo(q[i][0], q[i][1]); }
        if (close) ctx.closePath();
        return;
      }
      if (close) {
        ctx.moveTo((q[n - 1][0] + q[0][0]) / 2, (q[n - 1][1] + q[0][1]) / 2);
        for (i = 0; i < n; i++) {
          var a = q[i], b = q[(i + 1) % n];
          ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
        ctx.closePath();
      } else {
        ctx.moveTo(q[0][0], q[0][1]);
        for (i = 1; i < n - 1; i++) {
          var c = q[i], d = q[i + 1];
          ctx.quadraticCurveTo(c[0], c[1], (c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
        }
        ctx.lineTo(q[n - 1][0], q[n - 1][1]);
      }
    }

    function paint(o) {
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke !== false) {
        ctx.strokeStyle = o.stroke || PAL.ink;
        ctx.lineWidth = o.lw == null ? 2.4 : o.lw;
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    P.shape = function (pts, o) {
      o = o || {};
      trace(pts, o.close !== false, o.jit == null ? 0.7 : o.jit, !!o.smooth);
      paint(o);
    };
    P.line = function (x1, y1, x2, y2, o) {
      o = o || {};
      var d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(d / 14)), pts = [];
      for (var i = 0; i <= n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
      trace(pts, false, o.jit == null ? 0.6 : o.jit, true);
      paint({ stroke: o.stroke, lw: o.lw });
    };
    P.ell = function (cx, cy, rx, ry, o) {
      o = o || {};
      var n = o.n || Math.max(10, Math.round((rx + ry) / 2.2)), pts = [];
      for (var i = 0; i < n; i++) { var a = i / n * TAU; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      trace(pts, true, o.jit == null ? 0.55 : o.jit, true);
      paint(o);
    };
    P.rect = function (x, y, w, h, o) { P.shape([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); };
    P.dot = function (x, y, rad, col) { ctx.fillStyle = col || PAL.ink; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill(); };
    P.dots = function (x, y, w, h, col, gap, fn) {
      ctx.fillStyle = col;
      for (var yy = 0, row = 0; yy <= h; yy += gap * 0.866, row++) {
        for (var xx = row % 2 ? gap / 2 : 0; xx <= w; xx += gap) {
          var f = fn ? fn(xx / w, yy / h) : 0.35;
          if (f <= 0.03) continue;
          ctx.beginPath(); ctx.arc(x + xx, y + yy, f * gap * 0.5, 0, TAU); ctx.fill();
        }
      }
    };
    P.burst = function (cx, cy, r1, r2, n, o) {
      var pts = [];
      for (var i = 0; i < n * 2; i++) {
        var a = i / (n * 2) * TAU + (o.rot || 0), rr = (i % 2 ? r1 : r2) * (0.88 + r() * 0.24);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      P.shape(pts, o);
    };
    P.speed = function (cx, cy, r1, r2, n, o) {
      o = o || {};
      ctx.strokeStyle = o.col || PAL.ink; ctx.lineWidth = o.lw || 1.2; ctx.lineCap = "round";
      for (var i = 0; i < n; i++) {
        var a = i / n * TAU + r() * 0.15, a1 = r1 * (0.85 + r() * 0.35);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * a1, cy + Math.sin(a) * a1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }
    };
    P.hatch = function (x, y, w, h, gap, o) {
      o = o || {};
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.strokeStyle = o.col || PAL.ink; ctx.lineWidth = o.lw || 1;
      for (var d = -h; d < w; d += gap) {
        ctx.beginPath(); ctx.moveTo(x + d + J(0.6), y + h); ctx.lineTo(x + d + h + J(0.6), y); ctx.stroke();
      }
      ctx.restore();
    };
    P.sfx = function (txt, x, y, size, o) {
      o = o || {};
      ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0);
      ctx.font = size + "px Bangers, Impact, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      ctx.lineWidth = size / 6; ctx.strokeStyle = o.stroke || "#141414"; ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = o.fill || PAL.yellow; ctx.fillText(txt, 0, 0);
      ctx.restore();
    };
    P.bubble = function (cx, cy, rx, ry, tx, ty, o) {
      o = o || {};
      var fill = o.fill || PAL.white;
      var a = Math.atan2(ty - cy, tx - cx), bx = cx + Math.cos(a) * rx * 0.6, by = cy + Math.sin(a) * ry * 0.6;
      var px = -Math.sin(a) * 7, py = Math.cos(a) * 7;
      var tail = [[bx + px, by + py], [tx, ty], [bx - px, by - py]];
      P.shape(tail, { jit: 0, lw: 2.2 });
      P.ell(cx, cy, rx, ry, { jit: 0, lw: 2.2 });
      P.shape(tail, { fill: fill, stroke: false, jit: 0 });
      P.ell(cx, cy, rx - 1.1, ry - 1.1, { fill: fill, stroke: false, jit: 0 });
    };
    return P;
  }

  /* ------------------------------------------------------------ the hero */

  function poseOf(name, t) {
    var s = Math.sin;
    switch (name) {
      case "wave": return { R: [2.45, 2.95 + 0.45 * s(t * 8)], L: [0.2, 0.1], mouth: "open" };
      case "point": return { R: [1.5, 1.55], L: [0.2, 0.1], mouth: "open" };
      case "type": return { R: [0.35, -1.25 + 0.14 * s(t * 18)], L: [0.35, -1.25 + 0.14 * s(t * 18 + 1.7)], front: true };
      case "think": return { R: [1.2, -2.3], L: [0.2, 0.1], front: true, mouth: "flat", brows: "skeptic" };
      case "read": return { R: [0.4, -1.9], L: [0.4, -1.9], front: true, prop: "book" };
      case "laptop": return { R: [0.9, -1.3], L: [0.9, -1.3], front: true, mouth: "frown", brows: "sad", prop: "laptop" };
      case "lift":
        var k = (1 + s(t * 3)) / 2;
        return { R: [2.4 + 0.4 * k, 3.05], L: [2.4 + 0.4 * k, 3.05], mouth: "grit", prop: "barbell" };
      case "swing":
        var w = s(t * 5);
        return { R: [2.3 + 0.5 * w, 2.5 + 0.9 * w], L: [0.6, 1.0], mouth: "open", prop: "racket" };
      case "sketch": return { R: [0.45, -1.7 + 0.18 * s(t * 10)], L: [0.5, -1.95], front: true, prop: "pad" };
      default: return { R: [0.2, 0.1], L: [0.2, 0.1] };
    }
  }

  function hero(P, x, y, sc, name, t, opt) {
    opt = opt || {};
    var c = P.ctx, p = poseOf(name, t);
    c.save(); c.translate(x, y); c.scale(opt.flip ? -sc : sc, sc);

    if (!opt.seated) {
      P.rect(-14, -44, 11, 40, { fill: PAL.black });
      P.rect(3, -44, 11, 40, { fill: PAL.black });
      P.ell(-9, -3, 10, 4.5, { fill: PAL.black });
      P.ell(9, -3, 10, 4.5, { fill: PAL.black });
    }
    P.shape([[-21, -86], [21, -86], [17, -42], [-17, -42]], { fill: PAL.blazer });
    P.shape([[-7, -87], [7, -87], [5, -43], [-5, -43]], { fill: PAL.black, lw: 1.6 });
    P.line(-7, -86, -2, -63, { lw: 1.6 }); P.line(7, -86, 2, -63, { lw: 1.6 });

    function arm(side, a) {
      var sx = 17 * side, sy = -82;
      var ex = sx + Math.sin(a[0]) * 22 * side, ey = sy + Math.cos(a[0]) * 22;
      return [sx, sy, ex, ey, ex + Math.sin(a[1]) * 20 * side, ey + Math.cos(a[1]) * 20];
    }
    var arms = [arm(1, p.R), arm(-1, p.L)];
    function sleeve(A) {
      c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(A[2], A[3]); c.lineTo(A[4], A[5]);
      c.strokeStyle = PAL.ink; c.lineWidth = 13; c.stroke();
      c.strokeStyle = PAL.blazer; c.lineWidth = 8.4; c.stroke();
    }
    function drawArms() {
      arms.forEach(sleeve);
      if (p.prop) prop(P, p.prop, arms, t);
      arms.forEach(function (A) { P.ell(A[4], A[5], 5.4, 5.4, { fill: PAL.skin, lw: 2 }); });
    }
    if (!p.front) drawArms();
    head(P, p, t);
    if (p.front) drawArms();
    c.restore();
  }

  function head(P, p, t) {
    var c = P.ctx, lip = "#efc3a3";
    P.rect(-5, -96, 10, 11, { fill: PAL.skin, lw: 1.8 });
    P.ell(-20, -113, 4.5, 6, { fill: PAL.skin, lw: 1.8 });
    P.ell(20, -113, 4.5, 6, { fill: PAL.skin, lw: 1.8 });
    P.ell(0, -114, 19, 22, { fill: PAL.skin });
    P.shape([[-19, -114], [-18, -102], [-12, -93], [0, -89], [12, -93], [18, -102], [19, -114],
      [15, -110], [11, -104], [5, -106], [0, -105], [-5, -106], [-11, -104], [-15, -110]],
      { fill: PAL.hair, lw: 1.6, smooth: true });
    P.shape([[-20, -110], [-23, -122], [-28, -127], [-21, -132], [-24, -141], [-13, -139], [-10, -149],
      [-2, -142], [5, -152], [10, -142], [20, -148], [18, -137], [28, -134], [22, -124], [20, -110],
      [17, -127], [7, -132], [-5, -131], [-16, -128]], { fill: PAL.hair, lw: 1.8 });

    var blink = (t % 4.3) < 0.15 && t > 0;
    [-8, 8].forEach(function (ex) {
      if (blink) { P.line(ex - 4, -116, ex + 4, -116, { lw: 2 }); return; }
      P.ell(ex, -116, 4.4, 5, { fill: PAL.white, lw: 1.6 });
      P.dot(ex + 0.6, -115.5, 2.8, "#3a2215");
      P.dot(ex + 1.5, -116.8, 0.9, "#ffffff");
    });
    if (p.brows === "sad") { P.line(-13, -122, -4, -126, { lw: 3 }); P.line(13, -122, 4, -126, { lw: 3 }); }
    else if (p.brows === "skeptic") { P.line(-13, -124, -4, -123, { lw: 3 }); P.line(4, -127, 13, -125, { lw: 3 }); }
    else { P.line(-13, -124, -4, -125, { lw: 3 }); P.line(4, -125, 13, -124, { lw: 3 }); }
    P.line(0, -113, -2, -107, { lw: 1.4 }); P.line(-2, -107, 1.5, -106.5, { lw: 1.4 });

    var m = p.mouth || "smile";
    if (m === "open") P.shape([[-6, -101], [6, -101], [3, -96], [-3, -96]], { fill: PAL.white, lw: 1.4, smooth: true });
    else if (m === "grit") P.rect(-6, -102, 12, 5, { fill: PAL.white, lw: 1.4 });
    else if (m === "frown") { P.line(-5, -97, 0, -100, { stroke: lip, lw: 1.8 }); P.line(0, -100, 5, -97, { stroke: lip, lw: 1.8 }); }
    else if (m === "flat") P.line(-5, -99, 5, -99.5, { stroke: lip, lw: 1.8 });
    else { P.line(-5, -100, 0, -97, { stroke: lip, lw: 1.8 }); P.line(0, -97, 5, -100, { stroke: lip, lw: 1.8 }); }
  }

  function prop(P, kind, A, t) {
    var c = P.ctx, R = A[0], L = A[1], cx = (R[4] + L[4]) / 2, cy = R[5];
    if (kind === "book") {
      P.shape([[cx - 18, cy - 12], [cx, cy - 9], [cx + 18, cy - 12], [cx + 18, cy + 10], [cx, cy + 13], [cx - 18, cy + 10]], { fill: PAL.red });
      P.line(cx, cy - 9, cx, cy + 13, { lw: 1.6 });
    } else if (kind === "laptop") {
      P.rect(cx - 21, cy - 26, 42, 30, { fill: "#5b5f66" });
      P.rect(cx - 17, cy - 22, 34, 22, { fill: "#e5ebf0", lw: 1.6 });
      P.dot(cx - 6, cy - 15, 1.8); P.dot(cx + 6, cy - 15, 1.8);
      P.line(cx - 6, cy - 6, cx, cy - 10, { lw: 1.6 }); P.line(cx, cy - 10, cx + 6, cy - 6, { lw: 1.6 });
    } else if (kind === "barbell") {
      var y0 = R[5];
      P.line(-56, y0, 56, y0, { lw: 3.4 });
      [-51, -43, 43, 51].forEach(function (px) { P.rect(px - 3.5, y0 - 13, 7, 26, { fill: PAL.black }); });
    } else if (kind === "racket") {
      var ang = Math.atan2(R[5] - R[3], R[4] - R[2]);
      var hx = R[4] + Math.cos(ang) * 16, hy = R[5] + Math.sin(ang) * 16;
      P.line(R[4], R[5], hx, hy, { lw: 2.6 });
      c.save(); c.translate(hx + Math.cos(ang) * 12, hy + Math.sin(ang) * 12); c.rotate(ang + Math.PI / 2);
      P.ell(0, 0, 9, 13, { fill: "rgba(255,255,255,.5)", lw: 2.2 });
      P.line(-6, 0, 6, 0, { lw: 0.8 }); P.line(0, -10, 0, 10, { lw: 0.8 });
      c.restore();
    } else if (kind === "pad") {
      P.rect(cx - 20, cy - 16, 32, 24, { fill: PAL.white });
      P.shape([[cx - 15, cy], [cx - 9, cy - 9], [cx - 3, cy - 2], [cx + 3, cy - 11]], { close: false, lw: 1.4, smooth: true });
    }
  }

  /* --------------------------------------------------------------- props */

  function sv(P, x, y, s, fn) { var c = P.ctx; c.save(); c.translate(x, y); c.scale(s, s); fn(c); c.restore(); }

  function desk(P, x, y, w) {
    P.rect(x - w / 2 + 8, y + 9, 7, 70, { fill: "#6b4a2b" });
    P.rect(x + w / 2 - 15, y + 9, 7, 70, { fill: "#6b4a2b" });
    P.rect(x - w / 2, y, w, 10, { fill: PAL.wood });
  }
  function laptopBack(P, x, y, w) {
    var h = w * 0.62;
    P.shape([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 3, y - h], [x - w / 2 + 3, y - h]], { fill: PAL.steel });
    P.ell(x, y - h / 2, 3.5, 3.5, { fill: PAL.white, lw: 1 });
  }
  function screen(P, x, y, w, h, fn) {
    P.rect(x - 5, y - 5, w + 10, h + 10, { fill: "#3b3f46" });
    P.rect(x, y, w, h, { fill: "#eef4f8", lw: 1.4 });
    var c = P.ctx; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (fn) fn(x, y, w, h);
    c.restore();
  }
  function laptopFront(P, x, y, w, fn) {
    var h = w * 0.6;
    screen(P, x - w / 2, y - h - 6, w, h, fn);
    P.shape([[x - w / 2 - 8, y], [x + w / 2 + 8, y], [x + w / 2 + 16, y + 9], [x - w / 2 - 16, y + 9]], { fill: "#8a8f97" });
  }
  function furnace(P, x, y, s, t) {
    sv(P, x, y, s, function (c) {
      var g = c.createRadialGradient(0, -64, 4, 0, -64, 95);
      g.addColorStop(0, "rgba(255,170,60,.6)"); g.addColorStop(1, "rgba(255,170,60,0)");
      c.fillStyle = g; c.fillRect(-110, -170, 220, 180);
      P.shape([[-46, -60], [46, -60], [38, 0], [-38, 0]], { fill: "#57524e" });
      P.hatch(-38, -52, 76, 48, 9, { col: "rgba(0,0,0,.35)" });
      P.ell(0, -60, 46, 10, { fill: PAL.metal });
      P.ell(0, -61, 30, 5.5, { fill: "#ffd76e", stroke: false });
      for (var i = 0; i < 10; i++) {
        var ph = (t * 0.8 + i / 10) % 1;
        var sx = Math.sin(i * 12.9) * 34 * ph + Math.sin(i * 3.1) * 10, sy = -64 - ph * 95;
        P.dot(sx, sy, 2.8 * (1 - ph) + 0.6, i % 2 ? "#ffd76e" : "#ff8a3d");
      }
    });
  }
  function camera(P, x, y, s, flip, t) {
    var c = P.ctx; c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
    P.rect(-4, 4, 8, 80, { fill: "#8b8f96" });
    P.rect(-24, -18, 46, 24, { fill: "#e3e5e8" });
    P.shape([[22, -13], [36, -18], [36, 10], [22, 3]], { fill: "#9aa0a8" });
    P.ell(31, -4, 5, 9, { fill: "#1f2329" });
    P.dot(-15, -10, 3, (t * 2) % 1 < 0.5 ? "#e5383b" : "#6e2a2a");
    c.restore();
  }
  function jetson(P, x, y, s, t, phase) {
    sv(P, x, y, s, function () {
      P.rect(-50, -30, 100, 60, { fill: "#2a2e35" });
      P.rect(-41, -24, 54, 48, { fill: "#15171b" });
      for (var i = 0; i < 6; i++) P.line(-37 + i * 9, -22, -37 + i * 9, 22, { stroke: "#4c525b", lw: 1.4, jit: 0.2 });
      P.ell(-14, 0, 17, 17, { fill: "#0e1013", stroke: "#59606a", lw: 1.6 });
      var a = t * 9;
      for (var k = 0; k < 5; k++) {
        var aa = a + k * 1.2566;
        P.line(-14, 0, -14 + Math.cos(aa) * 14, Math.sin(aa) * 14, { stroke: "#9aa1ab", lw: 2.4, jit: 0 });
      }
      P.rect(21, -23, 21, 12, { fill: "#c9ccd1", lw: 1.4 });
      P.rect(21, -7, 21, 12, { fill: "#c9ccd1", lw: 1.4 });
      P.rect(23, 10, 17, 10, { fill: "#c9ccd1", lw: 1.4 });
      P.dot(43, -25, 3.2, ((t * 1.4 + (phase || 0)) % 1) < 0.6 ? PAL.green : "#1d4d33");
    });
  }
  function gear(P, x, y, r, n, rot, fill) {
    var pts = [];
    for (var i = 0; i < n * 4; i++) {
      var a = rot + i / (n * 4) * TAU, rr = i % 4 < 2 ? r : r * 0.78;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    P.shape(pts, { fill: fill || "#b9bec6", jit: 0.3 });
    P.ell(x, y, r * 0.3, r * 0.3, { fill: PAL.paper });
  }
  function arrow(P, x1, y1, x2, y2, o) {
    o = o || {};
    P.line(x1, y1, x2, y2, { lw: o.lw || 2.4, stroke: o.col });
    var a = Math.atan2(y2 - y1, x2 - x1), L = o.head || 9;
    P.shape([[x2, y2], [x2 - Math.cos(a - 0.45) * L, y2 - Math.sin(a - 0.45) * L],
      [x2 - Math.cos(a + 0.45) * L, y2 - Math.sin(a + 0.45) * L]], { fill: o.col || PAL.ink, stroke: o.col, lw: 1.4 });
  }
  function star(P, x, y, r, fill) { P.burst(x, y, r * 0.45, r, 5, { fill: fill || PAL.yellow, rot: -Math.PI / 2, lw: 1.8 }); }
  function cloud(P, x, y, s, fill) {
    var b = [[-22, 0, 18, 14], [0, -9, 22, 18], [22, 0, 18, 14], [0, 6, 30, 12]];
    fill = fill || PAL.white;
    b.forEach(function (e) { P.ell(x + e[0] * s, y + e[1] * s, e[2] * s, e[3] * s, { fill: fill, jit: 0.3 }); });
    b.forEach(function (e) { P.ell(x + e[0] * s, y + e[1] * s, (e[2] - 2.2) * s, (e[3] - 2.2) * s, { fill: fill, stroke: false, jit: 0 }); });
  }
  function db(P, x, y, w, h, fill) {
    P.ell(x, y, w / 2, w / 6, { fill: fill });
    P.rect(x - w / 2, y - h, w, h, { fill: fill, jit: 0.3 });
    P.ell(x, y - h, w / 2, w / 6, { fill: fill });
  }
  function board(P, x, y, w, h) {
    P.line(x + 12, y + h, x + 6, y + h + 46, { lw: 3 }); P.line(x + w - 12, y + h, x + w - 6, y + h + 46, { lw: 3 });
    P.rect(x, y, w, h, { fill: PAL.white, lw: 3 });
    var bx = x + w * 0.1, by = y + h * 0.16, bw = w * 0.22, bh = h * 0.2;
    P.rect(bx, by, bw, bh, { lw: 1.8 });
    arrow(P, bx + bw + 3, by + bh / 2, bx + w * 0.42, by + bh / 2, { lw: 1.6, head: 6 });
    P.ell(bx + w * 0.53, by + bh / 2, w * 0.1, h * 0.11, { lw: 1.8 });
    arrow(P, bx + bw / 2, by + bh + 3, bx + bw / 2, by + h * 0.42, { lw: 1.6, head: 6 });
    P.rect(bx, by + h * 0.44, bw, bh, { lw: 1.8 });
    arrow(P, bx + bw + 3, by + h * 0.54, bx + w * 0.42, by + h * 0.54, { lw: 1.6, head: 6 });
    P.rect(bx + w * 0.44, by + h * 0.44, bw, bh, { fill: PAL.yellow, lw: 1.8 });
    arrow(P, bx + w * 0.53, by + bh + h * 0.03, bx + w * 0.55, by + h * 0.42, { lw: 1.6, head: 6 });
  }
  function bars(P, x, y, w, h, vals, col) {
    var bw = w / vals.length;
    vals.forEach(function (v, i) { P.rect(x + i * bw + bw * 0.18, y + h - v * h, bw * 0.64, v * h, { fill: col, lw: 1.8 }); });
    P.line(x, y, x, y + h, { lw: 2.2 }); P.line(x, y + h, x + w, y + h, { lw: 2.2 });
  }
  function f1car(P, x, y, s) {
    sv(P, x, y, s, function () {
      P.rect(-50, -14, 8, 11, { fill: "#d7262e" });
      P.shape([[-44, 0], [-38, -9], [-12, -11], [-2, -18], [12, -18], [18, -10], [40, -7], [48, 0]], { fill: "#d7262e" });
      P.ell(4, -16, 5, 3.4, { fill: PAL.yellow, lw: 1.2 });
      P.ell(-28, 2, 9, 9, { fill: "#1b1b1b" }); P.ell(31, 2, 9, 9, { fill: "#1b1b1b" });
    });
  }
  function shuttle(P, x, y, s, rot) {
    var c = P.ctx; c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    P.shape([[-4, 0], [4, 0], [11, -19], [-11, -19]], { fill: PAL.white, lw: 1.6 });
    P.line(-2, 0, -6, -19, { lw: 1 }); P.line(2, 0, 6, -19, { lw: 1 });
    P.ell(0, 3, 4.6, 4, { fill: "#d9b48a", lw: 1.6 });
    c.restore();
  }
  function trophy(P, x, y, s) {
    sv(P, x, y, s, function () {
      P.ell(-30, -58, 9, 11, { lw: 3 }); P.ell(30, -58, 9, 11, { lw: 3 });
      P.rect(-24, 0, 48, 11, { fill: "#5b4636" });
      P.rect(-6, -24, 12, 24, { fill: PAL.yellow });
      P.shape([[-27, -72], [27, -72], [21, -42], [8, -27], [-8, -27], [-21, -42]], { fill: PAL.yellow });
      P.line(-12, -64, -10, -44, { stroke: "#fff7c2", lw: 3 });
    });
  }
  function house(P, x, y, s) {
    sv(P, x, y, s, function () {
      P.rect(-28, -30, 56, 34, { fill: PAL.white });
      P.shape([[-36, -28], [0, -58], [36, -28]], { fill: PAL.red });
      P.rect(-8, -14, 16, 18, { fill: PAL.wood });
      P.rect(14, -22, 9, 9, { fill: "#cfe5f5", lw: 1.4 });
    });
  }
  function note(P, x, y, s) {
    sv(P, x, y, s, function () { P.ell(0, 0, 5, 4, { fill: PAL.ink, jit: 0.2 }); P.line(4.5, 0, 4.5, -18, { lw: 2 }); P.line(4.5, -18, 10, -13, { lw: 2 }); });
  }
  function bulb(P, x, y, s, on) {
    sv(P, x, y, s, function () {
      if (on) P.speed(0, -2, 14, 22, 10, { col: PAL.yellow, lw: 2 });
      P.ell(0, -2, 10, 11, { fill: on ? PAL.yellow : PAL.white });
      P.rect(-5, 8, 10, 7, { fill: "#9aa0a8", lw: 1.6 });
    });
  }

  /* -------------------------------------------------------------- scenes */

  function bg(P, W, H, o) {
    o = o || {};
    P.ctx.fillStyle = o.fill || PAL.paper; P.ctx.fillRect(0, 0, W, H);
    if (o.dots !== false) {
      P.dots(0, 0, W, H, o.dotCol || PAL.dot, o.gap || 10, o.fn || function (u, v) { return 0.55 * (1 - v) + 0.08; });
    }
  }
  function ground(P, W, y) { P.line(-5, y, W + 5, y, { lw: 2.6 }); }
  function alpha(col, a) {
    var m = /^#([0-9a-f]{6})$/i.exec(col);
    if (!m) return col;
    var n = parseInt(m[1], 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  var SCENES = {};
  function scene(name, W, H, anim, draw) { SCENES[name] = { W: W, H: H, anim: anim, draw: draw }; }

  /* cover */
  scene("cover", 640, 360, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, PAL.dark ? 0.4 : 0.75), gap: 13, fn: function (u, v) { return 0.9 - v * 0.8; } });
    P.burst(440, 175, 120, 168, 14, { fill: PAL.yellow, stroke: PAL.ink, lw: 3 });
    P.burst(440, 175, 92, 125, 14, { fill: PAL.white, stroke: false, rot: 0.1 });
    var sky = [[0, 270], [40, 270], [40, 220], [70, 220], [70, 250], [110, 250], [110, 196], [128, 196], [128, 150], [142, 150],
      [142, 196], [190, 196], [190, 236], [250, 236], [250, 210], [290, 186], [290, 236], [330, 236], [330, 280], [0, 280]];
    P.shape(sky, { fill: alpha(PAL.blue, 0.85), lw: 2.4 });
    for (var i = 0; i < 4; i++) {
      var ph = (t * 0.25 + i / 4) % 1;
      P.ell(135 + ph * 50, 140 - ph * 90, 9 + ph * 16, 7 + ph * 12, { fill: alpha(PAL.white, 0.9 - ph * 0.6), lw: 1.6 });
    }
    P.speed(560, 80, 26, 46, 7, { lw: 2.2 });
    hero(P, 440, 330, 1.45, "wave", t);
    ground(P, W, 330);
    P.sfx("HI!", 560, 72, 44, { rot: 0.18, fill: PAL.red });
  });

  /* chapter 1 — origin */
  scene("origin-forge", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.metal, 0.35) });
    furnace(P, 125, 268, 1.25, t);
    hero(P, 300, 270, 1.15, "point", t, { flip: true });
    ground(P, W, 270);
    P.sfx("HSSSS!", 120, 40, 30, { rot: -0.12, fill: PAL.yellow });
  });
  scene("origin-books", 400, 300, false, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.3) });
    [[PAL.red, 0], [PAL.blue, 1], [PAL.yellow, 2], [PAL.green, 3]].forEach(function (b) {
      P.rect(40 + b[1] * 4, 248 - b[1] * 22, 110, 20, { fill: b[0] });
    });
    P.shape([[60, 150], [110, 135], [160, 150], [110, 165]], { fill: PAL.black });
    P.rect(98, 158, 24, 12, { fill: PAL.black });
    P.line(150, 152, 156, 182, { stroke: PAL.yellow, lw: 2 });
    hero(P, 285, 270, 1.15, "read", t);
    ground(P, W, 270);
    star(P, 200, 60, 14); star(P, 360, 40, 10); star(P, 50, 70, 9);
  });
  scene("origin-ai", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.28) });
    furnace(P, 95, 268, 0.75, t);
    camera(P, 190, 70, 0.9, true, t);
    if ((t * 1.5) % 1 < 0.75) {
      P.ctx.setLineDash([6, 5]); P.rect(50, 170, 92, 100, { stroke: PAL.red, lw: 2.6 }); P.ctx.setLineDash([]);
      P.rect(50, 156, 64, 14, { fill: PAL.red, stroke: false });
    }
    hero(P, 300, 280, 1.05, "type", t, { seated: true });
    laptopBack(P, 300, 214, 54);
    desk(P, 300, 214, 150);
    ground(P, W, 280);
  });

  /* chapter 2 — pipeline */
  scene("pipe-sense", 300, 240, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.3) });
    camera(P, 90, 70, 1, false, t);
    for (var i = 0; i < 3; i++) {
      var ph = (t * 0.8 + i / 3) % 1;
      P.ctx.globalAlpha = 1 - ph;
      P.ctx.beginPath(); P.ctx.arc(130, 66, 20 + ph * 60, -0.6, 0.6); P.ctx.strokeStyle = PAL.ink; P.ctx.lineWidth = 2.4; P.ctx.stroke();
      P.ctx.globalAlpha = 1;
    }
    P.ell(220, 150, 46, 46, { fill: PAL.white, lw: 3 });
    for (var k = 0; k < 7; k++) { var a = Math.PI + k / 6 * Math.PI; P.line(220 + Math.cos(a) * 36, 150 + Math.sin(a) * 36, 220 + Math.cos(a) * 42, 150 + Math.sin(a) * 42, { lw: 1.6 }); }
    var na = Math.PI * 1.25 + Math.sin(t * 3) * 0.6;
    P.line(220, 150, 220 + Math.cos(na) * 32, 150 + Math.sin(na) * 32, { stroke: PAL.red, lw: 3 });
    P.dot(220, 150, 4);
  });
  scene("pipe-edge", 300, 240, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.3) });
    P.burst(150, 120, 70, 100, 12, { fill: PAL.yellow, lw: 2.4 });
    jetson(P, 150, 124, 1.35, t);
    P.sfx("ZAP!", 236, 40, 34, { rot: 0.2, fill: PAL.red });
  });
  scene("pipe-data", 300, 240, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.5) });
    P.rect(40, 34, 220, 172, { fill: PAL.white, lw: 3 });
    var cols = [PAL.blue, PAL.red, PAL.green, PAL.yellow];
    var n = Math.floor((t * 4) % 28);
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 4; c++) {
        var idx = r * 4 + c;
        P.rect(52 + c * 51, 46 + r * 22, 44, 14, { fill: idx < n ? cols[c] : PAL.white, lw: 1.4, jit: 0.3 });
      }
    }
  });
  scene("pipe-optimize", 300, 240, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.red, 0.25) });
    gear(P, 110, 130, 52, 10, t * 0.8, "#c3c8cf");
    gear(P, 196, 92, 34, 7, -t * 1.2 + 0.2, PAL.yellow);
    gear(P, 205, 178, 28, 6, -t * 1.5, PAL.blue);
    P.bubble(70, 46, 34, 20, 96, 82, {});
    P.sfx("MILP", 70, 46, 18, { fill: PAL.ink, stroke: PAL.white });
  });
  scene("pipe-decide", 300, 240, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.3) });
    P.rect(150, 40, 128, 110, { fill: PAL.white, lw: 3 });
    for (var i = 0; i < 3; i++) {
      var on = (t * 1.5) % 4 > i + 0.5;
      P.rect(162, 56 + i * 30, 16, 16, { fill: on ? PAL.green : PAL.white, lw: 1.8 });
      if (on) { P.line(165, 64 + i * 30, 170, 69 + i * 30, { lw: 2.4 }); P.line(170, 69 + i * 30, 177, 58 + i * 30, { lw: 2.4 }); }
      P.line(186, 64 + i * 30, 262, 64 + i * 30, { lw: 2 });
    }
    hero(P, 75, 225, 0.92, "point", t);
    ground(P, W, 225);
  });

  /* chapter 3 — utility belt */
  scene("belt", 800, 200, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.55), gap: 12, fn: function () { return 0.45; } });
    P.shape([[0, 70], [W, 64], [W, 112], [0, 118]], { fill: "#7a4f2e", lw: 3 });
    for (var x = 12; x < W; x += 22) P.dot(x, 92 - x * 0.0075, 2, "#3e2716");
    P.rect(368, 56, 64, 68, { fill: PAL.yellow, lw: 3.2 });
    P.rect(384, 72, 32, 36, { fill: "#7a4f2e", lw: 2.4 });
    var pouches = [70, 200, 520, 650];
    pouches.forEach(function (px, i) {
      P.rect(px, 104, 80, 74, { fill: ["#8c5b36", "#6f4529", "#8c5b36", "#6f4529"][i], lw: 3 });
      P.shape([[px - 3, 104], [px + 83, 104], [px + 80, 128], [px, 128]], { fill: "#5e3b22", lw: 2.4 });
      P.dot(px + 40, 120, 4, PAL.yellow);
    });
    sv(P, 110, 64, 0.6, function () { laptopFront(P, 0, 30, 70, function (x, y, w, h) { P.rect(x + 8, y + 8, w - 16, 8, { fill: PAL.blue, lw: 1 }); }); });
    jetson(P, 240, 46, 0.6, t);
    camera(P, 556, 50, 0.6, false, t);
    gear(P, 690, 52, 26, 8, t, "#c3c8cf");
    cloud(P, 760, 40, 0.75);
    star(P, 330, 30, 12); star(P, 470, 30, 12);
  });

  /* chapter 4 — experience */
  scene("exp-np", 520, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.28) });
    board(P, 210, 36, 270, 160);
    hero(P, 140, 262, 1.18, "point", t);
    ground(P, W, 262);
    [[300, "#3b2a20"], [370, "#1d1d20"], [440, "#6b4a2b"]].forEach(function (h) {
      P.shape([[h[0] - 26, 300], [h[0] - 22, 278], [h[0] + 22, 278], [h[0] + 26, 300]], { fill: "#2f3b55" });
      P.ell(h[0], 262, 20, 22, { fill: h[1] });
    });
  });
  scene("exp-bf", 300, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.metal, 0.35) });
    var cyc = (t * 0.9) % 1, down = cyc < 0.25, ry = down ? 132 : 60 + (1 - cyc) * 40;
    P.rect(40, 30, 22, 240, { fill: "#4f5560" }); P.rect(238, 30, 22, 240, { fill: "#4f5560" });
    P.rect(30, 18, 240, 26, { fill: "#6d737e" });
    P.rect(90, ry, 120, 50, { fill: "#8b919b" });
    P.line(150, 44, 150, ry, { lw: 6 });
    P.rect(70, 230, 160, 40, { fill: "#3f444d" });
    P.ell(150, 222, 46, 9, { fill: PAL.metal });
    if (down) { P.burst(150, 200, 40, 80, 11, { fill: PAL.yellow, lw: 2.6 }); P.sfx("BOOM!", 150, 200, 38, { fill: PAL.red, rot: -0.1 }); }
    ground(P, W, 270);
  });

  /* chapter 5 — case files */
  scene("mcp-1", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.28) });
    db(P, 300, 260, 70, 60, "#c9d6e8"); db(P, 300, 195, 70, 40, "#c9d6e8");
    P.rect(240, 230, 44, 34, { fill: PAL.white }); P.rect(234, 222, 44, 34, { fill: PAL.white });
    hero(P, 130, 270, 1.15, "think", t);
    ground(P, W, 270);
    P.bubble(245, 70, 54, 36, 160, 120, {});
    P.sfx("?!", 245, 70, 44 + Math.sin(t * 4) * 3, { fill: PAL.red, stroke: PAL.ink });
  });
  scene("mcp-2", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.28) });
    var src = [[60, 70], [60, 150], [60, 230]], hub = [190, 150], mcp = [280, 150], llm = [350, 150];
    src.forEach(function (s, i) {
      P.line(s[0] + 26, s[1], hub[0] - 30, hub[1], { lw: 2.2 });
      var ph = (t * 0.7 + i / 3) % 1;
      P.dot(s[0] + 26 + (hub[0] - 30 - s[0] - 26) * ph, s[1] + (hub[1] - s[1]) * ph, 5, PAL.red);
    });
    db(P, 60, 92, 46, 40, "#c9d6e8");
    P.rect(36, 132, 48, 36, { fill: PAL.yellow }); P.line(44, 150, 76, 150, { lw: 2 });
    P.shape([[60, 208], [78, 242], [60, 252], [42, 242]], { fill: PAL.metal, smooth: true });
    var hex = [];
    for (var k = 0; k < 6; k++) hex.push([hub[0] + Math.cos(k / 6 * TAU) * 34, hub[1] + Math.sin(k / 6 * TAU) * 34]);
    P.shape(hex, { fill: PAL.blue, lw: 3 });
    P.ell(hub[0], hub[1], 12, 12, { fill: PAL.white });
    arrow(P, hub[0] + 36, 150, mcp[0] - 24, 150, {});
    P.rect(mcp[0] - 22, 128, 44, 44, { fill: PAL.yellow, lw: 3 });
    P.line(mcp[0] - 10, 128, mcp[0] - 10, 116, { lw: 3 }); P.line(mcp[0] + 10, 128, mcp[0] + 10, 116, { lw: 3 });
    arrow(P, mcp[0] + 24, 150, llm[0] - 22, 150, {});
    P.bubble(llm[0] + 8, 150, 24, 20, llm[0] - 18, 175, {});
    for (var d = 0; d < 3; d++) P.dot(llm[0] - 2 + d * 9, 150, (Math.floor(t * 4) % 3) === d ? 4 : 2.6);
  });
  scene("mcp-3", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.55) });
    for (var i = 0; i < 9; i++) {
      var x = 210 + (i % 3) * 58, y = 120 + Math.floor(i / 3) * 58;
      P.ell(x, y, 15, 15, { fill: [PAL.skin, "#e0b08a", "#8d5a3b"][i % 3] });
      P.shape([[x - 20, y + 36], [x - 16, y + 16], [x + 16, y + 16], [x + 20, y + 36]], { fill: [PAL.blue, PAL.red, PAL.green][i % 3] });
    }
    hero(P, 100, 270, 1.1, "wave", t);
    ground(P, W, 270);
    P.sfx("100+", 280, 52, 46, { fill: PAL.red, rot: -0.08 });
  });

  scene("edge-1", 400, 300, true, function (P, t, W, H) {
    var on = (t * 2) % 1 < 0.5;
    bg(P, W, H, { dotCol: alpha(on ? PAL.red : PAL.yellow, 0.4) });
    P.speed(200, 150, 120, 260, 26, { lw: 1.6 });
    laptopFront(P, 200, 230, 170, function (x, y, w, h) {
      P.shape([[x + w / 2, y + 14], [x + w / 2 + 40, y + h - 12], [x + w / 2 - 40, y + h - 12]], { fill: PAL.yellow, lw: 3 });
      P.line(x + w / 2, y + 36, x + w / 2, y + h - 36, { lw: 5 });
      P.dot(x + w / 2, y + h - 24, 3.4);
    });
    P.ell(330, 50, 22, 16, { fill: on ? PAL.red : "#7a2b2b", lw: 2.6 });
    P.rect(312, 60, 36, 10, { fill: "#555", lw: 2 });
    if (on) P.speed(330, 50, 26, 44, 9, { col: PAL.red, lw: 2.4 });
    P.sfx("UH-OH", 90, 52, 40, { fill: PAL.red, rot: -0.15 });
  });
  scene("edge-2", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.28) });
    var xs = [44, 122, 200, 278, 356], cols = [PAL.white, PAL.yellow, PAL.blue, PAL.green, PAL.white];
    for (var i = 0; i < 4; i++) arrow(P, xs[i] + 24, 120, xs[i + 1] - 24, 120, { lw: 2.2, head: 7 });
    xs.forEach(function (x, i) { P.rect(x - 22, 98, 44, 44, { fill: cols[i], lw: 2.8 }); });
    P.line(xs[1], 110, xs[1], 132, { lw: 2 }); P.line(xs[1] - 10, 121, xs[1] + 10, 121, { lw: 2 });
    P.line(xs[2] - 9, 121, xs[2] - 2, 129, { lw: 3 }); P.line(xs[2] - 2, 129, xs[2] + 10, 111, { lw: 3 });
    P.burst(xs[3], 120, 7, 14, 6, { fill: PAL.yellow, lw: 1.4 });
    P.ell(xs[4], 120, 10, 10, { lw: 2.6 }); P.dot(xs[4], 120, 3);
    var p = (t * 0.45) % 1, tx = xs[0] + (xs[4] - xs[0]) * p;
    P.dot(tx, 86, 7, PAL.red);
    P.ctx.setLineDash([7, 6]);
    P.ctx.beginPath(); P.ctx.moveTo(xs[4], 146); P.ctx.bezierCurveTo(xs[4] - 10, 230, xs[3] + 10, 230, xs[3], 146);
    P.ctx.strokeStyle = PAL.red; P.ctx.lineWidth = 2.6; P.ctx.stroke(); P.ctx.setLineDash([]);
    arrow(P, xs[3] + 3, 160, xs[3], 147, { col: PAL.red, head: 8 });
    P.sfx("ROLLBACK", (xs[3] + xs[4]) / 2, 245, 24, { fill: PAL.yellow, rot: -0.05 });
  });
  scene("edge-3", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.3) });
    cloud(P, 200, 48, 1.1);
    var pos = [[70, 160], [200, 140], [330, 160], [130, 245], [270, 245]];
    pos.forEach(function (p, i) {
      P.ctx.setLineDash([4, 5]); P.line(200, 70, p[0], p[1] - 24, { lw: 1.6 }); P.ctx.setLineDash([]);
      jetson(P, p[0], p[1], 0.62, t, i * 0.23);
    });
    P.sfx("x5", 340, 60, 36, { fill: PAL.green, rot: 0.15 });
  });

  scene("vis-1", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { fill: PAL.paper, dotCol: "rgba(0,0,0,.18)", fn: function () { return 0.5; } });
    furnace(P, 200, 262, 1.25, t);
    camera(P, 60, 70, 0.9, false, t);
    ground(P, W, 262);
    ["?", "?", "?"].forEach(function (q, i) { P.sfx(q, 270 + i * 34, 60 + Math.sin(t * 3 + i) * 6, 40, { fill: PAL.white, rot: 0.2 * (i - 1) }); });
  });
  scene("vis-2", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: "rgba(0,0,0,.12)" });
    screen(P, 24, 24, 352, 236, function (x, y, w, h) {
      P.ctx.fillStyle = "#2a2622"; P.ctx.fillRect(x, y, w, h);
      P.ctx.fillStyle = "rgba(255,150,60,.25)"; P.ctx.fillRect(x, y, w, h);
      P.shape([[110, 90], [190, 90], [178, 150], [122, 150]], { fill: "#7a7470" });
      P.ell(150, 90, 40, 8, { fill: PAL.metal });
      var sw = 6 + Math.sin(t * 9) * 1.5;
      P.shape([[186, 96], [196, 96], [210 + sw, 210], [196 + sw, 210]], { fill: "#ffcf5a", stroke: false });
      P.rect(170, 210, 90, 40, { fill: "#57524e" });
      var j = Math.sin(t * 7) * 2;
      P.ctx.setLineDash([7, 5]);
      P.rect(100 + j, 70, 108, 92, { stroke: PAL.yellow, lw: 2.6 });
      P.rect(160 - j, 192, 108, 64, { stroke: "#4ade80", lw: 2.6 });
      P.ctx.setLineDash([]);
      P.rect(100 + j, 56, 70, 14, { fill: PAL.yellow, stroke: false });
      P.rect(160 - j, 178, 70, 14, { fill: "#4ade80", stroke: false });
      P.dot(358, 42, 6, (t * 2) % 1 < 0.5 ? "#e5383b" : "#5a1d1d");
    });
  });
  scene("vis-3", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.28) });
    var lanes = [PAL.red, PAL.yellow, PAL.blue, PAL.green], grow = Math.min(1, (t * 0.35) % 1.3);
    P.rect(30, 40, 340, 150, { fill: PAL.white, lw: 3 });
    lanes.forEach(function (c, i) {
      var y = 58 + i * 32;
      P.line(46, y + 9, 352, y + 9, { stroke: "rgba(0,0,0,.25)", lw: 1 });
      var x0 = 60 + i * 64, w = 56 * Math.max(0, Math.min(1, grow * 4 - i));
      if (w > 2) P.rect(x0, y, w, 18, { fill: c, lw: 1.8 });
    });
    P.ell(300, 245, 44, 44, { fill: PAL.white, lw: 3 });
    P.ctx.beginPath(); P.ctx.arc(300, 245, 34, Math.PI, Math.PI + Math.PI * Math.min(1, grow)); P.ctx.strokeStyle = PAL.green; P.ctx.lineWidth = 9; P.ctx.stroke();
    P.sfx("<3%", 110, 246, 40, { fill: PAL.green, rot: -0.08 });
  });

  scene("opt-1", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.metal, 0.3) });
    [[250, "#7d7f84"], [320, "#a0663a"], [370, "#5d6168"]].forEach(function (h, i) {
      var x = h[0];
      P.shape([[x - 50, 270], [x - 30, 220 - i * 6], [x - 6, 205 - i * 8], [x + 20, 222], [x + 44, 270]], { fill: h[1] });
      P.hatch(x - 40, 225, 70, 40, 8, { col: "rgba(0,0,0,.3)" });
    });
    hero(P, 110, 270, 1.15, "think", t);
    ground(P, W, 270);
    P.sfx("HMM...", 230, 80, 34, { fill: PAL.white, rot: -0.06 });
  });
  scene("opt-2", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.28) });
    var tilt = Math.sin(t * 1.6) * 0.14, cx = 200, cy = 110, L = 130;
    P.shape([[cx - 40, 270], [cx + 40, 270], [cx + 10, 120], [cx - 10, 120]], { fill: "#6d727a" });
    var lx = cx - Math.cos(tilt) * L, ly = cy - Math.sin(tilt) * L, rx = cx + Math.cos(tilt) * L, ry = cy + Math.sin(tilt) * L;
    P.line(lx, ly, rx, ry, { lw: 5 });
    P.dot(cx, cy, 8, PAL.yellow);
    [[lx, ly, PAL.red], [rx, ry, PAL.green]].forEach(function (s) {
      P.line(s[0], s[1], s[0] - 26, s[1] + 50, { lw: 1.6 }); P.line(s[0], s[1], s[0] + 26, s[1] + 50, { lw: 1.6 });
      P.shape([[s[0] - 34, s[1] + 50], [s[0] + 34, s[1] + 50], [s[0] + 24, s[1] + 62], [s[0] - 24, s[1] + 62]], { fill: "#c3c8cf" });
      P.rect(s[0] - 18, s[1] + 26, 36, 24, { fill: s[2] });
    });
    P.sfx("BALANCE", 200, 34, 30, { fill: PAL.yellow });
  });
  scene("opt-3", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.3) });
    var g = Math.min(1, (t * 0.4) % 1.4);
    bars(P, 40, 70, 150, 170, [0.9, 0.86, 0.8 - 0.06 * g, 0.74 - 0.1 * g], PAL.red);
    bars(P, 220, 70, 150, 170, [0.5, 0.58, 0.64 + 0.06 * g, 0.7 + 0.12 * g], PAL.green);
    arrow(P, 60, 60, 175, 105 + g * 20, { col: PAL.ink, lw: 3 });
    arrow(P, 235, 150, 360, 70 - g * 20, { col: PAL.ink, lw: 3 });
    P.sfx("SAVED!", 200, 34, 40, { fill: PAL.yellow, rot: -0.06 });
  });

  /* chapter 6 — side quests, lab notes, hall of fame */
  scene("quests", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.5) });
    var clusters = [[110, 110, PAL.red], [250, 90, PAL.blue], [180, 210, PAL.green], [310, 210, PAL.yellow]];
    var rr = mulberry(7);
    clusters.forEach(function (c) {
      for (var i = 0; i < 16; i++) P.dot(c[0] + (rr() - 0.5) * 70, c[1] + (rr() - 0.5) * 60, 5, c[2]);
    });
    var mx = 200 + Math.cos(t * 0.8) * 90, my = 150 + Math.sin(t * 1.1) * 60;
    P.ell(mx, my, 42, 42, { fill: "rgba(255,255,255,.35)", lw: 5 });
    P.line(mx + 30, my + 30, mx + 66, my + 66, { lw: 11 });
  });
  scene("lab", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.3) });
    P.shape([[160, 60], [200, 60], [200, 130], [256, 252], [104, 252], [160, 130]], { fill: PAL.white, lw: 3 });
    P.shape([[133, 196], [227, 196], [256, 252], [104, 252]], { fill: PAL.green, stroke: false });
    P.shape([[160, 60], [200, 60], [200, 130], [256, 252], [104, 252], [160, 130]], { lw: 3 });
    for (var i = 0; i < 6; i++) {
      var ph = (t * 0.6 + i / 6) % 1;
      P.ell(160 + Math.sin(i * 2.3) * 20, 240 - ph * 210, 5 + ph * 4, 5 + ph * 4, { fill: alpha(PAL.white, 1 - ph), lw: 1.4 });
    }
    var nodes = [[300, 80], [350, 120], [300, 160], [350, 200]];
    nodes.forEach(function (a, i) { nodes.forEach(function (b, k) { if (k > i) P.line(a[0], a[1], b[0], b[1], { lw: 1.2 }); }); });
    nodes.forEach(function (a, i) { P.ell(a[0], a[1], 9, 9, { fill: (Math.floor(t * 3) % 4) === i ? PAL.yellow : PAL.white }); });
    P.sfx("BLOOP", 80, 60, 30, { fill: PAL.yellow, rot: -0.2 });
  });
  scene("fame", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.6) });
    P.burst(200, 150, 90, 140, 16, { fill: PAL.white, lw: 2.4, rot: t * 0.2 });
    trophy(P, 200, 222, 1.5);
    star(P, 80, 70, 18 + Math.sin(t * 4) * 3); star(P, 330, 60, 14); star(P, 340, 220, 12); star(P, 60, 220, 12);
    P.sfx("TOP 10", 200, 272, 30, { fill: PAL.red });
  });

  /* finale */
  scene("contact", 640, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.red, 0.35), gap: 12 });
    P.speed(470, 150, 60, 420, 40, { lw: 1.6 });
    hero(P, 210, 290, 1.4, "point", t);
    for (var i = 0; i < 3; i++) {
      var ph = (t * 0.5 + i / 3) % 1, x = 330 + ph * 300, y = 120 + Math.sin(ph * 6 + i) * 30;
      sv(P, x, y, 0.9, function () {
        P.rect(-22, -15, 44, 30, { fill: PAL.white });
        P.shape([[-22, -15], [0, 3], [22, -15]], { close: false, lw: 2 });
      });
    }
    P.sfx("SAY HI!", 470, 60, 50, { fill: PAL.yellow, rot: -0.1 });
    ground(P, W, 290);
  });

  /* personal — off duty */
  scene("off-reading", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.5) });
    P.line(320, 270, 320, 90, { lw: 4 });
    P.shape([[290, 90], [350, 90], [336, 50], [304, 50]], { fill: PAL.yellow, lw: 3 });
    P.ctx.fillStyle = alpha(PAL.yellow, 0.25); P.ctx.beginPath(); P.ctx.moveTo(296, 92); P.ctx.lineTo(230, 270); P.ctx.lineTo(380, 270); P.ctx.lineTo(344, 92); P.ctx.fill();
    hero(P, 170, 270, 1.15, "read", t);
    ground(P, W, 270);
    P.sfx("FLIP", 70, 70, 30, { fill: PAL.white, rot: -0.2 });
  });
  scene("off-baelance", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.green, 0.3) });
    house(P, 80, 120, 1.2);
    laptopFront(P, 250, 250, 190, function (x, y, w, h) {
      var n = Math.floor((t * 1.2) % 5);
      for (var i = 0; i < 4; i++) {
        var yy = y + 16 + i * 22, on = i < n;
        P.rect(x + 14, yy, 13, 13, { fill: on ? PAL.green : PAL.white, lw: 1.6 });
        if (on) { P.line(x + 16, yy + 6, x + 20, yy + 10, { lw: 2.2 }); P.line(x + 20, yy + 10, x + 26, yy + 1, { lw: 2.2 }); }
        P.line(x + 36, yy + 7, x + w - 20 - (i % 2) * 30, yy + 7, { lw: 2, stroke: on ? "rgba(0,0,0,.3)" : PAL.ink });
      }
    });
    P.line(50, 270, 104, 170, { lw: 4, stroke: "#7a4f2e" });
    P.shape([[40, 262], [64, 262], [60, 290], [36, 290]], { fill: PAL.yellow });
  });
  scene("off-badminton", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.3) });
    P.line(330, 270, 330, 130, { lw: 3 });
    P.ctx.save(); P.ctx.beginPath(); P.ctx.rect(330, 130, 60, 60); P.ctx.clip();
    for (var g = 0; g < 8; g++) { P.line(330, 130 + g * 8, 400, 130 + g * 8, { lw: 1 }); P.line(330 + g * 8, 130, 330 + g * 8, 190, { lw: 1 }); }
    P.ctx.restore();
    hero(P, 150, 270, 1.15, "swing", t);
    var ph = (t * 0.6) % 1;
    shuttle(P, 210 + ph * 160, 90 - Math.sin(ph * Math.PI) * 60, 1.2, 1.2 + ph);
    ground(P, W, 270);
    P.sfx("THWACK!", 300, 40, 34, { fill: PAL.yellow, rot: 0.12 });
  });
  scene("off-gym", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.red, 0.3) });
    hero(P, 200, 275, 1.15, "lift", t);
    ground(P, W, 275);
    for (var i = 0; i < 2; i++) {
      var ph = (t * 1.2 + i * 0.5) % 1;
      P.shape([[250 + i * 20, 90 + ph * 40], [255 + i * 20, 102 + ph * 40], [245 + i * 20, 102 + ph * 40]], { fill: "#9fd3ff", lw: 1.4, smooth: true });
    }
    P.sfx("HUFF!", 80, 70, 36, { fill: PAL.yellow, rot: -0.15 });
  });
  scene("off-fan", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.yellow, 0.45) });
    screen(P, 30, 40, 230, 150, function (x, y, w, h) {
      P.ctx.fillStyle = "#8fd17a"; P.ctx.fillRect(x, y + h * 0.55, w, h);
      P.ctx.fillStyle = "#5b5f66"; P.ctx.fillRect(x, y + h * 0.62, w, 36);
      for (var k = 0; k < 6; k++) P.ctx.fillRect(x + ((k * 50 - t * 260) % (w + 60) + w + 60) % (w + 60) - 30, y + h * 0.62 + 16, 24, 4);
      f1car(P, x + w / 2 + Math.sin(t * 2) * 30, y + h * 0.62 + 24, 0.95);
      P.speed(x + w / 2 - 60, y + h * 0.62 + 18, 10, 40, 6, { lw: 1.4 });
    });
    P.rect(120, 196, 50, 14, { fill: "#3b3f46" });
    sv(P, 320, 200, 1, function (c) {
      c.rotate(0.35);
      P.rect(-4, -110, 8, 30, { fill: "#3a2d22" });
      P.shape([[-11, -82], [11, -82], [12, 20], [-12, 20]], { fill: "#e6c98f", lw: 2.6 });
    });
    P.ell(350, 258, 9, 9, { fill: "#c0262d" });
    P.ctx.beginPath(); P.ctx.arc(350, 258, 6, -1, 1); P.ctx.strokeStyle = PAL.white; P.ctx.lineWidth = 1.2; P.ctx.stroke();
    P.sfx("VROOM", 140, 240, 34, { fill: PAL.red, rot: -0.06 });
  });
  scene("off-hobbies", 400, 300, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.blue, 0.28) });
    hero(P, 130, 270, 1.12, "sketch", t);
    ground(P, W, 270);
    var press = Math.floor(t * 4) % 9;
    P.rect(230, 200, 150, 44, { fill: "#2a2e35", lw: 3 });
    for (var i = 0; i < 9; i++) P.rect(238 + i * 15, 208, 14, 30, { fill: i === press ? PAL.yellow : PAL.white, lw: 1.4, jit: 0.3 });
    [0, 1, 3, 4, 5, 7].forEach(function (i) { P.rect(246 + i * 15, 208, 9, 18, { fill: PAL.black, lw: 1, jit: 0.2 }); });
    for (var n = 0; n < 3; n++) {
      var ph = (t * 0.5 + n / 3) % 1;
      P.ctx.globalAlpha = 1 - ph;
      note(P, 260 + n * 40 + Math.sin(ph * 6) * 10, 180 - ph * 120, 1.2);
      P.ctx.globalAlpha = 1;
    }
  });

  /* 404 */
  scene("notfound", 640, 340, true, function (P, t, W, H) {
    bg(P, W, H, { dotCol: alpha(PAL.red, 0.35), gap: 12 });
    P.burst(320, 160, 120, 165, 14, { fill: PAL.yellow, lw: 3 });
    hero(P, 320, 320, 1.45, "laptop", t);
    ground(P, W, 320);
    ["?", "?", "?"].forEach(function (q, i) { P.sfx(q, 470 + i * 40, 90 + Math.sin(t * 3 + i) * 8, 46, { fill: PAL.white, rot: 0.2 * (i - 1) }); });
    P.sfx("WHOOPS!", 150, 70, 56, { fill: PAL.red, rot: -0.12 });
  });

  /* ------------------------------------------------------------- runtime */

  var items = [];
  var running = false;

  function size(it) {
    var r = it.cv.getBoundingClientRect();
    if (!r.width) return false;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.width * it.sc.H / it.sc.W * d);
    if (w !== it.cv.width || h !== it.cv.height) { it.cv.width = w; it.cv.height = h; it.key = null; }
    return true;
  }

  function render(it, t, force) {
    if (!it.cv.width) return;
    var anim = it.sc.anim && !REDUCE;
    var key = anim ? Math.floor(t * 12) : (REDUCE ? 0 : Math.floor(t * 4) % 3);
    if (!force && key === it.key) return;
    it.key = key;
    var tt = anim ? key / 12 : 0.35;
    var boil = REDUCE ? 0 : Math.floor(t * 4) % 3;
    var c = it.cv.getContext("2d"), s = it.cv.width / it.sc.W;
    c.setTransform(s, 0, 0, s, 0, 0);
    c.clearRect(0, 0, it.sc.W, it.sc.H);
    it.sc.draw(pen(c, it.seed + boil * 7919), tt, it.sc.W, it.sc.H);
  }

  // Only panels on (or near) screen are ever drawn; the rest are marked
  // stale and drawn when they scroll in. Keeps first load cheap on phones.
  function refresh() {
    var t = performance.now() / 1000;
    items.forEach(function (it) {
      it.key = null;
      if (it.vis && size(it)) render(it, t, true);
    });
  }

  function loop(now) {
    var t = now / 1000, any = false;
    items.forEach(function (it) { if (it.vis) { any = true; render(it, t, false); } });
    running = any;
    if (any) requestAnimationFrame(loop);
  }
  function kick() { if (!REDUCE && !running) { running = true; requestAnimationFrame(loop); } }

  function init() {
    readPalette();
    var ro = "ResizeObserver" in window ? new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        var it = e.target.__comic;
        if (it && size(it) && it.vis) render(it, performance.now() / 1000, true);
      });
    }) : null;
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      var t = performance.now() / 1000;
      entries.forEach(function (e) {
        var it = e.target.__comic;
        if (!it) return;
        it.vis = e.isIntersecting;
        if (it.vis && size(it)) render(it, t, it.key === null);
      });
      kick();
    }, { rootMargin: "120px" }) : null;

    document.querySelectorAll("canvas[data-scene]").forEach(function (cv) {
      var sc = SCENES[cv.getAttribute("data-scene")];
      if (!sc) return;
      cv.style.aspectRatio = sc.W + " / " + sc.H;
      var it = { cv: cv, sc: sc, seed: hash(cv.getAttribute("data-scene")), vis: !io, key: null };
      cv.__comic = it;
      items.push(it);
      if (ro) ro.observe(cv);
      if (io) io.observe(cv);
    });

    if (!io) refresh();
    kick();

    new MutationObserver(function () { readPalette(); refresh(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener("comic:show", function () { refresh(); kick(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
