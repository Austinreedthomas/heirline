#!/usr/bin/env python3
"""Build a compact, sharded search index of California unclaimed property for Heirline.

Source: California State Controller public download page
  https://www.sco.ca.gov/upd_download_property_records.html  (updated weekly)
We use the "$500 and up" file (04_From_500_To_Beyond.zip) and keep records whose
CURRENT_CASH_BALANCE >= MIN_AMOUNT, so the index fits comfortably on GitHub Pages.

Usage:  python3 scripts/build_ca_index.py [--min 1000] [--src DIR_WITH_CSVS] [--out data/ca]
Without --src it downloads the zip (~160 MB) to a temp dir.
Output: data/ca/meta.json + data/ca/<PREFIX>.json shards (2 letters, split to 3 if large).
"""
import argparse, csv, glob, io, json, os, re, shutil, sys, tempfile, urllib.request, zipfile, collections, datetime

URL = "https://claimit.ca.gov/upd-property-records/04_From_500_To_Beyond.zip"
MAX_SHARD = 1_200_000  # bytes before splitting a 2-letter shard into 3-letter shards

def norm(s): return re.sub(r"[^A-Z]", "", (s or "").upper())

def download(tmp):
    p = os.path.join(tmp, "ca.zip")
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 Heirline-index-builder"})
    with urllib.request.urlopen(req) as r, open(p, "wb") as f:
        lm = r.headers.get("Last-Modified"); shutil.copyfileobj(r, f)
    zipfile.ZipFile(p).extractall(tmp); os.remove(p)
    return tmp, lm

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=float, default=1000)
    ap.add_argument("--src"); ap.add_argument("--asof")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "ca"))
    a = ap.parse_args()
    tmp = None; asof = a.asof
    if a.src: src = a.src
    else:
        tmp = tempfile.mkdtemp(); src, lm = download(tmp)
        if lm and not asof: asof = datetime.datetime.strptime(lm, "%a, %d %b %Y %H:%M:%S %Z").date().isoformat()
    files = sorted(glob.glob(os.path.join(src, "From_500_To_Beyond*.csv")))
    if not files: sys.exit("no CSV files found in " + src)
    buckets = collections.defaultdict(list); n = kept = 0
    for fn in files:
        with open(fn, encoding="latin-1", newline="") as f:
            for r in csv.DictReader(f):
                n += 1
                try: amt = float(r["CURRENT_CASH_BALANCE"] or 0)
                except ValueError: continue
                if amt < a.min: continue
                name = (r["OWNER_NAME"] or "").strip().upper()
                parts = name.split()
                if not parts: continue
                last, rest = parts[0], " ".join(parts[1:])
                key = norm(last)
                if len(key) < 2: continue
                typ = (r["PROPERTY_TYPE"] or "").split(":")[-1].replace("Non Standard NAUPA Code for -", "").strip()
                rec = (last, rest, (r["OWNER_CITY"] or "").strip().upper(), (r["OWNER_ZIP"] or "")[:5],
                       typ, round(amt), (r["HOLDER_NAME"] or "").strip(), r["PROPERTY_ID"],
                       1 if (r["NUMBER_OF_PAID_CLAIMS"] or "0") != "0" else 0, key)
                buckets[key[:2]].append(rec); kept += 1
    out = os.path.abspath(a.out)
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(out)
    def write(prefix, recs):
        hold, typs, hi, ti, rows = [], [], {}, {}, []
        for last, rest, city, z, typ, amt, h, pid, paid, _ in sorted(recs):
            if h not in hi: hi[h] = len(hold); hold.append(h)
            if typ not in ti: ti[typ] = len(typs); typs.append(typ)
            rows.append([last, rest, city, z, ti[typ], amt, hi[h], pid] + ([1] if paid else []))
        s = json.dumps({"h": hold, "t": typs, "r": rows}, separators=(",", ":"))
        open(os.path.join(out, prefix + ".json"), "w").write(s); return len(s)
    shards = {}; total = 0
    for p, recs in buckets.items():
        size = len(json.dumps(recs))  # rough estimate
        if size > MAX_SHARD * 1.6 and len(p) == 2:
            sub = collections.defaultdict(list)
            for r in recs: sub[r[9][:3]].append(r)
            for sp, sr in sub.items(): total += write(sp, sr); shards[sp] = len(sr)
            shards[p] = "split"
        else: total += write(p, recs); shards[p] = len(recs)
    meta = {"source": "https://www.sco.ca.gov/upd_download_property_records.html", "asOf": asof or "unknown",
            "minAmount": a.min, "records": kept, "sourceRecords": n, "shards": shards,
            "built": datetime.date.today().isoformat(), "claimUrl": "https://claimit.ca.gov/"}
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), separators=(",", ":"))
    print(f"read {n:,} records, kept {kept:,} >= ${a.min:,.0f}, {len(shards)} shard keys, {total/1e6:.1f} MB JSON -> {out}")
    if tmp: shutil.rmtree(tmp)

if __name__ == "__main__": main()
