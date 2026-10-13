#!/usr/bin/env python3
"""Build the site from the editable content files.

  content/posts/*.md     -> blog/<slug>.html and blog/index.html
  content/gallery.json   -> optimised images, gallery.json, pre-rendered gallery + home "Selected work"
  everything             -> sitemap.xml and ?v= cache-busting on CSS/JS links

Runs automatically on GitHub after every change (see .github/workflows/build.yml),
so editing in Pages CMS is all that is needed. Locally: pip install markdown pyyaml pillow; python3 scripts/build.py
"""
import datetime, glob, hashlib, html, json, math, os, re

import markdown
import yaml
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://mustafiz.online/"
e = lambda s: html.escape(str(s), quote=True)
P = lambda *a: os.path.join(ROOT, *a)
read = lambda p: open(P(p), encoding="utf-8").read()
def write(p, s):
    full = P(p)
    old = open(full, encoding="utf-8").read() if os.path.exists(full) else None
    if old != s:
        os.makedirs(os.path.dirname(full) or ".", exist_ok=True)
        open(full, "w", encoding="utf-8").write(s)

TOOLS_EN = {
    "roas": ("ROAS Calculator", "Enter revenue and ad spend to see your ROAS, break-even ROAS and profit after ads."),
    "breakeven": ("Break-even ROAS Calculator", "Enter your price and costs to find the lowest ROAS and highest CPA you can afford."),
    "cod": ("COD Real ROAS Calculator", "See the ROAS you really earned after cash-on-delivery returns. Free, and nothing you type is stored."),
    "metrics": ("Ad Metrics Calculator", "Turn spend, impressions, clicks and conversions into CPM, CTR, CPC and CPA."),
    "budget": ("Ad Budget Planner", "Work back from a revenue target to your total and daily ad budget."),
}
TOOLS = {
    "roas": ("ROAS Calculator", "Revenue আর অ্যাড খরচ দিলেই ROAS, break-even ROAS আর লাভ দেখাবে।"),
    "breakeven": ("Break-even ROAS Calculator", "দাম আর খরচ দিলেই সর্বনিম্ন ROAS আর সর্বোচ্চ CPA দেখাবে।"),
    "cod": ("COD Real ROAS Calculator", "অর্ডার, গড় অর্ডার মূল্য, অ্যাড খরচ আর ডেলিভারি রেট দিলেই আপনার আসল ROAS দেখাবে। ফ্রি, আর কোনো তথ্য কোথাও সেভ হয় না।"),
    "metrics": ("Ad Metrics Calculator", "Spend, impression, click আর conversion দিলেই CPM, CTR, CPC আর CPA দেখাবে।"),
    "budget": ("Ad Budget Planner", "রেভিনিউ টার্গেট থেকে মোট আর দৈনিক বাজেট বের করুন।"),
}
BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]
EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


