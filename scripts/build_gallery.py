#!/usr/bin/env python3
"""Pre-render the design gallery from gallery.json into gallery.html and index.html.

Run after editing gallery.json:  python3 scripts/build_gallery.py
The pages still work without this (assets/gallery.js renders from the JSON),
but pre-rendered markup lets search engines read every design's title and client.
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = [it for it in json.load(open(os.path.join(ROOT, "gallery.json"), encoding="utf-8")) if not it.get("hidden")]
e = lambda s: html.escape(str(s), quote=True)

def card(it, i, eager=False):
    return ('<button type="button" class="shot" data-i="%d" style="--d:%dms" aria-label="Open %s">'
            '<img src="%s" alt="%s" width="%s" height="%s" %sdecoding="async">'
            '<span class="shot-meta"><b>%s</b><small>%s · %s</small></span></button>') % (
        i, (i % 6) * 60, e(it["title"]), e(it["thumb"]), e(it["title"] + ", " + it["client"]),
        it["width"], it["height"], "" if eager else 'loading="lazy" ', e(it["title"]), e(it["client"]), e(it["category"]))

def masonry(lst, n=3):
    cols, h = [[] for _ in range(n)], [0.0] * n
    for i, it in enumerate(lst):
        k = h.index(min(h)); cols[k].append(card(it, i, eager=i < 6)); h[k] += it["height"] / it["width"]
    return "".join('<div class="g-col">' + "".join(c) + "</div>" for c in cols)

def inject(path, elem_id, inner, extra=""):
    p = os.path.join(ROOT, path); s = open(p, encoding="utf-8").read()
    pat = re.compile(r'(<div class="[^"]*" id="%s"[^>]*>).*?(</div><!-- /%s -->)' % (elem_id, elem_id), re.S)
    if pat.search(s):
        s = pat.sub(lambda m: m.group(1) + inner + m.group(2), s)
    else:
        pat2 = re.compile(r'(<div class="[^"]*" id="%s"[^>]*>)(</div>)' % elem_id)
        assert pat2.search(s), (path, elem_id)
        s = pat2.sub(lambda m: m.group(1) + inner + "</div><!-- /%s -->" % elem_id, s, count=1)
    if extra: s = extra(s)
    open(p, "w", encoding="utf-8").write(s)

cats = ["All"] + list(dict.fromkeys(it["category"] for it in items))
filters = "".join('<button type="button" class="tool-tab" aria-pressed="%s" data-cat="%s">%s <span class="n">%d</span></button>' % (
    "true" if c == "All" else "false", e(c), e(c), len(items) if c == "All" else sum(it["category"] == c for it in items)) for c in cats)

inject("gallery.html", "galleryGrid", masonry(items))
inject("gallery.html", "galleryFilters", filters)
s = open(os.path.join(ROOT, "gallery.html"), encoding="utf-8").read()
s = re.sub(r'(<span class="gallery-count" id="galleryCount"[^>]*>)[^<]*(</span>)', r"\g<1>%d designs\g<2>" % len(items), s)
open(os.path.join(ROOT, "gallery.html"), "w", encoding="utf-8").write(s)

feat = [it for it in items if it.get("featured")][:6] or items[:6]
inject("index.html", "featuredWork", "".join(card(it, i) for i, it in enumerate(feat)))
print("pre-rendered", len(items), "designs,", len(feat), "featured")
