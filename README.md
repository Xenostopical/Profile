# Profile for me, Cyber
Profile hoster, fuck guns.lol

## Self-Hosted Git Replica

Repo cards on the site are 100% self-hosted — no GitHub involved.

- `stuff.txt` — list which folders under `repos/` show up as cards.
- `repos/<id>/` — one real git repo per project (`repo.json` for name/icon/tags, `README.md`, your actual files).
- `./build-repos.sh` — run this after adding/updating a repo. It refreshes the static directory-tree + line-count metadata only — no bundles or ZIPs are written. The website generates a Git bundle or ZIP in browser memory only when someone asks to download one.
- `repo.html?repo=<id>` — the dedicated page for a single repo (README, full file tree, raw line-by-line viewer, and runtime-generated download buttons).
- `repo-stats-worker.js` + `wrangler-repostats.toml` — optional self-hosted clone/download counter (same Cloudflare Worker + KV pattern as `views-worker.js`). Deploy it and paste the URL into `REPO_STATS_URL` in `script.js` and `repo.html` to turn the counter on.

To add a project: `mkdir repos/my-project`, drop your files in, add this to `stuff.txt`, then run `./build-repos.sh`:

```
[repo]
dir = my-project
```