# ---------------------------------------------------------------- gallery
def build_gallery():
    src = json.load(open(P("content/gallery.json"), encoding="utf-8"))
    items = src.get("items", src) if isinstance(src, dict) else src
    out = []
    for it in items:
        if not it.get("image") or not it.get("title"):
            continue
        img_path = it["image"].lstrip("/")
        if not os.path.exists(P(img_path)):
            print("  ! missing image, skipped:", img_path)
            continue
        stem = os.path.splitext(img_path)[0]
        full, thumb = stem + ".webp", stem + "-thumb.webp"
        im = Image.open(P(img_path))
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        w, h = im.size
        wide = w > h * 1.5
        if not img_path.endswith(".webp") or w > (1600 if wide else 1400):
            r = im.copy(); r.thumbnail((1600 if wide else 1400, 4000)); r.save(P(full), "WEBP", quality=82, method=6)
        if not os.path.exists(P(thumb)):
            r = im.copy(); r.thumbnail((800 if wide else 640, 2000)); r.save(P(thumb), "WEBP", quality=78, method=6)
        out.append({"title": it["title"], "client": it.get("client", ""), "category": it.get("category", "Brand & Social"),
                    "image": full, "thumb": thumb, "width": w, "height": h,
                    **({"featured": True} if it.get("featured") else {}), **({"hidden": True} if it.get("hidden") else {})})
    write("gallery.json", json.dumps(out, indent=2, ensure_ascii=False) + "\n")

    shown = [x for x in out if not x.get("hidden")]
    def card(it, i, eager=False):
        return ('<button type="button" class="shot" data-i="%d" style="--d:%dms" aria-label="Open %s">'
                '<img src="%s" alt="%s" width="%s" height="%s" %sdecoding="async">'
                '<span class="shot-meta"><b>%s</b><small>%s · %s</small></span></button>') % (
            i, (i % 6) * 60, e(it["title"]), e(it["thumb"]), e(it["title"] + ", " + it["client"]),
            it["width"], it["height"], "" if eager else 'loading="lazy" ', e(it["title"]), e(it["client"]), e(it["category"]))
    cols, hs = [[], [], []], [0.0] * 3
    for i, it in enumerate(shown):
        k = hs.index(min(hs)); cols[k].append(card(it, i, i < 6)); hs[k] += it["height"] / it["width"]
    grid = "".join('<div class="g-col">' + "".join(c) + "</div>" for c in cols)
    cats = ["All"] + list(dict.fromkeys(x["category"] for x in shown))
    filters = "".join('<button type="button" class="tool-tab" aria-pressed="%s" data-cat="%s">%s <span class="n">%d</span></button>' % (
        "true" if c == "All" else "false", e(c), e(c), len(shown) if c == "All" else sum(x["category"] == c for x in shown)) for c in cats)
    feat = [x for x in shown if x.get("featured")][:6] or shown[:6]

    def inject(s, elem_id, inner):
        pat = re.compile(r'(<div class="[^"]*" id="%s"[^>]*>).*?(</div><!-- /%s -->)' % (elem_id, elem_id), re.S)
        assert pat.search(s), elem_id
        return pat.sub(lambda m: m.group(1) + inner + m.group(2), s)
    g = read("gallery.html")
    g = inject(g, "galleryGrid", grid); g = inject(g, "galleryFilters", filters)
    g = re.sub(r'(<span class="gallery-count" id="galleryCount"[^>]*>)[^<]*(</span>)', r"\g<1>%d designs\g<2>" % len(shown), g)
    write("gallery.html", g)
    write("index.html", inject(read("index.html"), "featuredWork", "".join(card(x, i) for i, x in enumerate(feat))))
    print("gallery: %d designs shown, %d hidden, %d featured" % (len(shown), len(out) - len(shown), len(feat)))


# ---------------------------------------------------------------- blog
def load_posts():
    posts = []
    for f in sorted(glob.glob(P("content/posts/*.md"))):
        raw = open(f, encoding="utf-8").read()
        m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", raw, re.S)
        meta, body = (yaml.safe_load(m.group(1)) or {}, m.group(2)) if m else ({}, raw)
        if meta.get("draft"):
            continue
        slug = str(meta.get("slug") or os.path.splitext(os.path.basename(f))[0])
        slug = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-") or "post"
        d = meta.get("date") or datetime.date.today()
        if isinstance(d, str): d = datetime.date.fromisoformat(d[:10])
        if isinstance(d, datetime.datetime): d = d.date()
        lang = meta.get("language", "bn")
        words = len(re.findall(r"\S+", re.sub(r"<[^>]+>", " ", body)))
        mins = max(1, math.ceil(words / 200))
        if lang == "bn":
            date_h = ("%d %s %d" % (d.day, BN_MONTHS[d.month - 1], d.year)).translate(BN_DIGITS)
            read_h = ("%d মিনিটে পড়া" % mins).translate(BN_DIGITS)
        else:
            date_h, read_h = "%d %s %d" % (d.day, EN_MONTHS[d.month - 1], d.year), "%d min read" % mins
        title = str(meta.get("title") or slug)
        posts.append({"slug": slug, "title": title, "seo_title": str(meta.get("seo_title") or title),
                      "desc": str(meta.get("description") or ""), "lead": str(meta.get("lead") or ""),
                      "tag": str(meta.get("tag") or "Marketing"), "tool": meta.get("tool") or "",
                      "cover": str(meta.get("cover") or "").lstrip("/"), "lang": lang,
                      "translation": str(meta.get("translation") or "").strip("/ "),
                      "date": d, "date_h": date_h, "read_h": read_h, "body": body})
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts

