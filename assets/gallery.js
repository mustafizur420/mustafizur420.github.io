// Design gallery: reads gallery.json, renders the grid, filters and lightbox.
// To add a design: put the images in /gallery, add one entry to gallery.json,
// then run scripts/build_gallery.py so the pages carry pre-rendered markup for search engines.
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
    if (el !== grid) { el.innerHTML = list.map(card).join(""); return; }
    // Masonry that keeps reading order left-to-right: each design goes into the shortest column.
    var n = window.innerWidth <= 560 ? 1 : window.innerWidth <= 900 ? 2 : 3, cols = [], h = [];
    for (var c = 0; c < n; c++) { cols.push([]); h.push(0); }
    list.forEach(function (it, i) {
      var k = h.indexOf(Math.min.apply(null, h));
      cols[k].push(card(it, i)); h[k] += it.height / it.width;
    });
    el.style.setProperty("--cols", n); el.dataset.cols = n;
    el.innerHTML = cols.map(function (c) { return '<div class="g-col">' + c.join("") + "</div>"; }).join("");
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
      var current = "All";
      filters.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) current = b.dataset.cat; });
      var rt; window.addEventListener("resize", function () {
        clearTimeout(rt); rt = setTimeout(function () {
          var n = window.innerWidth <= 560 ? 1 : window.innerWidth <= 900 ? 2 : 3;
          if (String(n) !== grid.dataset.cols) apply(current);
        }, 150);
      });
    }
  }

  fetch("gallery.json").then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (d) { items = d.filter(function (it) { return !it.hidden; }); setup(); })
    .catch(function () {
      // Pre-rendered markup stays in place; only show a message if there is nothing to show.
      [featured, grid].forEach(function (el) { if (el && !el.querySelector(".shot")) el.innerHTML = '<p class="empty">The gallery could not load. Please refresh the page.</p>'; });
    });
})();
