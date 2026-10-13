// Design gallery: reads gallery.json, renders the grid, filters and lightbox.
// To add a design: put the images in /gallery and add one entry to gallery.json.
(function () {
  var featured = document.getElementById("featuredWork");
  var grid = document.getElementById("galleryGrid");
  if (!featured && !grid) return;
  var items = [], shown = [], current = 0, box, lastFocus;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function card(it, i) {
    return '<button type="button" class="shot" data-i="' + i + '" style="--d:' + (i % 6) * 60 + 'ms" aria-label="Open ' + esc(it.title) + '">' +
      '<img src="' + esc(it.thumb) + '" alt="' + esc(it.title + ", " + it.client) + '" width="' + it.width + '" height="' + it.height + '" loading="lazy" decoding="async">' +
      '<span class="shot-meta"><b>' + esc(it.title) + '</b><small>' + esc(it.client) + ' · ' + esc(it.category) + '</small></span></button>';
  }
  function draw(el, list) {
    shown = list;
    el.innerHTML = list.map(card).join("");
  }
  function onClick(e) {
    var b = e.target.closest(".shot"); if (!b) return;
    open(+b.dataset.i);
  }

  function buildBox() {
    box = document.createElement("div");
    box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.hidden = true;
    box.innerHTML = '<button type="button" class="lb-close" aria-label="Close">✕</button>' +
      '<button type="button" class="lb-nav prev" aria-label="Previous design">←</button>' +
      '<figure><img alt=""><figcaption><b></b><small></small><span class="lb-count"></span></figcaption></figure>' +
      '<button type="button" class="lb-nav next" aria-label="Next design">→</button>';
    document.body.appendChild(box);
    box.querySelector(".lb-close").onclick = close;
    box.querySelector(".prev").onclick = function () { step(-1); };
    box.querySelector(".next").onclick = function () { step(1); };
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    });
  }
  function show() {
    var it = shown[current], img = box.querySelector("img");
    img.src = it.image; img.alt = it.title + ", " + it.client;
    box.querySelector("figcaption b").textContent = it.title;
    box.querySelector("figcaption small").textContent = it.client + " · " + it.category;
    box.querySelector(".lb-count").textContent = (current + 1) + " / " + shown.length;
    var nxt = shown[(current + 1) % shown.length]; if (nxt) (new Image()).src = nxt.image;
  }
  function open(i) {
    if (!box) buildBox();
    lastFocus = document.activeElement; current = i; show();
    box.hidden = false; document.body.style.overflow = "hidden";
    box.querySelector(".lb-close").focus();
  }
  function close() { box.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  function step(d) { current = (current + d + shown.length) % shown.length; show(); }

  function setup() {
    if (featured) {
      var list = items.filter(function (it) { return it.featured; });
      if (!list.length) list = items;
      draw(featured, list.slice(0, +featured.dataset.limit || 6));
      featured.addEventListener("click", onClick);
    }
    if (grid) {
      var filters = document.getElementById("galleryFilters"), count = document.getElementById("galleryCount");
      var cats = ["All"]; items.forEach(function (it) { if (cats.indexOf(it.category) < 0) cats.push(it.category); });
      filters.innerHTML = cats.map(function (c, i) {
        var n = c === "All" ? items.length : items.filter(function (it) { return it.category === c; }).length;
        return '<button type="button" class="tool-tab" aria-pressed="' + (i === 0) + '" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="n">' + n + '</span></button>';
      }).join("");
      function apply(c) {
        draw(grid, c === "All" ? items : items.filter(function (it) { return it.category === c; }));
        if (count) count.textContent = shown.length + (shown.length === 1 ? " design" : " designs");
      }
      filters.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        Array.prototype.forEach.call(filters.children, function (x) { x.setAttribute("aria-pressed", x === b); });
        apply(b.dataset.cat);
      });
      grid.addEventListener("click", onClick);
      apply("All");
    }
  }

  fetch("gallery.json").then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (d) { items = d; setup(); })
    .catch(function () {
      [featured, grid].forEach(function (el) { if (el) el.innerHTML = '<p class="empty">The gallery could not load. Please refresh the page.</p>'; });
    });
})();
