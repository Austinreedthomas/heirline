#!/usr/bin/env python3
"""Check every state unclaimed-property URL in data.js and every provider URL in providers.js.

Usage: python3 scripts/check_links.py [--all]
Curls each URL (following redirects) and reports non-200 responses, redirects,
and pages that look like maintenance or bot-block pages. --all also prints OK rows.
Exit code 1 if any link is broken (non-200 or maintenance page).
"""
import re, subprocess, sys, tempfile, os, concurrent.futures as cf
from urllib.parse import urlparse

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
MAINT = re.compile(r"maintenance|temporarily unavailable|under construction|site is down", re.I)
BLOCK = re.compile(r"request rejected|access denied|attention required|perfdrive|shieldsquare|just a moment\.\.\.|enable javascript and cookies", re.I)

def urls():
    src = open("data.js", encoding="utf-8").read()
    block = re.search(r"const STATE_SITES = \{(.*?)\n\};", src, re.S).group(1)
    out = [(k, u) for k, u in re.findall(r'\b([A-Z]{2}):\{[^}]*?url:"([^"]+)"', block)]
    mm = re.search(r'const MISSING_MONEY=\{[^}]*url:"([^"]+)"', src)
    if mm: out.append(("MM", mm.group(1)))
    try:  # beneficiary-checkup providers
        prov = open("providers.js", encoding="utf-8").read()
        out += [("p:" + k, u) for k, u in re.findall(r'\["(\w+)","[^"]*","[^"]*","\w+","(https?://[^"]+)"', prov)]
    except FileNotFoundError:
        pass
    return out

def check(item):
    key, url = item
    try:
        jar = tempfile.NamedTemporaryFile(delete=False).name  # some sites need a cookie to stop redirecting
        r = subprocess.run(["curl", "-sL", "-m", "25", "-c", jar, "-b", jar, "-A", UA, "-o", "-", "-w", "\n%{http_code} %{url_effective}", url],
                           capture_output=True, timeout=40)
        body, _, tail = r.stdout.decode("utf-8", "replace").rpartition("\n")
        code, final = (tail.split(" ", 1) + [""])[:2]
        os.unlink(jar)
    except Exception as e:
        return key, url, "ERR", "", str(e)
    notes = []
    if code != "200": notes.append("HTTP " + code)
    title = (re.search(r"<title[^>]*>(.*?)</title>", body, re.I | re.S) or [None, ""])[1]
    if MAINT.search(final) or MAINT.search(title): notes.append("maintenance page")
    if BLOCK.search(final) or BLOCK.search(body[:5000]): notes.append("bot-blocked (check in a real browser)")
    if final and urlparse(final).netloc.lower().removeprefix("www.") != urlparse(url).netloc.lower().removeprefix("www."):
        notes.append("redirects to " + urlparse(final).netloc)
    return key, url, code, final, "; ".join(notes)

def main():
    show_all = "--all" in sys.argv
    with cf.ThreadPoolExecutor(12) as ex:
        res = sorted(ex.map(check, urls()))
    bad = 0
    for key, url, code, final, note in res:
        if code in ("000", "403") and "bot-blocked" not in note:
            note += "; possibly bot-blocked (no response or 403; check in a real browser)"
        blocked = "bot-blocked" in note
        broken = (code != "200" and not blocked) or "maintenance" in note
        bad += broken
        if note or show_all:
            print(f"{'BROKEN' if broken else ('BLOCKED' if blocked else ('WARN' if note else 'OK')):7} {key:16} {code:4} {url}" + (f"  -> {note}" if note else ""))
    print(f"\n{len(res)} links checked, {bad} broken.")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
