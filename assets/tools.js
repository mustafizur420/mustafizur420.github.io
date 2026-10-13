  // Marketing tools
  (function () {
    if (!document.getElementById("toolTabs")) return;
    var cur = "BDT";
    function money(v) {
      if (!isFinite(v)) return "—";
      var neg = v < 0, a = Math.abs(v);
      var s = a.toLocaleString(cur === "BDT" ? "en-IN" : "en-US", { maximumFractionDigits: a < 100 ? 2 : 0 });
      return (neg ? "−" : "") + (cur === "BDT" ? "৳" : "$") + s;
    }
    function x(v) { return isFinite(v) && v > 0 ? v.toFixed(2) + "x" : "—"; }
    function pct(v) { return isFinite(v) ? (v * 100).toFixed(v * 100 < 10 ? 2 : 1) + "%" : "—"; }
    function num(v) { return isFinite(v) ? Math.round(v).toLocaleString("en-US") : "—"; }
    var M = "money", P = "%", N = "n";

    var tools = [
      {
        id: "roas", tab: "ROAS", title: "ROAS Calculator",
        desc: "How much revenue every unit of ad spend brought back, and whether that is enough to make a profit.",
        fields: [
          ["rev", "Revenue from ads", M, 250000], ["spend", "Ad spend", M, 50000],
          ["margin", "Gross margin", P, 35, "Price minus product cost, as % of price. Optional."]
        ],
        calc: function (f) {
          var roas = f.rev / f.spend, m = f.margin / 100, be = m > 0 ? 1 / m : NaN;
          var profit = m > 0 ? f.rev * m - f.spend : NaN;
          var v = !(f.spend > 0) ? null : !(m > 0) ? ["", "Add your gross margin to see if this ROAS is profitable."]
            : roas >= be * 1.2 ? ["good", "Profitable. Your ROAS is comfortably above break-even (" + x(be) + ")."]
            : roas >= be ? ["warn", "Just above break-even (" + x(be) + "). A small dip in performance will put you in the red."]
            : ["bad", "Losing money. You need at least " + x(be) + " ROAS to break even at this margin."];
          return {
            label: "Return on ad spend", main: x(roas),
            rows: [["ACoS (spend ÷ revenue)", pct(f.spend / f.rev)], ["Break-even ROAS", x(be)], ["Profit after ads", money(profit)]],
            verdict: v, formula: "ROAS = Revenue ÷ Ad spend · Break-even ROAS = 1 ÷ Gross margin"
          };
        }
      },
      {
        id: "breakeven", tab: "Break-even ROAS", title: "Break-even ROAS & Max CPA",
        desc: "Find the lowest ROAS you can run at, and the most you can pay for one order, before ads start eating your profit.",
        fields: [
          ["price", "Selling price", M, 1500], ["cost", "Product cost", M, 700],
          ["ship", "Delivery & packaging", M, 120], ["fee", "Payment / COD charge", P, 1],
          ["target", "Profit you want to keep", P, 10, "Net profit as % of price, after ads."]
        ],
        calc: function (f) {
          var keep = f.price - f.cost - f.ship - f.price * f.fee / 100;
          var be = f.price / keep, tCpa = keep - f.price * f.target / 100, tRoas = f.price / tCpa;
          var v = !(f.price > 0) ? null : keep <= 0 ? ["bad", "You lose money on every order even before ads. Raise the price or cut costs."]
            : tCpa <= 0 ? ["warn", "Your target profit is higher than what is left per order. Lower the target or improve margins."]
            : ["good", "Keep CPA under " + money(tCpa) + " (ROAS above " + x(tRoas) + ") to hit your " + f.target + "% profit target."];
          return {
            label: "Break-even ROAS", main: keep > 0 ? x(be) : "—",
            rows: [["Profit per order before ads", money(keep)], ["Max CPA (break-even)", keep > 0 ? money(keep) : "—"],
                   ["Target CPA", tCpa > 0 ? money(tCpa) : "—"], ["Target ROAS", tCpa > 0 ? x(tRoas) : "—"]],
            verdict: v, formula: "Break-even ROAS = Price ÷ (Price − all costs per order)"
          };
        }
      },
      {
        id: "cod", tab: "COD Real ROAS", title: "Real ROAS for Cash on Delivery",
        desc: "Ads Manager counts every order placed. With COD, some parcels come back. This shows the ROAS you actually earned.",
        fields: [
          ["orders", "Orders placed", N, 200], ["aov", "Average order value", M, 1500],
          ["spend", "Ad spend", M, 60000], ["rate", "Delivery success rate", P, 80, "Share of orders actually delivered and paid."],
          ["ret", "Cost per returned parcel", M, 120, "Return courier charge and lost packaging."]
        ],
        calc: function (f) {
          var d = f.rate / 100, placed = f.orders * f.aov, got = placed * d, fails = f.orders * (1 - d);
          var cost = f.spend + fails * f.ret, real = got / cost, shown = placed / f.spend;
          var gap = shown > 0 ? 1 - real / shown : NaN;
          var v = !(f.spend > 0 && f.orders > 0) ? null
            : gap > 0.3 ? ["bad", "Your real ROAS is " + pct(gap) + " lower than Ads Manager shows. Confirm orders by phone before shipping."]
            : gap > 0.15 ? ["warn", "Returns cut your ROAS by " + pct(gap) + ". Judge campaigns on delivered orders, not placed ones."]
            : ["good", "Returns only cut your ROAS by " + pct(gap) + ". Your delivery rate is healthy."];
          return {
            label: "Real ROAS (delivered)", main: x(real),
            rows: [["ROAS shown in Ads Manager", x(shown)], ["Delivered revenue", money(got)], ["Returned parcels", num(fails)],
                   ["Real cost per delivered order", money(cost / (f.orders * d))]],
            verdict: v, formula: "Real ROAS = Delivered revenue ÷ (Ad spend + return costs)"
          };
        }
      },
      {
        id: "metrics", tab: "Ad Metrics", title: "CPM, CTR, CPC & CPA",
        desc: "Turn raw numbers from any ad platform into the metrics that show where your funnel leaks.",
        fields: [
          ["spend", "Ad spend", M, 20000], ["imp", "Impressions", N, 150000],
          ["clicks", "Link clicks", N, 2400], ["conv", "Conversions", N, 60, "Purchases, leads or sign-ups."]
        ],
        calc: function (f) {
          var ctr = f.clicks / f.imp, cvr = f.conv / f.clicks, cpa = f.spend / f.conv;
          var v = !(f.imp > 0 && f.clicks > 0) ? null
            : ctr < 0.008 ? ["warn", "CTR is below 0.8%. Test new creatives and hooks before raising budget."]
            : cvr < 0.01 ? ["warn", "People click but don't convert (" + pct(cvr) + "). Check the landing page, price and load speed."]
            : ["good", "Healthy funnel: " + pct(ctr) + " CTR and " + pct(cvr) + " conversion rate."];
          return {
            label: "Cost per acquisition", main: f.conv > 0 ? money(cpa) : "—",
            rows: [["CPM (per 1,000 impressions)", money(f.spend / f.imp * 1000)], ["CTR", pct(ctr)],
                   ["CPC", money(f.spend / f.clicks)], ["Conversion rate", pct(cvr)]],
            verdict: v, formula: "CTR = Clicks ÷ Impressions · CPA = Spend ÷ Conversions"
          };
        }
      },
      {
        id: "budget", tab: "Budget Planner", title: "Ad Budget Planner",
        desc: "Work backwards from a sales goal to the budget, daily spend and orders you need.",
        fields: [
          ["goal", "Revenue target", M, 1000000], ["aov", "Average order value", M, 1500],
          ["roas", "Expected ROAS", "x", 4, "Use your recent average, not your best day."], ["days", "Campaign length", "days", 30]
        ],
        calc: function (f) {
          var budget = f.goal / f.roas, orders = f.goal / f.aov;
          return {
            label: "Total ad budget", main: f.roas > 0 ? money(budget) : "—",
            rows: [["Daily budget", money(budget / f.days)], ["Orders needed", num(Math.ceil(orders))],
                   ["Orders per day", (orders / f.days).toFixed(1)], ["CPA you must hit", money(budget / orders)]],
            verdict: f.roas > 0 && f.days > 0 ? ["", "Start around " + money(budget / f.days * 0.6) + " a day and scale up as the ROAS holds."] : null,
            formula: "Budget = Revenue target ÷ Expected ROAS"
          };
        }
      }
    ];

    var tabsEl = document.getElementById("toolTabs"), fieldsEl = document.getElementById("toolFields");
    var state = {}, active = 0;
    tools.forEach(function (t, i) {
      state[t.id] = {};
      t.fields.forEach(function (fd) { state[t.id][fd[0]] = fd[3]; });
      var b = document.createElement("button");
      b.type = "button"; b.className = "tool-tab"; b.setAttribute("role", "tab"); b.id = "tab-" + t.id;
      b.setAttribute("aria-controls", "toolPanel"); b.textContent = t.tab;
      b.addEventListener("click", function () { select(i); });
      tabsEl.appendChild(b);
    });
    tabsEl.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var n = (active + (e.key === "ArrowRight" ? 1 : -1) + tools.length) % tools.length;
      select(n); tabsEl.children[n].focus();
    });

    function unitFor(u) { return u === M ? (cur === "BDT" ? "৳" : "$") : u === N ? "" : u; }
    function select(i) {
      active = i; var t = tools[i];
      Array.prototype.forEach.call(tabsEl.children, function (b, j) {
        b.setAttribute("aria-selected", j === i); b.tabIndex = j === i ? 0 : -1;
      });
      document.getElementById("toolPanel").setAttribute("aria-labelledby", "tab-" + t.id);
      document.getElementById("toolTitle").textContent = t.title;
      document.getElementById("toolDesc").textContent = t.desc;
      fieldsEl.innerHTML = "";
      t.fields.forEach(function (fd) {
        var id = "f-" + t.id + "-" + fd[0], u = unitFor(fd[2]), before = fd[2] === M;
        var w = document.createElement("div"); w.className = "field";
        w.innerHTML = '<label for="' + id + '"></label><div class="box">' +
          (before ? '<span class="unit" data-unit="' + fd[2] + '">' + u + '</span>' : '') +
          '<input id="' + id + '" type="number" inputmode="decimal" min="0" step="any">' +
          (!before && u ? '<span class="unit after">' + u + '</span>' : '') + '</div>' +
          (fd[4] ? '<p class="hint"></p>' : '');
        w.querySelector("label").textContent = fd[1];
        if (fd[4]) w.querySelector(".hint").textContent = fd[4];
        var inp = w.querySelector("input");
        inp.value = state[t.id][fd[0]];
        inp.addEventListener("input", function () { state[t.id][fd[0]] = inp.value; render(); });
        fieldsEl.appendChild(w);
      });
      render();
      if (history.replaceState && document.body.dataset.page === "tools") history.replaceState(null, "", "#tool-" + t.id);
    }
    function render() {
      var t = tools[active], f = {};
      t.fields.forEach(function (fd) { var v = parseFloat(state[t.id][fd[0]]); f[fd[0]] = isNaN(v) ? 0 : v; });
      var r = t.calc(f);
      document.getElementById("outLabel").textContent = r.label;
      document.getElementById("outMain").textContent = r.main;
      document.getElementById("outRows").innerHTML = r.rows.map(function (row) {
        return "<li><span>" + row[0] + "</span><b>" + row[1] + "</b></li>";
      }).join("");
      var vd = document.getElementById("outVerdict"), v = r.verdict || ["", "Enter your numbers to see the result."];
      vd.className = "verdict" + (v[0] ? " " + v[0] : ""); vd.textContent = v[1];
      document.getElementById("outFormula").textContent = r.formula;
    }
    document.querySelectorAll(".cur button").forEach(function (b) {
      b.addEventListener("click", function () {
        cur = b.dataset.cur;
        document.querySelectorAll(".cur button").forEach(function (o) { o.setAttribute("aria-pressed", o === b); });
        document.querySelectorAll('[data-unit="money"]').forEach(function (s) { s.textContent = unitFor(M); });
        render();
      });
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-tool]"); if (!a) return;
      var i = tools.findIndex(function (t) { return t.id === a.dataset.tool; });
      if (i < 0) return;
      e.preventDefault(); select(i);
      document.getElementById("toolTabs").scrollIntoView({ behavior: "smooth", block: "center" });
      tabsEl.children[i].focus({ preventScroll: true });
    });
    window.addEventListener("hashchange", function () {
      var i = tools.findIndex(function (t) { return "#tool-" + t.id === location.hash; });
      if (i >= 0 && i !== active) select(i);
    });
    var start = tools.findIndex(function (t) { return "#tool-" + t.id === location.hash; });
    select(start > 0 ? start : 0);
  })();
