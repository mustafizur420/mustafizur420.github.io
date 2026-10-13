#!/usr/bin/env python3
"""Add ?v=<content hash> to CSS/JS links so browsers always load the latest version after an update.
Run after any change to assets/:  python3 scripts/version_assets.py
"""
import hashlib, os, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = {}
for f in glob.glob(os.path.join(ROOT, "assets", "*.css")) + glob.glob(os.path.join(ROOT, "assets", "*.js")):
    ver[os.path.basename(f)] = hashlib.md5(open(f, "rb").read()).hexdigest()[:8]
pages = glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "blog", "*.html"))
for p in pages:
    s = open(p, encoding="utf-8").read()
    s2 = re.sub(r'((?:\.\./)?assets/)([\w.-]+\.(?:css|js))(\?v=[0-9a-f]+)?"',
                lambda m: '%s%s?v=%s"' % (m.group(1), m.group(2), ver.get(m.group(2), "1")), s)
    if s2 != s: open(p, "w", encoding="utf-8").write(s2)
print(ver)
