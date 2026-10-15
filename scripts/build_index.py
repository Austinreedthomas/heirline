#!/usr/bin/env python3
"""Build compact, sharded unclaimed-property search indexes for Heirline, one per state.

Only states whose owner records are published for free download, with no license, request
form or redistribution ban, get an adapter. As of the Oct 2026 survey that is California only
(see README "State coverage"). Add a new state by writing an adapter that yields
(last, rest_of_name, city, zip5, property_type, amount, holder, property_id, paid_flag).

Usage:
  python3 scripts/build_index.py ca [--min 1000] [--src DIR] [--asof YYYY-MM-DD]
Writes data/<st>/meta.json + shards, and updates data/states.json (coverage registry).
"""
import argparse, collections, csv, datetime, glob, json, os, re, shutil, sys, tempfile, urllib.request, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MAX_SHARD = 1_200_000
norm = lambda s: re.sub(r"[^A-Z]", "", (s or "").upper())

# ---------------- adapters ----------------
def ca_fetch(tmp):
    url = "https://claimit.ca.gov/upd-property-records/04_From_500_To_Beyond.zip"  # "$500 and up" file
    p = os.path.join(tmp, "ca.zip")
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Heirline"})) as r, open(p, "wb") as f:
        lm = r.headers.get("Last-Modified"); shutil.copyfileobj(r, f)
    zipfile.ZipFile(p).extractall(tmp); os.remove(p)
    asof = datetime.datetime.strptime(lm, "%a, %d %b %Y %H:%M:%S %Z").date().isoformat() if lm else None
    return tmp, asof

def ca_records(src):
    files = sorted(glob.glob(os.path.join(src, "From_500_To_Beyond*.csv")))
    if not files: sys.exit("no CA CSV files in " + src)
    for fn in files:
        with open(fn, encoding="latin-1", newline="") as f:
            for r in csv.DictReader(f):
                try: amt = float(r["CURRENT_CASH_BALANCE"] or 0)
                except ValueError: continue
                parts = (r["OWNER_NAME"] or "").strip().upper().split()
                if not parts: continue
                typ = (r["PROPERTY_TYPE"] or "").split(":")[-1].replace("Non Standard NAUPA Code for -", "").strip()
                yield (parts[0], " ".join(parts[1:]), (r["OWNER_CITY"] or "").strip().upper(), (r["OWNER_ZIP"] or "")[:5],
                       typ, amt, (r["HOLDER_NAME"] or "").strip(), r["PROPERTY_ID"], (r["NUMBER_OF_PAID_CLAIMS"] or "0") != "0")

ADAPTERS = {
  "ca": dict(name="California", fetch=ca_fetch, records=ca_records, min=1000, claimUrl="https://claimit.ca.gov/",
             source="https://www.sco.ca.gov/upd_download_property_records.html",
             license="Public records published by the CA State Controller for download; updated weekly",
             note="Source file covers properties reported at $500+; index keeps current balance >= cutoff"),
}

# ---------------- generic sharder ----------------
def build(st, src=None, mn=None, asof=None):
    A = ADAPTERS[st]; mn = A["min"] if mn is None else mn; tmp = None
    if not src: tmp = tempfile.mkdtemp(); src, a2 = A["fetch"](tmp); asof = asof or a2
    buckets = collections.defaultdict(list); n = kept = 0
    for last, rest, city, z, typ, amt, holder, pid, paid in A["records"](src):
        n += 1
        key = norm(last)
        if amt < mn or len(key) < 2: continue
        buckets[key[:2]].append((last, rest, city, z, typ, round(amt), holder, pid, 1 if paid else 0, key)); kept += 1
    out = os.path.join(ROOT, "data", st)
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
        if len(json.dumps(recs)) > MAX_SHARD * 1.6:
            sub = collections.defaultdict(list)
            for r in recs: sub[r[9][:3]].append(r)
            for sp, sr in sub.items(): total += write(sp, sr); shards[sp] = len(sr)
            shards[p] = "split"
        else: total += write(p, recs); shards[p] = len(recs)
    meta = {"state": st.upper(), "name": A["name"], "source": A["source"], "license": A["license"], "note": A["note"],
            "asOf": asof or "unknown", "minAmount": mn, "records": kept, "sourceRecords": n, "shards": shards,
            "built": datetime.date.today().isoformat(), "claimUrl": A["claimUrl"]}
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), separators=(",", ":"))
    reg_p = os.path.join(ROOT, "data", "states.json")
    reg = json.load(open(reg_p)) if os.path.exists(reg_p) else {}
    reg[st.upper()] = {k: meta[k] for k in ("name", "asOf", "minAmount", "records", "claimUrl", "source")}
    json.dump(reg, open(reg_p, "w"), indent=1, sort_keys=True)
    print(f"{st.upper()}: read {n:,}, kept {kept:,} >= ${mn:,.0f}, {len(shards)} shard keys, {total/1e6:.1f} MB -> {out}")
    if tmp: shutil.rmtree(tmp)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("states", nargs="*", default=list(ADAPTERS))
    ap.add_argument("--min", type=float); ap.add_argument("--src"); ap.add_argument("--asof")
    a = ap.parse_args()
    for st in a.states:
        if st.lower() not in ADAPTERS: sys.exit(f"no adapter for {st}; covered: {', '.join(ADAPTERS)}")
        build(st.lower(), a.src, a.min, a.asof)
