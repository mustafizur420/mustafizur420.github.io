// 3D hero: floating design thumbnails behind the portrait and stat pills in front of it.
// Source for assets/hero3d.js. Rebuild after editing:
//   npx esbuild scripts/src/hero3d.src.js --bundle --minify --format=esm --outfile=assets/hero3d.js
import {
  Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, MeshBasicMaterial, Mesh,
  CanvasTexture, SRGBColorSpace, LinearFilter, MathUtils,
} from "three";

const portrait = document.getElementById("portrait");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (portrait && !reduce) start().catch((err) => { portrait.classList.remove("has-3d"); console.warn("hero3d off:", err && err.message); });

async function start() {
  const css = getComputedStyle(document.documentElement);
  const C = (n) => css.getPropertyValue(n).trim();
  const ink = C("--ink") || "#1b1a18", yellow = C("--yellow") || "#ffc93c",
        green = C("--green") || "#8fe05a", orange = C("--orange") || "#ff7a2f";
  const font = C("--display") || "sans-serif";
  try { await document.fonts.load("700 32px " + font); } catch (_) {}

  const mobile = matchMedia("(max-width: 900px)").matches;

  // ---- canvases: one behind the person, one in front
  const back = document.createElement("canvas"), front = document.createElement("canvas");
  back.className = "hero3d back"; front.className = "hero3d front";
  back.setAttribute("aria-hidden", "true"); front.setAttribute("aria-hidden", "true");
  portrait.insertBefore(back, portrait.querySelector(".me-clip"));
  portrait.appendChild(front);

  const opts = { canvas: back, alpha: true, antialias: true, powerPreference: "low-power" };
  const rBack = new WebGLRenderer(opts);
  const rFront = new WebGLRenderer({ ...opts, canvas: front });
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
  [rBack, rFront].forEach((r) => { r.setPixelRatio(dpr); r.outputColorSpace = SRGBColorSpace; });

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.z = 12;

  // ---- textures drawn on a 2D canvas (with a baked soft shadow)
  const PAD = 36;
  function surface(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w + PAD * 2; c.height = h + PAD * 2;
    const g = c.getContext("2d");
    g.translate(PAD, PAD);
    draw(g, w, h);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.generateMipmaps = false;
    return { tex: t, aspect: c.width / c.height, padFrac: PAD * 2 / c.width };
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function shadow(g) { g.shadowColor = "rgba(20,20,20,.22)"; g.shadowBlur = 28; g.shadowOffsetY = 14; }

  function thumbCard(img) {
    const w = 360, h = Math.round(w * img.naturalHeight / img.naturalWidth), b = 10;
    return surface(w, h, (g) => {
      shadow(g); g.fillStyle = "#fff"; rr(g, 0, 0, w, h, 22); g.fill();
      g.shadowColor = "transparent"; g.save(); rr(g, b, b, w - b * 2, h - b * 2, 14); g.clip();
      g.drawImage(img, b, b, w - b * 2, h - b * 2); g.restore();
    });
  }
  function pill(icon, iconBg, iconFg, text) {
    const s = 2, fs = 15 * s, ic = 28 * s, padL = 10 * s, padR = 18 * s, gap = 9 * s, h = 46 * s;
    const m = document.createElement("canvas").getContext("2d");
    m.font = "700 " + fs + "px " + font;
    const w = Math.ceil(padL + ic + gap + m.measureText(text).width + padR);
    return surface(w, h, (g) => {
      shadow(g); g.fillStyle = "#fff"; rr(g, 0, 0, w, h, h / 2); g.fill(); g.shadowColor = "transparent";
      g.fillStyle = iconBg; g.beginPath(); g.arc(padL + ic / 2, h / 2, ic / 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = iconFg; g.font = "700 " + Math.round(fs * .9) + "px " + font;
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(icon, padL + ic / 2, h / 2 + s);
      g.fillStyle = ink; g.font = "700 " + fs + "px " + font; g.textAlign = "left";
      g.fillText(text, padL + ic + gap, h / 2 + s);
    });
  }
  const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

  // ---- what floats where (x, y as fractions of the portrait box; w as a fraction of its width)
  const thumbs = [...document.querySelectorAll("#featuredWork img")].slice(0, 6).map((i) => i.currentSrc || i.src);
  const backSpec = mobile ? [
    { x: 0.04, y: 0.24, w: 0.34, z: -2.0, ry: 0.5, rz: -0.06 },
    { x: 0.97, y: 0.44, w: 0.32, z: -2.4, ry: -0.5, rz: 0.06 },
  ] : [
    { x: -0.02, y: 0.20, w: 0.40, z: -2.0, ry: 0.55, rz: -0.06 },
    { x: 1.02, y: 0.44, w: 0.34, z: -2.6, ry: -0.6, rz: 0.07 },
    { x: 0.97, y: 0.84, w: 0.28, z: -1.4, ry: -0.45, rz: -0.04 },
    { x: 0.04, y: 0.70, w: 0.30, z: -3.0, ry: 0.5, rz: 0.05 },
  ].slice(0, mobile ? 2 : 4);
  const chips = [...portrait.querySelectorAll(".chip")].map((c) => ({
    icon: c.querySelector("i")?.textContent || "", text: c.textContent.replace(c.querySelector("i")?.textContent || "", "").trim(),
  }));
  const chipStyle = [[yellow, ink], [green, ink], [orange, "#fff"]];
  const frontSpec = mobile ? [
    { x: 0.20, y: 0.50, z: 1.4, ry: 0.3 },
    { x: 0.80, y: 0.70, z: 1.8, ry: -0.3 },
  ] : [
    { x: 0.06, y: 0.50, z: 1.4, ry: 0.35 },
    { x: 1.0, y: 0.66, z: 1.8, ry: -0.35 },
    { x: 0.10, y: 0.92, z: 1.1, ry: 0.3 },
  ].slice(0, mobile ? 2 : 3);

  const items = [];
  const geo = new PlaneGeometry(1, 1);
  function add(s, spec, layer, widthFrac) {
    const mat = new MeshBasicMaterial({ map: s.tex, transparent: true, depthWrite: false });
    const m = new Mesh(geo, mat);
    m.layers.set(layer);
    scene.add(m);
    items.push({ m, spec, s, widthFrac, phase: Math.random() * 6.28, born: performance.now() + 500 + items.length * 120 });
  }
  const imgs = await Promise.all(thumbs.slice(0, backSpec.length).map((u) => loadImg(u).catch(() => null)));
  imgs.forEach((img, i) => img && add(thumbCard(img), backSpec[i], 1, backSpec[i].w));
  chips.slice(0, frontSpec.length).forEach((c, i) => {
    const [bg, fg] = chipStyle[i % 3];
    add(pill(c.icon, bg, fg, c.text), frontSpec[i], 2, null);
  });
  if (!items.length) throw new Error("nothing to show");

  // ---- sizing: map portrait-relative positions to world units at z = 0
  let box, unit;
  function layout() {
    const r = back.getBoundingClientRect();
    box = { w: r.width, h: r.height, pw: portrait.offsetWidth, ph: portrait.offsetHeight };
    [rBack, rFront].forEach((rd) => rd.setSize(r.width, r.height, false));
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    unit = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z / r.height; // world units per css px
    const ox = (box.w - box.pw) / 2, oy = (box.h - box.ph) / 2;
    for (const it of items) {
      const sp = it.spec;
      // px position of the item centre inside the canvas
      const px = ox + sp.x * box.pw, py = oy + sp.y * box.ph;
      const depth = (camera.position.z - sp.z) / camera.position.z; // keep apparent size/position stable across depths
      it.base = { x: (px - box.w / 2) * unit * depth, y: -(py - box.h / 2) * unit * depth, z: sp.z };
      let wpx;
      if (it.widthFrac) wpx = it.widthFrac * box.pw;
      else wpx = (it.s.tex.image.width - PAD * 2) / 2 * Math.min(0.9, box.pw / 400); // pills: drawn at 2x, shrink on small portraits
      const w = wpx * unit * depth / (1 - it.s.padFrac);
      it.size = { w, h: w / it.s.aspect };
    }
  }
  layout();
  addEventListener("resize", layout);

  // ---- input: mouse on desktop, tilt on phones
  let tx = 0, ty = 0, mx = 0, my = 0;
  const hero = document.getElementById("home") || portrait;
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; });
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    tx = MathUtils.clamp(e.gamma / 25, -1, 1); ty = MathUtils.clamp((e.beta - 45) / 25, -1, 1);
  });

  // ---- render only while the hero is on screen
  let visible = true, raf = 0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }).observe(portrait);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(tick); });

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function tick(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    const t = now / 1000;
    camera.position.x = mx * 0.9; camera.position.y = -my * 0.6;
    camera.lookAt(0, 0, 0);
    for (const it of items) {
      const k = ease(MathUtils.clamp((now - it.born) / 900, 0, 1));
      const { m, spec, base, size } = it;
      m.position.set(base.x, base.y + Math.sin(t * 0.9 + it.phase) * 0.08, base.z - (1 - k) * 4);
      m.scale.set(size.w * k, size.h * k, 1);
      m.rotation.set(Math.sin(t * 0.7 + it.phase) * 0.05 + my * 0.12, spec.ry + mx * 0.25, (spec.rz || 0) + Math.sin(t * 0.5 + it.phase) * 0.02);
      m.material.opacity = k;
    }
    camera.layers.set(1); rBack.render(scene, camera);
    camera.layers.set(2); rFront.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  portrait.classList.add("has-3d");
  raf = requestAnimationFrame(tick);
}
