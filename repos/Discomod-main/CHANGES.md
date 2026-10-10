# What changed

Copy the contents of this folder over your bot folder, keeping the structure (runtime_env.js is NEW). Restart once so Discord registers the new subcommands.

```
your-bot/
  DISCOMOD.js  beli_commands.js  translation.js  dashboard.js  runtime_env.js
  dashboard-public/
    script.js   style.css   index.html
```
style.css and index.html are byte-for-byte unchanged; they are included only so the folder is complete.

| File | Change |
|---|---|
| runtime_env.js | NEW. Live .env editor (allowlisted, atomic, backup, hooks) |
| beli_commands.js | Custom provider/model registry, SSRF guard, /beli ai addprovider/addmodel/removeprovider/removemodel/providers + !ai* prefix versions |
| translation.js | /autotranslate provider/key/remove_key + model now autocomplete (custom providers selectable) |
| DISCOMOD.js | Live API-key bindings, rebuildBloxDerived(), custom Blox Fruits data, /bloxfruits data add/remove/custom, /owner env ..., !bfadd/!bfremove/!bfcustom/!envlist/!envreload/!envunset, boot wiring |
| dashboard.js | POST /api/guilds/:id/ai-support/provider |
| script.js | "Add a custom provider" card on AI Support page |

# New .env conventions (all optional)
- `PROVIDER_<NAME>_URL` / `_KEY` / `_MODEL`  -> a live custom provider defined purely in .env
- `AI_MODEL_<CLAUDE|OPENAI|GROQ|GEMINI|MISTRAL|DEEPSEEK|GROK>` -> override that provider's model live
- Protected (never editable at runtime): DISCORD_TOKEN, CLIENT_ID, SUPERUSER_ID, AI_KEY_ENCRYPTION_SECRET, DASHBOARD_* secrets

# Owner-only
/bloxfruits data add|remove, /owner env *, removing providers/models, local (Ollama) addresses.
