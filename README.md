# Heirline (prototype, sample data only)
Static app, no build. Run: `python3 -m http.server 8080` in this folder, open http://localhost:8080
Try: Margaret Sample / 1948-03-12 / SSN last 4 4821 / FL / your name "Daniel Sample", then "Use sample documents".

## California unclaimed-property index
`python3 scripts/build_ca_index.py` downloads the State Controller's "$500 and up" file
(https://www.sco.ca.gov/upd_download_property_records.html) and writes `data/ca/` shards
(records with current cash balance >= $1,000; change with `--min`). Rebuild and commit to refresh.
No scheduled workflow: each refresh adds ~50 MB (compressed) to git history.
