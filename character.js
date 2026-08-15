/*
 * Minimal canvas sprite player: draws pre-loaded frame images to a <canvas>
 * on a requestAnimationFrame + time-accumulator loop (never swaps <img src>,
 * which causes a visible decode hitch on larger images). Pauses whenever the
 * canvas is off-screen, and never animates under prefers-reduced-motion —
 * the first frame is a real <img> already in the markup for that case.
 */
function createCharacterPlayer(canvas, staticImg, opts) {
  var defaultFps = (opts && opts.fps) || 18;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The <img> is only a pre-JS / no-JS fallback (and shows a fixed frame
  // from one specific clip). Once this script runs, the canvas is the
  // single source of truth for what's on screen -- including the static
  // frame shown under prefers-reduced-motion. Hiding the <img> here
  // matters because real illustrated frames have transparent backgrounds:
  // without this, the canvas's transparent areas would let the stale
  // fallback image show through underneath/around the current character.
  if (staticImg) staticImg.style.display = "none";

  var clips = {};
  var current = null; // { frames, mode, times, playCount, index, elapsed, onComplete }
  var visible = true;
  var rafId = null;
  var lastTs = null;

  function loadClip(name, urls) {
    if (clips[name]) return clips[name];
    var entry = { images: new Array(urls.length), loaded: 0, urls: urls };
    clips[name] = entry;
    urls.forEach(function (url, i) {
      var img = new Image();
      img.onload = function () { entry.loaded++; };
      img.src = url;
      entry.images[i] = img;
    });
    return entry;
  }

  function draw(img) {
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTs = null;
  }

  function tick(ts) {
    if (!current || !visible) {
      rafId = null;
      return;
    }
    if (lastTs === null) lastTs = ts;
    current.elapsed += ts - lastTs;
    lastTs = ts;

    if (current.elapsed >= current.frameInterval) {
      current.elapsed = 0;
      current.index++;

      var frames = current.frames;
      if (current.index >= frames.length) {
        if (current.mode === "loop") {
          current.index = 0;
        } else {
          current.playCount++;
          if (current.playCount >= current.times) {
            current.index = current.holdIndex;
            draw(frames[current.index]);
            var done = current.onComplete;
            current = null;
            stop();
            if (done) done();
            return;
          }
          current.index = 0;
        }
      }
    }
    draw(current.frames[current.index]);
    rafId = requestAnimationFrame(tick);
  }

  function play(name, options) {
    var clip = clips[name];
    if (!clip) return;
    stop();

    if (reduceMotion) {
      draw(clip.images[0]);
      current = null;
      return;
    }

    if (clip.loaded < clip.images.length) {
      draw(clip.images[0]);
      setTimeout(function () { play(name, options); }, 40);
      return;
    }

    current = {
      frames: clip.images,
      mode: (options && options.mode) || "loop",
      times: (options && options.times) || 1,
      holdIndex: (options && options.holdIndex) || 0,
      onComplete: options && options.onComplete,
      frameInterval: 1000 / ((options && options.fps) || defaultFps),
      index: 0,
      elapsed: 0,
      playCount: 0,
    };
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && current && rafId === null) {
          lastTs = null;
          rafId = requestAnimationFrame(tick);
        } else if (!visible) {
          stop();
        }
      },
      { threshold: 0 }
    ).observe(canvas);
  }

  return { loadClip: loadClip, play: play, reduceMotion: reduceMotion };
}