def render_body(md_text):
    h = markdown.markdown(md_text, extensions=["tables", "sane_lists", "attr_list"])
    toc, n = [], [0]
    def h2(m):
        n[0] += 1; sid = "s%d" % n[0]
        text = re.sub(r"<[^>]+>", "", m.group(1)); toc.append((sid, text))
        return '<h2 id="%s">%s</h2>' % (sid, m.group(1))
    h = re.sub(r"<h2>(.*?)</h2>", h2, h)
    h = re.sub(r"<blockquote>\s*<p>(.*?)</p>\s*</blockquote>", r'<div class="formula-box">\1</div>', h, flags=re.S)
    h = re.sub(r"(<table>.*?</table>)", r'<div class="table-wrap">\1</div>', h, flags=re.S)
    h = re.sub(r'<img (?![^>]*loading=)', '<img loading="lazy" ', h)
    h = re.sub(r'src="/(?!/)', 'src="../', h)
    return h, toc

def site_parts():
    src = read("gallery.html")
    head = src[:src.index("<body")]
    header = src[src.index('<div class="progress"'):src.index("<main>")]
    footer = src[src.index("<footer>"):src.index('<script src="assets/site.js')]
    return head, header, footer

def relink(s):
    s = re.sub(r'(href|src)="(assets/|favicon|apple-touch)', r'\1="../\2', s)
    s = s.replace('href="./"', 'href="../"').replace('href="./#', 'href="../#')
    s = re.sub(r'href="(gallery|tools)(#[^"]*)?"', lambda m: 'href="../%s%s"' % (m.group(1), m.group(2) or ""), s)
    s = s.replace('href="blog/"', 'href="./"').replace(' class="active" aria-current="page"', "")
    return s

