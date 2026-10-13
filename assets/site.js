  // Ticker content (duplicated so the loop is seamless)
  var skills = ["Media Buying", "E-commerce Marketing", "Digital Marketing", "SEO & SEM", "Social Media Marketing", "Email Marketing",
                "Lead Generation", "Graphic Design", "Motion Graphics", "Video Editing"];
  document.querySelectorAll("[data-ticker]").forEach(function (track) {
    var html = skills.map(function (s) { return "<span>" + s.replace("&", "&amp;") + "</span>"; }).join("");
    track.innerHTML = html + html + html + html + html + html;
  });

  // Mobile menu
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");
  menuBtn.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { navLinks.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });

  // Reveal on scroll + count-up
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || "", start = null, dur = 1400;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US") + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        en.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // Active nav link
  // (only for in-page links on the home page; other pages mark their link in the HTML)
  var links = Array.prototype.filter.call(navLinks.querySelectorAll("a"), function (a) { return a.getAttribute("href").charAt(0) === "#"; });
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  if (links.length && sections[0]) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY + 140, current = 0;
      sections.forEach(function (s, i) { if (s && s.offsetTop <= y) current = i; });
      links.forEach(function (a, i) { a.classList.toggle("active", i === current); });
    }, { passive: true });
  }

  // Staggered reveals inside grids and lists
  if (!reduce) {
    document.querySelectorAll(".grid-4, .grid-3, .logo-grid, .steps, .service-list, .stats").forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) {
        var d = (i % 5) * 90;
        c.style.transitionDelay = d + "ms";
        c.addEventListener("transitionend", function clear() { c.style.transitionDelay = ""; c.removeEventListener("transitionend", clear); });
      });
    });
  }

  // Scroll progress, header shadow, ticker drift, back to top
  var progress = document.getElementById("progress"), headerEl = document.getElementById("top"), toTop = document.getElementById("toTop");
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    headerEl.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > 700);
    if (!reduce) document.documentElement.style.setProperty("--sy", Math.min(y, 1400));
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  // Pointer effects (mouse devices only)
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var hero = document.getElementById("home"), portrait = document.getElementById("portrait");
    if (hero && portrait) hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      portrait.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5) * 2);
      portrait.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5) * 2);
    });
    if (hero && portrait) hero.addEventListener("mouseleave", function () { portrait.style.setProperty("--mx", 0); portrait.style.setProperty("--my", 0); });

    document.querySelectorAll(".logo-card, .win").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = "transform .1s ease-out, box-shadow .25s ease";
        card.style.transform = "perspective(700px) rotateX(" + (-y * 9) + "deg) rotateY(" + (x * 9) + "deg) translateY(-6px)";
      });
      card.addEventListener("mouseleave", function () { card.style.transition = "transform .4s ease, box-shadow .25s ease"; card.style.transform = ""; });
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();
