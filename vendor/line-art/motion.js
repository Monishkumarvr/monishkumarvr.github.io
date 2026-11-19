/* line-art-animation (https://github.com/JDhruv14/line-art-animation)
 * Copyright (c) 2026 JDhruv14 — MIT License, see LICENSE in this folder.
 * Transpiled from lib/motion.ts without changes. */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const ease = (t) => smooth(0, 1, t);
const minJerk = (s) => s * s * s * (10 - 15 * s + 6 * s * s);
const rnd = (a, b) => a + Math.random() * (b - a);
function seeded(seed = 11) {
  let s = seed;
  return (a = 0, b = 1) => {
    s = s * 16807 % 2147483647;
    return a + (s - 1) / 2147483646 * (b - a);
  };
}
const wobble = (t, k = 1) => Math.sin(t * 1.3 * k) * 0.6 + Math.sin(t * 2.7 * k + 1.7) * 0.3 + Math.sin(t * 5.1 * k + 4.1) * 0.1;
function spring(stiffness = 40, damping = 6, x = 0) {
  return {
    x,
    v: 0,
    step(target, dt) {
      this.v += (stiffness * (target - this.x) - damping * this.v) * dt;
      this.x += this.v * dt;
      return this.x;
    },
    kick(v) {
      this.v += v;
    }
  };
}
function pendulum(stiffness = 10, damping = 1.1, a = 0) {
  return {
    a,
    v: 0,
    step(force, dt) {
      this.v += (-this.a * stiffness + force - this.v * damping) * dt;
      this.a += this.v * dt;
      return this.a;
    },
    kick(v) {
      this.v += v;
    }
  };
}
function pointerWind(target, base = 0.3) {
  let aim = base, lastX = null, lastT = 0;
  const w = {
    value: base,
    step(t) {
      aim = lerp(aim, base + 0.25 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.67), 0.012);
      w.value = lerp(w.value, aim, 0.05);
      return w.value;
    }
  };
  target.addEventListener("pointermove", (e) => {
    const { clientX } = e;
    const now = performance.now();
    if (lastX !== null) aim = clamp(aim + (clientX - lastX) / Math.max(8, now - lastT) * 0.8, -2.4, 2.4);
    lastX = clientX;
    lastT = now;
  });
  return w;
}
function sequence(steps) {
  const total = steps.reduce((a, s) => a + s[1], 0);
  return (t) => {
    if (t < 0 || t >= total) return null;
    let acc = 0, prev = steps[0][0];
    for (const [name, d] of steps) {
      if (t < acc + d) return { from: prev, to: name, u: (t - acc) / d };
      acc += d;
      prev = name;
    }
    return null;
  };
}
export {
  clamp,
  ease,
  lerp,
  minJerk,
  pendulum,
  pointerWind,
  rnd,
  seeded,
  sequence,
  smooth,
  spring,
  wobble
};
