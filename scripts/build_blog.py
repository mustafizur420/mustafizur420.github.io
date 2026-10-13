#!/usr/bin/env python3
"""Build blog pages (blog/index.html and each post) from posts/ bodies, reusing the site header and footer.
Run: python3 scripts/build_blog.py
"""
import html, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://mustafizur420.github.io/"
e = lambda s: html.escape(s, quote=True)
POSTS = [{
  "slug": "cod-real-roas",
  "title": "COD ব্যবসায় আসল ROAS কীভাবে মাপবেন",
  "seo_title": "COD ব্যবসায় আসল ROAS কীভাবে মাপবেন (ফ্রি ক্যালকুলেটরসহ)",
  "desc": "Ads Manager-এর ROAS কেন ক্যাশ অন ডেলিভারি ব্যবসায় বেশি দেখায়, আসল ROAS-এর সূত্র, উদাহরণ আর ডেলিভারি রেট বাড়ানোর ৬টা উপায়।",
  "date": "2026-10-13", "date_bn": "১৩ অক্টোবর ২০২৬", "read": "৬ মিনিটে পড়া", "tag": "Media Buying",
  "body": "posts/cod-real-roas.html",
}]

src = open(os.path.join(ROOT, "gallery.html"), encoding="utf-8").read()
head = src[:src.index("<body")]
header = src[src.index('<div class="progress"'):src.index("<main>")]
footer = src[src.index("<footer>"):src.index('<script src="assets/site.js">')]

def relink(s):
    s = re.sub(r'(href|src)="(assets/|favicon|apple-touch)', r'\1="../\2', s)
    s = s.replace('href="./"', 'href="../"').replace('href="./#', 'href="../#')
    s = re.sub(r'href="(gallery|tools)(#[^"]*)?"', lambda m: 'href="../%s%s"' % (m.group(1), m.group(2) or ""), s)
    s = s.replace('href="blog/"', 'href="./"')
    s = s.replace(' class="active" aria-current="page"', "")
    return s

def page_head(title, desc, url, typ, ld):
    h = re.sub(r"<title>.*?</title>", "<title>%s</title>" % e(title), head, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % e(desc), h)
    h = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url, h)
    for k in ("og:url",): h = re.sub(r'<meta property="%s" content="[^"]*">' % k, '<meta property="%s" content="%s">' % (k, url), h)
    h = re.sub(r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="%s">' % typ, h)
    for k in ("og:title", "twitter:title"):
        attr = "property" if k.startswith("og") else "name"
        h = re.sub(r'<meta %s="%s" content="[^"]*">' % (attr, k), '<meta %s="%s" content="%s">' % (attr, k, e(title)), h)
    for k in ("og:description", "twitter:description"):
        attr = "property" if k.startswith("og") else "name"
        h = re.sub(r'<meta %s="%s" content="[^"]*">' % (attr, k), '<meta %s="%s" content="%s">' % (attr, k, e(desc)), h)
    h = re.sub(r'\n<script type="application/ld\+json"[^>]*>.*?</script>', "", h, flags=re.S)
    h = h.replace("<!-- /Social preview -->", '<script type="application/ld+json">%s</script>\n<!-- /Social preview -->' % json.dumps(ld, ensure_ascii=False))
    h = h.replace('&display=swap" rel="stylesheet">', '&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">', 1)
    return relink(h)

def nav_active(hdr):
    return hdr.replace('<a href="./">Blog</a>', '<a href="./" class="active" aria-current="page">Blog</a>')

author = {"@type": "Person", "name": "Md. Mustafizur Rahman", "url": BASE}
scripts = '<script src="../assets/site.js"></script>\n'

for p in POSTS:
    url = BASE + "blog/" + p["slug"]
    body = open(os.path.join(ROOT, p["body"]), encoding="utf-8").read()
    toc = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
    ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["seo_title"], "description": p["desc"],
          "datePublished": p["date"], "dateModified": p["date"], "inLanguage": "bn", "author": author, "publisher": author,
          "image": BASE + "og-image.jpg", "mainEntityOfPage": url}
    out = page_head(p["seo_title"] + " | Md. Mustafizur Rahman", p["desc"], url, "article", ld).replace('<html lang="en">', '<html lang="bn">')
    out += '<body data-page="post">\n\n' + nav_active(relink(header)) + "<main>\n"
    out += '''  <article class="post" lang="bn">
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
      <aside class="toc" aria-label="এই লেখায়"><p>এই লেখায়</p><ol>%s</ol></aside>
      <div class="post-body">
%s
        <div class="author-box">
          <img src="../assets/img/portrait.webp" alt="" width="64" height="64" loading="lazy">
          <div><b>Md. Mustafizur Rahman</b><p>Digital Marketing &amp; Creative Specialist. Ora.com.bd-তে মিডিয়া বায়িং দিয়ে বছরে ০ থেকে ৩ কোটি টাকার রেভিনিউ এনেছেন, 4–6X ROAS ধরে রেখে।</p><a href="../#contact">যোগাযোগ করুন →</a></div>
        </div>
      </div>
    </div>
  </article>
''' % (e(p["tag"]), e(p["title"]), p["date"], p["date_bn"], p["read"],
       "".join('<li><a href="#%s">%s</a></li>' % (i, t) for i, t in toc), body)
    out += "</main>\n\n" + relink(footer) + scripts + "\n</body>\n</html>\n"
    open(os.path.join(ROOT, "blog", p["slug"] + ".html"), "w", encoding="utf-8").write(out)

# blog index
url = BASE + "blog/"
ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Blog | Md. Mustafizur Rahman", "url": url, "author": author,
      "blogPost": [{"@type": "BlogPosting", "headline": p["seo_title"], "url": BASE + "blog/" + p["slug"], "datePublished": p["date"]} for p in POSTS]}
out = page_head("Blog: Media Buying & E-commerce Marketing | Md. Mustafizur Rahman",
                "Practical guides on media buying, ROAS and e-commerce marketing for Bangladeshi businesses.", url, "website", ld)
out += '<body data-page="blog">\n\n' + nav_active(relink(header)) + "<main>\n"
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
''' + "".join('''      <a class="post-card" href="%s" lang="bn">
        <span class="tag">%s</span>
        <h2>%s</h2>
        <p>%s</p>
        <span class="post-meta"><time datetime="%s">%s</time> · %s</span>
        <i aria-hidden="true">→</i>
      </a>
''' % (p["slug"], e(p["tag"]), e(p["title"]), e(p["desc"]), p["date"], p["date_bn"], p["read"]) for p in POSTS) + '''    </div>
  </section>
'''
out += "</main>\n\n" + relink(footer) + scripts + "\n</body>\n</html>\n"
open(os.path.join(ROOT, "blog", "index.html"), "w", encoding="utf-8").write(out)
print("built", len(POSTS), "post(s) + index")

import runpy; runpy.run_path(os.path.join(ROOT, "scripts", "version_assets.py"))
