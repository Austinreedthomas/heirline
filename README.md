# Heirline (prototype, sample data only)
Static app, no build. Run: `python3 -m http.server 8080` in this folder, open http://localhost:8080
Try: Margaret Sample / 1948-03-12 / SSN last 4 4821 / FL / your name "Daniel Sample", then "Use sample documents".

## Automatic state search
`python3 scripts/build_index.py ca [--min 1000] [--src DIR] [--asof DATE]` builds `data/<st>/` shards and
updates `data/states.json`, which the app reads to decide which states to auto-search.
(`scripts/build_ca_index.py` is a thin wrapper kept for compatibility.)

### State coverage (survey, Oct 15 2026)
Only states that publish owner records for free download, with no license, request form or redistribution
ban, get an adapter. Today that is **California** only (records with current balance >= $1,000, as of 2026-10-14).
- CA: free weekly CSV, https://www.sco.ca.gov/upd_download_property_records.html (auto-searched)
- NY: owner-name file only via request form; TX: request by email, license number asked; ND: request by email, fees may apply;
  CO: finder list sold ($305); MI: sold to registered locators, no redistribution; IL: no bulk data or API
- All other states: official search sites only (no public bulk download found). All 50 states + DC + PR get manual search buttons and a checklist (URLs in `STATE_SITES` in data.js).
No scheduled refresh workflow: each rebuild adds ~50 MB (compressed) to git history.

## Checking state links
`python3 scripts/check_links.py` curls every state unclaimed-property URL in `data.js` (plus MissingMoney) and lists non-200 responses, redirects to other domains, maintenance pages and bot-block pages. Add `--all` to list every link. It exits 1 if any link is broken. Bot-blocked sites (for example MissingMoney and Minnesota) are listed as BLOCKED, not broken; check them in a normal browser.