def page_head(head, title, desc, url, typ, ld, image):
    h = re.sub(r"<title>.*?</title>", "<title>%s</title>" % e(title), head, flags=re.S)
    subs = [(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % e(desc)),
            (r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url),
            (r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="%s">' % url),
            (r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="%s">' % typ),
            (r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="%s">' % e(title)),
            (r'<meta name="twitter:title" content="[^"]*">', '<meta name="twitter:title" content="%s">' % e(title)),
            (r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="%s">' % e(desc)),
            (r'<meta name="twitter:description" content="[^"]*">', '<meta name="twitter:description" content="%s">' % e(desc)),
            (r'<meta property="og:image" content="[^"]*">', '<meta property="og:image" content="%s">' % image),
            (r'<meta name="twitter:image" content="[^"]*">', '<meta name="twitter:image" content="%s">' % image)]
    for a, b in subs: h = re.sub(a, lambda m: b, h)
    if image != BASE + "og-image.jpg":
        h = re.sub(r'\n<meta property="og:image:(width|height)" content="[^"]*">', "", h)
    h = re.sub(r'\n<script type="application/ld\+json"[^>]*>.*?</script>', "", h, flags=re.S)
    h = h.replace("<!-- /Social preview -->", '<script type="application/ld+json">%s</script>\n<!-- /Social preview -->' % json.dumps(ld, ensure_ascii=False))
    if "Hind+Siliguri" not in h:
        h = h.replace('&display=swap" rel="stylesheet">', '&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">', 1)
    return relink(h)

def build_blog():
    posts = load_posts()
    head, header, footer = site_parts()
    hdr = relink(header).replace('<a href="./">Blog</a>', '<a href="./" class="active" aria-current="page">Blog</a>')
    ftr = relink(footer) + '<script src="../assets/site.js"></script>\n'
    author = {"@type": "Person", "name": "Md. Mustafizur Rahman", "url": BASE}
    keep = {"index.html"}
    for p in posts:
        url = BASE + "blog/" + p["slug"]
        body, toc = render_body(p["body"])
        image = BASE + p["cover"] if p["cover"] else BASE + "og-image.jpg"
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["seo_title"], "description": p["desc"],
              "datePublished": p["date"].isoformat(), "dateModified": p["date"].isoformat(), "inLanguage": p["lang"],
              "author": author, "publisher": author, "image": image, "mainEntityOfPage": url}
        bn = p["lang"] == "bn"
        tool = (TOOLS if p["lang"] == "bn" else TOOLS_EN).get(p["tool"])
        cta = ('<div class="cta-card"><div><h3>%s</h3><p>%s</p></div><a href="../tools#tool-%s" class="btn">%s <span aria-hidden="true">→</span></a></div>' % (
            "নিজের সংখ্যা দিয়ে এখনই হিসাব করুন" if bn else "Try it with your own numbers", e(tool[1]), p["tool"], e(tool[0]))) if tool else ""
        # put the tool card right before the last section, like a natural mid-article call to action
        if cta:
            idx = [m.start() for m in re.finditer(r'<h2 id=', body)]
            body = body[:idx[-1]] + cta + "\n" + body[idx[-1]:] if len(idx) > 1 else body + cta
        tr = next((q for q in posts if q["slug"] == p["translation"]), None) if p["translation"] else None
        tr_link = ('<a class="lang-switch" href="%s" lang="%s" hreflang="%s">%s</a>\n' % (
            tr["slug"], tr["lang"], tr["lang"], "বাংলায় পড়ুন →" if tr["lang"] == "bn" else "Read in English →")) if tr else ""
        alt_links = ('<link rel="alternate" hreflang="%s" href="%s">\n<link rel="alternate" hreflang="%s" href="%sblog/%s">\n' % (
            p["lang"], url, tr["lang"], BASE, tr["slug"])) if tr else ""
        cover = '<img class="post-cover" src="../%s" alt="" loading="eager">' % e(p["cover"]) if p["cover"] else ""
        out = page_head(head, p["seo_title"] + " | Md. Mustafizur Rahman", p["desc"], url, "article", ld, image)
        if bn: out = out.replace('<html lang="en">', '<html lang="bn">')
        if alt_links: out = out.replace("</head>", alt_links + "</head>", 1)
        out += '<body data-page="post">\n\n' + hdr + "<main>\n"
        out += '''  <article class="post"%s>
    <header class="post-hero">
      <span class="blob a" aria-hidden="true"></span>
      <div class="wrap post-wrap">
        <p class="crumb"><a href="../">Home</a> / <a href="./">Blog</a></p>
        <span class="tag">%s</span>
        <h1>%s</h1>
        <p class="post-meta">Md. Mustafizur Rahman · <time datetime="%s">%s</time> · %s</p>
      </div>
    </header>
    <div class="wrap post-layout">
      <aside class="toc" aria-label="%s"><p>%s</p><ol>%s</ol></aside>
      <div class="post-body">
%s%s%s
        <div class="author-box">
          <img src="../assets/img/portrait.webp" alt="" width="64" height="64" loading="lazy">
          <div><b>Md. Mustafizur Rahman</b><p>%s</p><a href="../#contact">%s →</a></div>
        </div>
      </div>
    </div>
  </article>
''' % (' lang="bn"' if bn else "", e(p["tag"]), e(p["title"]), p["date"].isoformat(), p["date_h"], p["read_h"],
       "এই লেখায়" if bn else "In this post", "এই লেখায়" if bn else "In this post",
       "".join('<li><a href="#%s">%s</a></li>' % (i, t) for i, t in toc), tr_link + cover,
       ('<p class="post-lead">%s</p>\n' % e(p["lead"])) if p["lead"] else "", body,
       "Digital Marketing &amp; Creative Specialist. Ora.com.bd-কে শুরুর দিন থেকে ৯ মাসে ৩ কোটি টাকার রেভিনিউতে নিয়ে গেছেন, শুধু Meta Ads দিয়ে।" if bn else
       "Digital Marketing &amp; Creative Specialist who took Ora.com.bd from launch to BDT 3 crore in revenue in 9 months on Meta Ads.",
       "যোগাযোগ করুন" if bn else "Get in touch")
        out += "</main>\n\n" + ftr + "\n</body>\n</html>\n"
        write("blog/%s.html" % p["slug"], out); keep.add(p["slug"] + ".html")

    url = BASE + "blog/"
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Blog | Md. Mustafizur Rahman", "url": url, "author": author,
          "blogPost": [{"@type": "BlogPosting", "headline": p["seo_title"], "url": BASE + "blog/" + p["slug"], "datePublished": p["date"].isoformat()} for p in posts]}
    out = page_head(head, "Blog: Media Buying & E-commerce Marketing | Md. Mustafizur Rahman",
                    "Practical guides on media buying, ROAS and e-commerce marketing for Bangladeshi businesses.", url, "website", ld, BASE + "og-image.jpg")
    out += '<body data-page="blog">\n\n' + hdr + "<main>\n"
    out += '''  <section class="page-hero">
    <span class="blob a" aria-hidden="true"></span>
    <div class="wrap">
      <p class="crumb"><a href="../">Home</a> / Blog</p>
      <h1>Marketing <span class="accent">Blog</span></h1>
      <p class="lead">Practical guides on media buying, ROAS and e-commerce growth, written from real campaigns in Bangladesh.</p>
    </div>
  </section>
  <section class="blog-list-sec">
    <div class="wrap blog-list">
''' + ("".join('''      <a class="post-card" href="%s"%s>
        <span class="tag">%s</span>
        <h2>%s</h2>
        <p>%s</p>
        <span class="post-meta"><time datetime="%s">%s</time> · %s</span>
        <i aria-hidden="true">→</i>
      </a>
''' % (p["slug"], ' lang="bn"' if p["lang"] == "bn" else "", e(p["tag"]), e(p["title"]), e(p["desc"]), p["date"].isoformat(), p["date_h"], p["read_h"]) for p in posts)
       or '      <p class="empty">No posts yet.</p>\n') + '''    </div>
  </section>
'''
    out += "</main>\n\n" + ftr + "\n</body>\n</html>\n"
    write("blog/index.html", out)
    for f in glob.glob(P("blog/*.html")):  # remove pages for deleted or drafted posts
        if os.path.basename(f) not in keep: os.remove(f)
    print("blog: %d post(s)" % len(posts))
    return posts


# ---------------------------------------------------------------- sitemap + cache busting
def build_sitemap(posts):
    today = datetime.date.today().isoformat()
    urls = [("", today, "1.0"), ("gallery", today, "0.8"), ("tools", today, "0.9"), ("blog/", today, "0.7")]
    urls += [("blog/" + p["slug"], p["date"].isoformat(), "0.8") for p in posts]
    s = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    s += "".join("  <url><loc>%s%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>\n" % (BASE, u, d, pr) for u, d, pr in urls)
    old = read("sitemap.xml") if os.path.exists(P("sitemap.xml")) else ""
    if re.sub(r"<lastmod>[^<]*</lastmod>", "", old) != re.sub(r"<lastmod>[^<]*</lastmod>", "", s + "</urlset>\n"):
        write("sitemap.xml", s + "</urlset>\n")

def version_assets():
    ver = {os.path.basename(f): hashlib.md5(open(f, "rb").read()).hexdigest()[:8]
           for f in glob.glob(P("assets", "*.css")) + glob.glob(P("assets", "*.js"))}
    for f in glob.glob(P("*.html")) + glob.glob(P("blog", "*.html")):
        s = open(f, encoding="utf-8").read()
        s2 = re.sub(r'((?:\.\./)?assets/)([\w.-]+\.(?:css|js))(\?v=[0-9a-f]+)?"', lambda m: '%s%s?v=%s"' % (m.group(1), m.group(2), ver.get(m.group(2), "1")), s)
        if s2 != s: open(f, "w", encoding="utf-8").write(s2)


if __name__ == "__main__":
    build_gallery()
    posts = build_blog()
    build_sitemap(posts)
    version_assets()
    print("done")
