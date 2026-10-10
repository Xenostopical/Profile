# DISCOMOD — Discord Moderation, Automation & Utility Bot

> A modular Discord bot built with **discord.js v14** with moderation, automation, AI integrations, mathematical tools, verification, leveling, invite tracking, Blox Fruits utilities, and an optional browser dashboard.

DISCOMOD started as a server-specific moderation/utility project and grew into a larger multi-purpose Discord platform. The project is designed so optional systems can be enabled only when they are needed.

The most important deployment concept is:

> **The Discord bot and web dashboard can run inside the same Node.js process. The dashboard is an Express application that serves the files in `dashboard-public/`.**

The dashboard is therefore **not normally a separate GitHub Pages or Cloudflare Pages site**.

---

# 🔑 BYOK & Custom AI Provider Security Model

DISCOMOD's custom AI provider system is designed around **BYOK (Bring Your Own Key)**. Each user supplies and uses their own API key for the provider they choose. Registering a provider does **not** give that provider access to the bot owner's API keys or make the bot pay for a user's API usage.

## What members can do

Any server member can register a custom provider using its public HTTPS endpoint, subject to the provider validation and rate limits in the current implementation. Custom-provider registration is therefore an **open, self-funded integration model**, rather than an owner-only feature.

Users can also add model shortcuts and manage their own provider credentials. Provider/model listings can be viewed by users.

The current implementation also limits custom-provider registration to a bounded number of entries (`MAX_CUSTOM_PROVIDERS = 40`) and applies rate limiting to provider/model additions.

## What is bot-owner locked

The bot owner has additional control over custom AI providers:

- Removing custom providers.
- Removing custom model shortcuts.
- Registering providers that point to local/private addresses, such as self-hosted Ollama, LM Studio, or vLLM instances.
- Overwriting another user's custom provider. A normal member can modify their own provider, but cannot overwrite one created by another member.

This means the important distinction is:

```text
Public custom provider registration → members can use it
Local/private provider registration  → bot owner only
Removing providers/models            → bot owner only
Editing your own provider            → creator allowed
Overwriting someone else's provider  → bot owner only
```

## Why BYOK matters

The custom-provider system is intentionally user-funded. A member must provide their **own** key for the provider they want to use. The bot's owner credentials are not exposed through a member's custom-provider configuration.

A custom provider can still cause the bot server to make an outbound request to the public endpoint selected by the user, so this is a **trust-model and outbound-connectivity consideration**, not an owner-key-sharing mechanism.

Provider URLs are subject to the project's SSRF protections, including checks intended to prevent access to private, loopback, link-local, cloud-metadata, and DNS-rebinding targets. Local/private targets remain an explicit bot-owner-only capability.

> **Security note:** Hiding a provider or dashboard control from the frontend is not authorization. Privileged provider operations must remain protected by server-side owner/creator checks.


## 📚 Table of Contents

- [Overview](#-overview)
- [Architecture at a Glance](#-architecture-at-a-glance)
- [Feature Overview](#-feature-overview)
- [AI Systems](#-ai-systems)
- [Math and Scientific Computing](#-math-and-scientific-computing)
- [Web Dashboard](#-web-dashboard)
- [How the Website Actually Works](#-how-the-website-actually-works)
- [How to Make the Dashboard Public](#-how-to-make-the-dashboard-public)
- [Production Hosting with Cloudflare Tunnel](#-production-hosting-with-cloudflare-tunnel)
- [Alternative Public Hosting](#-alternative-public-hosting)
- [Local Dashboard Testing](#-local-dashboard-testing)
- [GitHub Codespaces Hosting](#-github-codespaces-hosting)
- [Dashboard + Discord OAuth2 Setup](#-dashboard--discord-oauth2-setup)
- [Turnstile / Web Verification](#-turnstile--web-verification)
- [Server Configuration](#-server-configuration)
- [Commands](#-commands)
- [Permissions and Access Control](#-permissions-and-access-control)
- [Environment Variables](#-environment-variables)
- [Requirements](#-requirements)
- [Restoring Large Split Files](#-restoring-large-split-files)
- [Installation](#-installation)
- [Running the Bot](#-running-the-bot)
- [Updating the Environment](#-updating-the-environment)
- [AI Provider Setup](#-ai-provider-setup)
- [Math Environment Setup](#-math-environment-setup)
- [Discord Developer Portal](#-discord-developer-portal)
- [Data and Persistence](#-data-and-persistence)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [Development](#-development)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Deployment Checklists](#-deployment-checklists)
- [Credits](#-credits)
- [License](#-license)
- [Final Notes](#-final-notes)

---

# 🧭 Overview

DISCOMOD combines Discord-side features with an optional Express web dashboard.

The main application is the Node.js process started from:

```text
DISCOMOD.js
```

A normal checkout keeps the main application modules directly inside `Discomod/`, with web assets and tests in their own subdirectories.

The project can be used as:

```text
Bot only
Bot + local dashboard
Bot + public dashboard
Bot + dashboard in GitHub Codespaces
```

---

# 🏗️ Architecture at a Glance

```text
                              INTERNET
                                  │
                                  │
                         public HTTPS hostname
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ Cloudflare Tunnel /      │
                    │ reverse proxy / ingress  │
                    └─────────────┬────────────┘
                                  │
                                  │ HTTP
                                  ▼
                    ┌──────────────────────────┐
                    │       Node.js host       │
                    │                          │
                    │      DISCOMOD.js         │
                    │          │               │
                    │     ┌────┴─────┐         │
                    │     │          │         │
                    │     ▼          ▼         │
                    │ Discord     Express      │
                    │  bot       dashboard     │
                    │               │          │
                    │               ▼          │
                    │       dashboard-public/  │
                    │       index.html         │
                    │       script.js          │
                    │       style.css          │
                    └──────────────────────────┘
```

The important distinction is:

```text
DISCOMOD.js
   │
   ├── Discord client / bot
   │
   └── Express dashboard
           │
           └── dashboard-public/
```

A public HTTPS layer sits in front when the dashboard needs to be accessible over the internet.

---

# 🚀 Feature Overview

## 🔒 Moderation

- violation tracking
- configurable thresholds
- warnings and enforcement modes
- timeouts
- moderation logging
- role-management tools
- channel lock/unlock tools
- moderation notes and case management

## 🛡️ Message Protection

- flood/rapid-message detection
- duplicate-message detection
- emoji spam detection
- suspicious-link checks
- rule-based suspicious-content detection
- optional AI-assisted detection

## 🚨 Scam and Suspicious Content Detection

The project can combine rule-based checks with optional AI-assisted analysis.

Depending on enabled features, this can include:

```text
suspicious links
scam-like wording
suspicious patterns
service/trade redirection checks
AI-assisted message analysis
```

Possible operating modes include:

```text
enforce
warn-only
log-only
```

## 🤖 AI

- multiple provider integrations
- provider/model switching
- configurable prompts/instructions
- conversation history
- AI-assisted detection
- optional provider-specific behaviour
- configurable model/base-URL overrides

## 🧮 Math

- `/math run`
- `/math all`
- `/math status`
- `/math ramset`
- high-precision calculations
- multiple scientific/computer-algebra backends
- multiline input
- long-result splitting

## 👋 Community Features

- welcome messages and cards
- leave messages and cards
- invite attribution
- invite leaderboards
- reaction roles
- leveling and XP
- level reward roles
- verification/CAPTCHA systems
- tickets
- applications
- appeals
- Custom AutoMod
- Blox Fruits-related utilities

---

# 🤖 AI Systems

Supported integrations in the current project can include:

```text
OpenAI
Anthropic / Claude
Groq
Google Gemini
Mistral
DeepSeek
xAI / Grok
Wolfram-related tooling
RoastedByAI-related functionality where configured
```

Example environment variables:

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
MISTRAL_API_KEY=
DEEPSEEK_API_KEY=
XAI_API_KEY=
WOLFRAM_APPID=
```

Providers can be left blank when they are not being used.

## Model selection

The project can expose provider/model mappings in its model selector.

Model IDs are deployment-dependent and can change when a third-party provider changes its catalog or API. The model mappings present in the current release are therefore the authoritative list for that release.

A model appearing in a selector does not guarantee that the provider will accept the ID forever; provider-side access, account permissions, API changes, and availability still apply.

## BYOK / encryption

The dashboard can be used with provider credentials supplied through the application's configuration. Where the project stores provider keys in its own persistent data, it can encrypt those values using:

```env
AI_KEY_ENCRYPTION_SECRET=
```

Use a strong private value for that secret.

---

# 🧮 Math and Scientific Computing

The dedicated `math_commands.js` subsystem can use several mathematical/scientific libraries and executables depending on what is installed on the host.

Typical backends include:

```text
mpmath
NumPy
SciPy
gmpy2
python-flint
cypari2
CLN
LinBox
SageMath
FriCAS
GiNaC
```

The user-facing `/math` command groups the available backends into readable names.

```text
/math run <backend> [expression]
/math all [expression]
/math status
/math ramset <MB>
```

Not every backend is required.

Use:

```text
/math status
```

to see what the current host can actually run.

Large results can be split into multiple Discord messages.

---

# 🌐 Web Dashboard

The dashboard is an optional **Express application inside the same Node.js process as the bot**.

It uses Discord OAuth2 for login and server-side authorization for privileged operations.

Depending on the current project revision, dashboard areas can include:

- server selection
- server settings
- moderation settings
- Custom AutoMod
- welcome/leave settings
- channels and roles
- reaction roles
- leveling
- verification
- tickets
- applications
- appeals
- invite tools
- Blox Fruits utilities
- card configuration
- AI settings
- math owner controls
- activity/status views

## Important: the dashboard is not separately hosted

You normally do **not** upload:

```text
dashboard-public/
```

to GitHub Pages or Cloudflare Pages.

Those files are served by Express.

The normal request flow is:

```text
Browser
   ↓
public HTTPS hostname
   ↓
Cloudflare Tunnel / reverse proxy
   ↓
http://localhost:3000
   ↓
Express dashboard
   ↓
dashboard-public/
```

The dashboard source starts an Express listener using the configured port and serves the dashboard frontend from `dashboard-public/`.

---

# 🌍 How the Website Actually Works

There are two different things people often call "hosting" here.

## 1. Running the website

Node.js runs the Express server.

For example:

```bash
npm start
```

When the dashboard is enabled, Express listens on a local port such as:

```text
http://localhost:3000
```

That is the actual web server.

## 2. Making the website public

`localhost` is local to the machine running Node. Someone on the internet cannot normally open your machine's `localhost:3000` directly.

A public layer is therefore placed in front of it.

For example:

```text
https://dashboard.example.com
            ↓
     Cloudflare Tunnel
            ↓
   http://localhost:3000
            ↓
         Express
```

So:

```text
Express = website server

dashboard-public/ = frontend files

Cloudflare Tunnel / reverse proxy = public HTTPS connection

DISCOMOD.js = process running the bot and dashboard
```

---

# 🌎 How to Make the Dashboard Public

A public deployment needs:

```text
1. A machine/service that runs Node continuously.
2. DISCOMOD with the dashboard enabled.
3. A public HTTPS hostname.
4. A tunnel or reverse proxy pointing that hostname at Express.
5. A matching Discord OAuth2 redirect URI.
```

A generic production topology is:

```text
                     PUBLIC INTERNET
                            │
                            ▼
                https://dashboard.example.com
                            │
                            ▼
               Cloudflare / reverse proxy
                            │
                            ▼
                    Node.js host :3000
                            │
                            ▼
                         Express
                            │
                            ▼
                    dashboard-public/
```

The public service does not replace Express. It forwards requests to Express.

---

# ☁️ Production Hosting with Cloudflare Tunnel

Cloudflare Tunnel is one practical way to publish the dashboard without directly exposing your Node.js port.

The project does not require Cloudflare Tunnel specifically. A normal reverse proxy can also be used.

## Step 1 — Put DISCOMOD on an always-on host

Use a host intended to run a long-lived Node.js application.

Examples include:

```text
VPS
cloud VM
container host
long-running application host
```

Then:

```bash
cd Discomod
npm install
```

## Step 2 — Configure the dashboard

Set:

```env
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
DASHBOARD_PUBLIC_URL=https://dashboard.example.com
DASHBOARD_REDIRECT_URI=https://dashboard.example.com/auth/callback
DASHBOARD_SESSION_SECRET=<long-random-secret>
DASHBOARD_TRUST_PROXY=true
DASHBOARD_FORCE_INSECURE_COOKIES=false
```

The production callback should be the **public HTTPS URL**, not localhost.

## Step 3 — Start DISCOMOD

```bash
npm start
```

The dashboard should now exist on the host at approximately:

```text
http://localhost:3000
```

Test this before troubleshooting Cloudflare.

## Step 4 — Install and connect `cloudflared`

Install `cloudflared` using Cloudflare's current instructions for the operating system hosting DISCOMOD.

Create or select a Cloudflare Tunnel and connect the host to it.

## Step 5 — Create a published route

Point your public hostname at the local Express service.

Example:

```text
Hostname: dashboard.example.com
Service:  http://localhost:3000
```

The important mapping is:

```text
dashboard.example.com
        ↓
http://localhost:3000
```

You do not need to expose port `3000` as a public hostname.

## Step 6 — Configure Discord OAuth2

Register this exact callback URL with Discord:

```text
https://dashboard.example.com/auth/callback
```

and use:

```env
DASHBOARD_REDIRECT_URI=https://dashboard.example.com/auth/callback
```

These must match exactly.

## Step 7 — Keep both processes/services running

You need:

```text
DISCOMOD Node process
+
Cloudflare Tunnel connector
```

The Node process hosts the dashboard.

The tunnel makes the dashboard reachable publicly.

The resulting request chain is:

```text
Browser
  ↓
HTTPS
  ↓
Cloudflare
  ↓
cloudflared
  ↓
localhost:3000
  ↓
Express
  ↓
dashboard-public/index.html
```

---

# 🔁 Alternative Public Hosting

Cloudflare Tunnel is only one deployment option.

The same Express application can sit behind:

```text
Nginx
Caddy
another reverse proxy
load balancer
container ingress
hosting platform HTTP routing
```

The core rule is:

```text
public HTTPS hostname
        ↓
Express dashboard
```

For example:

```text
https://dashboard.example.com
        ↓
Nginx / Caddy
        ↓
http://127.0.0.1:3000
        ↓
Express
```

The reverse proxy and Express server must ultimately point to the same local service.

---

# 🧪 Local Dashboard Testing

Use a local configuration such as:

```env
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
DASHBOARD_REDIRECT_URI=http://localhost:3000/auth/callback
DASHBOARD_SESSION_SECRET=<long-random-secret>
DASHBOARD_FORCE_INSECURE_COOKIES=false
```

Start the application:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Register the same callback in Discord:

```text
http://localhost:3000/auth/callback
```

Test these parts before going public:

```text
Express starts
↓
dashboard loads
↓
Discord OAuth redirect works
↓
session is created
↓
guild selection works
↓
dashboard APIs work
```

---

# 🧑‍💻 GitHub Codespaces Hosting

You can host DISCOMOD in **your own GitHub Codespace**. A Codespace is a Linux environment in the cloud that belongs to your GitHub account, with Node.js and Python available, so you don't need your own server to run the bot.

## Run DISCOMOD in your own Codespace

### 1. Put a copy of the project in your own GitHub account

Codespaces opens repositories that live on GitHub, so first copy the project into a new repository on **your** GitHub account.

1. On GitHub, create a new **empty** repository (for example `Discomod`). Don't add a README or license.
2. On your computer, run:

```bash
git clone https://gitlab.com/YOUR-GITLAB-USERNAME/Discomod.git
cd Discomod
git remote set-url origin https://github.com/YOUR-GITHUB-USERNAME/Discomod.git
git push -u origin --all
```

GitHub's **Import repository** page can also copy a project from a Git URL.

### 2. Open it in a Codespace

On your repository page, choose **Code → Codespaces → Create codespace on main**.

### 3. Set up and start the bot

In the Codespace terminal:

```bash
chmod +x setup.sh
./setup.sh

npm install
npm start
```

`setup.sh` asks for your bot token and other values and writes them to `.env`. Make sure `.env` is listed in your `.gitignore` so your token is never pushed to GitHub.

A brand-new Codespace has no Python `.venv` yet, so `setup.sh` will offer to build one with `nuke_restart.sh` as the recommended default. Accept it the first time. (See [Updating the Environment](#-updating-the-environment).)

### 4. Optional: forward the dashboard

If the dashboard is enabled, forward the dashboard port from the Codespaces **Ports** panel.

For example:

```text
Port: 3000
Visibility: Public
```

Then use the forwarded HTTPS address in:

```env
DASHBOARD_PUBLIC_URL=https://<forwarded-host>
DASHBOARD_REDIRECT_URI=https://<forwarded-host>/auth/callback
DASHBOARD_TRUST_PROXY=true
```

Register that exact callback with Discord.

## Codespace limitations

Codespaces are convenient, but they are not the same as dedicated always-on production hosting.

- **It stops when idle.** A Codespace shuts down after a period of inactivity, and the bot/dashboard go offline while the environment is stopped. Reopen the Codespace and run `npm start` to bring them back. You can change the idle timeout in your GitHub Codespaces settings.
- **The forwarded hostname is tied to that Codespace.** If you create a new Codespace, update `DASHBOARD_PUBLIC_URL`, `DASHBOARD_REDIRECT_URI`, and the callback registered with Discord.
- **Usage limits apply.** GitHub gives each account a monthly amount of free Codespaces usage. Check GitHub's current limits and terms for your plan.
- **Your files stay with the Codespace.** Data saved in the workspace persists while the Codespace exists, but it is deleted if the Codespace is deleted. Back up anything important (see [Data and Persistence](#-data-and-persistence)).
- **Keep your token private.** Use `.env` or GitHub Codespaces secrets, and never commit `DISCORD_TOKEN` or other credentials.

A Codespace works well for:

```text
personal servers
development
testing
temporary demonstrations
```

For a bot and dashboard that must stay online around the clock, use a continuously running application host such as a VPS.

---

# 🔑 Dashboard + Discord OAuth2 Setup

The dashboard uses Discord OAuth2 for login.

A typical public configuration is:

```env
CLIENT_ID=
CLIENT_SECRET=

DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
DASHBOARD_PUBLIC_URL=https://dashboard.example.com
DASHBOARD_REDIRECT_URI=https://dashboard.example.com/auth/callback
DASHBOARD_SESSION_SECRET=
DASHBOARD_BOT_PERMISSIONS=8
DASHBOARD_TRUST_PROXY=true
DASHBOARD_FORCE_INSECURE_COOKIES=false
```

## What each setting does

| Variable | Purpose |
|---|---|
| `CLIENT_ID` | Discord application/client ID |
| `CLIENT_SECRET` | Discord OAuth2 client secret |
| `DASHBOARD_ENABLED` | Enables the Express dashboard |
| `DASHBOARD_PORT` | Local Express listening port |
| `DASHBOARD_PUBLIC_URL` | Public dashboard base URL |
| `DASHBOARD_REDIRECT_URI` | Exact OAuth2 callback URL |
| `DASHBOARD_SESSION_SECRET` | Signs dashboard sessions |
| `DASHBOARD_BOT_PERMISSIONS` | Permissions used for dashboard-generated bot invites |
| `DASHBOARD_TRUST_PROXY` | Enables trusted proxy handling when a proxy/tunnel is really in use |
| `DASHBOARD_FORCE_INSECURE_COOKIES` | Overrides secure-cookie behaviour; normally `false` for public HTTPS |

## OAuth2 request flow

```text
User opens dashboard
        ↓
Express redirects to Discord OAuth2
        ↓
User authorizes
        ↓
Discord redirects to /auth/callback
        ↓
Express exchanges the OAuth code
        ↓
Discord user/guild information is retrieved
        ↓
Dashboard session is created
        ↓
User reaches /dashboard
```

The client secret stays on the Node server.

---

# 🛡️ Turnstile / Web Verification

The dashboard supports Cloudflare Turnstile configuration:

```env
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

These are separate from Discord OAuth credentials.

- `TURNSTILE_SITE_KEY` is used by the browser-facing verification page.
- `TURNSTILE_SECRET_KEY` is a private server-side credential.

Never put the secret key in frontend files or publish it to GitHub.

Turnstile is optional in the current dashboard implementation. When its variables are not configured, the application can indicate that Turnstile is unavailable rather than pretending that it is active.

The current dashboard also contains a self-contained CAPTCHA-style challenge, so Turnstile is an additional layer rather than the only verification mechanism.

---

# ⚙️ Server Configuration

Most configuration is stored per guild.

Typical groups include:

### General

```text
prefixes
enabled/disabled features
channels
roles
```

### Moderation

```text
thresholds
enforcement mode
exile duration
role stripping
logging
```

### Welcome / Leave

```text
channels
messages
embeds
colours
card schemas
```

### Leveling

```text
enabled state
XP rules
message cooldown
level-up channel
level-up message
level reward roles
```

### Verification

```text
verification mode
CAPTCHA settings
attempt limits
cooldowns
web verification settings
```

### Reaction Roles

```text
target message
emoji
role mapping
```

### Custom AutoMod

```text
word rules
regular-expression rules
exemptions
actions
timeouts
logging
test functionality
```

---

# 🤖 Commands

The project contains slash commands and some prefix-style compatibility commands.

Representative slash-command families include:

```text
/setup
/leave
/invites
/math
/level
/tag
/captcha
```

Additional commands are supplied by feature modules.

`/math` groups multiple math operations beneath one top-level command using subcommands.

Keep command names and descriptions within Discord's current metadata limits when adding or changing commands.

---

# 🔐 Permissions and Access Control

Access can depend on:

```text
Discord permissions
moderator status
administrator/server-management permissions
bot-manager access
bot-owner/super-user access
```

The most important security rule is:

> **Frontend visibility is not authorization.**

Hiding a dashboard button does not stop a user from calling an endpoint directly. Privileged operations must validate permissions server-side.

---

# 🔑 Environment Variables

Use:

```text
.env.example
```

for public placeholders and:

```text
.env
```

for real/private values.

A current deployment can contain:

## Discord

```env
DISCORD_TOKEN=
CLIENT_ID=
CLIENT_SECRET=
SUPERUSER_ID=
```

## AI providers

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
MISTRAL_API_KEY=
DEEPSEEK_API_KEY=
XAI_API_KEY=
WOLFRAM_APPID=
```

## AI key encryption / errors

```env
AI_KEY_ENCRYPTION_SECRET=
ERROR_WEBHOOK_URL=
```

## Dashboard

```env
DASHBOARD_ENABLED=
DASHBOARD_PORT=
DASHBOARD_REDIRECT_URI=
DASHBOARD_PUBLIC_URL=
DASHBOARD_SESSION_SECRET=
DASHBOARD_BOT_PERMISSIONS=
DASHBOARD_TRUST_PROXY=
DASHBOARD_FORCE_INSECURE_COOKIES=
```

## Cloudflare Turnstile

```env
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

## Math / Python

```env
MATH_RAM_LIMIT_MB=
MATH_TIMEOUT_S=
PYTHON_BIN=
QALCULATE_PATH=
```

## Optional model overrides

```env
OPENAI_MODEL=
CLAUDE_MODEL=
GROQ_MODEL=
GEMINI_MODEL=
MISTRAL_MODEL=
DEEPSEEK_MODEL=
XAI_MODEL=
```

## Optional provider base URLs

```env
OPENAI_BASE_URL=
GROQ_BASE_URL=
DEEPSEEK_BASE_URL=
MISTRAL_BASE_URL=
XAI_BASE_URL=
```

## Setup/updater behaviour

```env
RUN_ENV_UPGRADE=
RUN_ENV_NUKE=
```

Never commit real credentials.

---

# 📦 Requirements

A typical deployment needs:

- Node.js 18+
- npm
- Python 3 for the math environment
- a Discord application/bot
- a bot token
- a Discord application/client ID
- an OAuth2 client secret if the dashboard is enabled
- API keys for whichever AI providers you use
- system/Python dependencies for whichever math backends you use
- an always-on host for production hosting (or your own GitHub Codespace for personal hosting)
- an HTTPS public hostname plus a tunnel/reverse proxy for a public dashboard

Depending on enabled features, the bot may also require Discord intents such as:

```text
Guilds
GuildMessages
MessageContent
GuildMembers
DirectMessages
```

and permissions needed for moderation, channel, role, message, and file operations.

---

# 🧩 Restoring Large Split Files

> **Do this after cloning the repository and before trying to run the project.** Some large files may be stored as raw, sequential pieces because GitHub rejects individual files larger than 100 MiB. These pieces are ordinary file fragments, not ZIP or TAR archives. They must be joined back together at their expected paths.

The repository should contain the pieces in this layout:

```text
large-file-parts/
├── superqalc/
│   ├── part-aaa
│   ├── part-aab
│   └── ...
└── playwright-node/
    ├── part-aaa
    ├── part-aab
    └── ...
```

Run the commands below from the **DISCOMOD repository root** (the directory containing `setup.sh` and `math_modules/`). If the `large-file-parts/` folders are missing, the repository maintainer has not included the pieces; the original large files cannot be reconstructed from this checkout alone.

## Quick terminal option (copy and paste)

If you do not want to reconstruct the pieces one file at a time, run this block from the repository root. It restores the C++ source immediately. If a Python environment with Playwright is already present, it also offers to restore the Playwright driver; accept only if those driver pieces match your operating system and CPU architecture. If `.venv` has not been created yet, set it up first and run this block again to restore the driver.

```bash
bash <<'BASH'
set -euo pipefail

restore_parts() {
    local parts_dir="$1"
    local output="$2"
    local temp="${output}.restore-tmp"
    local pieces=("${parts_dir}"/part-*)

    if [[ ! -f "${pieces[0]:-}" ]]; then
        printf 'ERROR: No file pieces found in %s\n' "$parts_dir" >&2
        return 1
    fi

    mkdir -p "$(dirname "$output")"
    cat "${pieces[@]}" > "$temp"
    if [[ ! -s "$temp" ]]; then
        rm -f "$temp"
        printf 'ERROR: Reconstructed file is empty: %s\n' "$output" >&2
        return 1
    fi
    mv "$temp" "$output"
    printf 'Restored: %s\n' "$output"
    ls -lh "$output"
}

restore_parts \
    'large-file-parts/superqalc' \
    'math_modules/supercalc/superqalc_qalculate_2million.cpp'

if [[ ! -d .venv ]]; then
    printf '\nC++ source restored. No .venv found yet, so Playwright was skipped.\n'
    printf 'Create the Python environment, then run this block again for the optional driver step.\n'
    exit 0
fi

DRIVER_DIR="$(find .venv/lib -type d -path '*/site-packages/playwright/driver' -print -quit 2>/dev/null || true)"
if [[ -z "$DRIVER_DIR" ]]; then
    printf '\nC++ source restored. Playwright driver directory was not found in .venv; install Playwright first.\n'
    exit 0
fi

if [[ ! -f large-file-parts/playwright-node/part-aaa ]]; then
    printf '\nC++ source restored. Playwright pieces were not found; its driver was skipped.\n'
    exit 0
fi

printf "\nThe Playwright pieces must match this machine's OS and CPU architecture.\n"
printf 'A mismatched driver may not run. Restore it only if you know it is compatible.\n'
read -r -p 'Restore the Playwright driver too? [y/N] ' answer
case "$answer" in
    y|Y|yes|YES)
        restore_parts \
            'large-file-parts/playwright-node' \
            "$DRIVER_DIR/node"
        chmod +x "$DRIVER_DIR/node"
        ;;
    *)
        printf 'Skipped Playwright driver; the C++ source is restored.\n'
        ;;
esac
BASH
```

## 1. Restore the large C++ source file (detailed method)

Do this immediately after cloning, before running setup or compiling anything. The command joins the pieces in filename order and recreates the original source file:

```bash
bash <<'BASH'
set -euo pipefail

PARTS="large-file-parts/superqalc"
OUTPUT="math_modules/supercalc/superqalc_qalculate_2million.cpp"
TEMP="${OUTPUT}.restore-tmp"

if ! compgen -G "$PARTS/part-*" >/dev/null; then
    echo "ERROR: No C++ source pieces found in $PARTS" >&2
    exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"
cat "$PARTS"/part-* > "$TEMP"
test -s "$TEMP"
mv "$TEMP" "$OUTPUT"

printf 'Restored: %s\n' "$OUTPUT"
ls -lh "$OUTPUT"
BASH
```

Keep the `large-file-parts/superqalc/` directory and all of its `part-*` files together. Do not rename the pieces or concatenate them in a different order.

## 2. Restore the Playwright driver only after building the Python environment

The Playwright `node` executable normally lives inside `.venv`, whose location and contents depend on the Python version, operating system, and CPU architecture. **First create the environment and install the project's Python dependencies** using the normal setup instructions. If `nuke_restart.sh` is used, restore this file only after that rebuild has finished, because the rebuild can replace `.venv`.

Only restore the included driver pieces if they are intended for the same operating system/architecture and Playwright setup you are using. A Linux executable will not run natively on macOS; on a different platform, install the platform-appropriate Playwright driver instead.

```bash
bash <<'BASH'
set -euo pipefail

PARTS="large-file-parts/playwright-node"

if ! compgen -G "$PARTS/part-*" >/dev/null; then
    echo "ERROR: No Playwright driver pieces found in $PARTS" >&2
    exit 1
fi

if [ ! -d .venv ]; then
    echo "ERROR: .venv does not exist yet. Run the Python environment setup first." >&2
    exit 1
fi

DRIVER_DIR="$(find .venv/lib -type d -path '*/site-packages/playwright/driver' -print -quit 2>/dev/null || true)"
if [ -z "$DRIVER_DIR" ]; then
    echo "ERROR: Playwright's driver directory was not found inside .venv." >&2
    echo "Install the project's Playwright dependency first, or let Playwright install its own driver." >&2
    exit 1
fi

OUTPUT="$DRIVER_DIR/node"
TEMP="${OUTPUT}.restore-tmp"
cat "$PARTS"/part-* > "$TEMP"
test -s "$TEMP"
mv "$TEMP" "$OUTPUT"
chmod +x "$OUTPUT"

printf 'Restored: %s\n' "$OUTPUT"
ls -lh "$OUTPUT"
BASH
```

These commands reconstruct the pieces; they do not compile the C++ source. Compile `superqalc_qalculate_2million.cpp` only if your project actually requires a compiled binary, following the build instructions for the target host and compiler. Do not commit `.venv` as a replacement for a reproducible dependency setup.

---

# 🛠️ Installation

## 1. Clone the repository

```bash
git clone <your-repository>
cd Discomod
```

## 2. Make scripts executable

```bash
chmod +x setup.sh
```

If the project contains a helper binary required by your deployment:

```bash
chmod +x helper.bin
```

## 3. Run setup

```bash
./setup.sh
```

The setup script can create or update `.env` and prompt for the configuration used by the current release.

## 4. Install Node dependencies

```bash
npm install
```

## 5. Start DISCOMOD

```bash
npm start
```

or:

```bash
node DISCOMOD.js
```

---

# ▶️ Running the Bot

The main entry point is:

```text
DISCOMOD.js
```

Start with:

```bash
npm start
```

When the dashboard is enabled, the same Node.js process can run:

```text
Discord bot + Express dashboard
```

A healthy public deployment should look roughly like:

```text
Discord connection  → online
Node process        → running
Express dashboard   → listening
Cloudflare Tunnel   → connected
AI providers        → enabled where configured
Math backends       → available where installed
```

---

# 🔄 Updating the Environment

The repository contains two scripts for maintaining the local Python/math/AI source environment:

| Script | What it does | Use it when |
|---|---|---|
| `update_env` | Upgrades the existing `.venv` **in place** | The environment works and you just want newer packages |
| `nuke_restart.sh` | Deletes the `.venv` and **rebuilds it from scratch** (same name, same place) | The environment is missing, broken, copied from another machine, or you want a clean start |

`update_env` can include:

```text
Python package maintenance
dependency checks
mpmath vendoring
math source synchronization
AI SDK/source synchronization
```

AI source families configured by the project can include:

```text
OpenAI
Anthropic / Claude
Google Gen AI
Groq
Mistral
xAI
DeepSeek
RoastedByAI
Wolfram-related repositories
```

## `RUN_ENV_UPGRADE`

This setting controls whether setup should automatically invoke the environment updater.

Use:

```env
RUN_ENV_UPGRADE=false
```

for normal setup when you want to skip automatic environment updating.

Use:

```env
RUN_ENV_UPGRADE=true
```

when you want setup to invoke the updater as part of the setup flow.

## `nuke_restart.sh` — clean rebuild of the `.venv`

`nuke_restart.sh` does the same job as `update_env`, but instead of upgrading the existing environment in place it builds a completely new one with the same name and location (`.venv`).

```bash
chmod +x nuke_restart.sh
./nuke_restart.sh          # asks for confirmation first
./nuke_restart.sh -y       # skips the confirmation
```

What it does, in order:

```text
1. Finds the virtual environment (same search order as update_env;
   creates <repo>/.venv if none exists)
2. Records the installed packages and builds the same compatibility constraints
   (pydantic / pydantic-core, pyee, mpmath)
3. Moves the old .venv aside and creates a brand-new one at the same path
4. Upgrades pip and packaging, then reinstalls the packages fresh
5. Runs pip check (with the same automatic repair) and the sympy/mpmath sanity check
6. Deletes the old environment only after the new one is verified
7. Vendors mpmath and offers the optional math/AI source sync, like update_env
```

### Safety

```text
If anything fails before the new environment is verified,
the old .venv is put back automatically.

It refuses to touch a folder that has no pyvenv.cfg, and it never
removes /, your home folder, or the repository root.

If the old environment cannot run (for example it was copied from another
machine), the package list comes from requirements.txt when there is one;
otherwise only the core math packages are installed.
```

### Options

```text
./nuke_restart.sh [-y] [venv-path]
```

```text
PYTHON_BIN=python3.12   Python used to build the new environment
                        (default: python3, then python)
REPO_ROOT=/path         repository root (default: git root, else current directory)
PIN_VERSIONS=1          reinstall the exact versions installed before,
                        instead of the newest compatible ones
RUN_SYSTEM_UPGRADE=1    also upgrade system packages (apt)
SYNC_MATH_REPOS=y|n     answer the math-source prompt automatically
SYNC_AI_REPOS=y|n       answer the AI-source prompt automatically
```

Example:

```bash
PIN_VERSIONS=1 ./nuke_restart.sh -y
```

### Things to know

- A rebuild can install newer package versions than you had before. Use `PIN_VERSIONS=1` to get the exact same versions.
- Packages installed from a local folder or a URL cannot be reinstalled. The script stops and restores the old `.venv` instead of leaving you without them.
- Do not commit `.venv`. It stores absolute paths and breaks on other machines, so every machine (including every new Codespace) should build its own with `nuke_restart.sh`.
- If a virtual environment is active in your shell, run `deactivate` first.

## `RUN_ENV_NUKE`

This setting controls whether setup should automatically run `nuke_restart.sh`.

Use:

```env
RUN_ENV_NUKE=false
```

for normal setup when you want to keep the current environment.

Use:

```env
RUN_ENV_NUKE=true
```

when you want setup to run a clean rebuild as part of the setup flow.

`setup.sh` asks this question itself. If it finds no working `.venv` (missing, or broken because it was copied from another machine or Codespace), it warns that `update_env` has nothing to upgrade and offers the rebuild as the recommended default. Because you have already confirmed it there, setup runs `nuke_restart.sh -y`.

If both `RUN_ENV_UPGRADE` and `RUN_ENV_NUKE` are true, only `nuke_restart.sh` runs, since a fresh environment is already up to date.

When it can write to `/usr/local/bin` without a password prompt, setup also installs a global `nuke_restart` command, just like the `upgrade` command for `update_env`.

---

# 🧠 AI Provider Setup

### OpenAI

```env
OPENAI_API_KEY=...
```

### Anthropic / Claude

```env
ANTHROPIC_API_KEY=...
```

### Groq

```env
GROQ_API_KEY=...
```

### Google Gemini

```env
GEMINI_API_KEY=...
```

### Mistral

```env
MISTRAL_API_KEY=...
```

### DeepSeek

```env
DEEPSEEK_API_KEY=...
```

### xAI / Grok

```env
XAI_API_KEY=...
```

### Wolfram

```env
WOLFRAM_APPID=...
```

A provider may still fail even when its key exists because of model availability, account permissions, dependency problems, API changes, networking, or provider outages.

---

# 🧮 Math Environment Setup

Math backend availability depends on the host machine.

Check the runtime state with:

```text
/math status
```

If a backend is missing, install the required Python/system package or executable for that backend.

Qalculate can be pointed to explicitly with:

```env
QALCULATE_PATH=/full/path/to/qalc
```

A custom Python interpreter can be specified with:

```env
PYTHON_BIN=/full/path/to/python
```

---

# 🧑‍💻 Discord Developer Portal

Open the Discord application used by the bot.

## Bot token

Set:

```env
DISCORD_TOKEN=
```

Never publish it.

## Application ID

Set:

```env
CLIENT_ID=
```

to the Discord application's client/application ID.

## OAuth2 client secret

For dashboard login:

```env
CLIENT_SECRET=
```

This is separate from the bot token.

## Redirect URI

For local testing:

```text
http://localhost:3000/auth/callback
```

For production:

```text
https://dashboard.example.com/auth/callback
```

The Developer Portal value must match `DASHBOARD_REDIRECT_URI` exactly.

---

# 💾 Data and Persistence

DISCOMOD stores guild configuration and feature state using the project's persistent data mechanisms.

Depending on enabled modules, persisted information can include:

```text
guild settings
moderation state
invite data
leveling data
applications
appeals
reaction-role mappings
dashboard configuration
runtime settings
feature-specific state
```

## Backups

Before major changes:

```text
1. Stop the bot.
2. Back up persistent data.
3. Update dependencies/code.
4. Run tests.
5. Start the bot.
6. Verify important features.
```

Do not assume a dependency upgrade can never affect stored data.

---

# 🧯 Troubleshooting

## Bot does not start

Check:

```bash
node --version
npm --version
python3 --version
```

Then verify required `.env` values exist, especially:

```env
DISCORD_TOKEN=...
CLIENT_ID=...
```

## Dashboard does not start

Check:

```env
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
CLIENT_ID=...
CLIENT_SECRET=...
DASHBOARD_SESSION_SECRET=...
DASHBOARD_REDIRECT_URI=...
```

Look at the console for the Express/dashboard listening message.

## Dashboard works locally but not publicly

Check the layers in order:

```text
1. Is Node running?
2. Is Express listening?
3. Does http://localhost:3000 work on the host?
4. Is the tunnel/reverse proxy running?
5. Does the public hostname route to http://localhost:3000?
6. Does the public site use HTTPS?
7. Does Discord OAuth use the exact same callback URL?
```

## OAuth redirect mismatch

Make these identical:

```text
DASHBOARD_REDIRECT_URI
Discord Developer Portal redirect URI
```

## Login loop / cookies not working

For a public HTTPS deployment, normally use:

```env
DASHBOARD_FORCE_INSECURE_COOKIES=false
```

If the dashboard is behind a trusted proxy/tunnel, use:

```env
DASHBOARD_TRUST_PROXY=true
```

when that matches the actual network topology.

## Turnstile says not configured

Check:

```env
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

The secret key must remain private.

## AI provider unavailable

Check:

```text
API key
model name
base URL override
installed SDK
network connection
provider account access
provider service status
```

## Python environment missing or broken

Typical signs:

```text
update_env says "No usable virtual environment found"
python or pip inside .venv fails with "bad interpreter" or "No such file or directory"
/math status shows backends missing after moving or copying the project
```

Rebuild the environment from scratch:

```bash
./nuke_restart.sh
```

Your current `.venv` is kept until the new one has been verified, so a failed rebuild restores it. See [Updating the Environment](#-updating-the-environment).

## Math backend unavailable

Run:

```text
/math status
```

Then install the dependency/executable required by the missing backend.

---

# 🔒 Security

DISCOMOD handles:

```text
Discord credentials
OAuth2 sessions
server configuration
API credentials
optional third-party services
```

## Never commit secrets

Never commit:

```text
DISCORD_TOKEN
CLIENT_SECRET
AI API keys
TURNSTILE_SECRET_KEY
DASHBOARD_SESSION_SECRET
AI_KEY_ENCRYPTION_SECRET
```

Use `.env.example` for placeholders and `.env` for real values.

## Use HTTPS for public dashboards

A public OAuth dashboard should use an HTTPS hostname through Cloudflare Tunnel or another correctly configured reverse proxy.

## Keep authorization server-side

Frontend visibility is not authorization. Every privileged dashboard API must check the authenticated user and selected guild before performing privileged operations.

## Protect the production host

Keep the Node process and persistent data on a host you control. Back up important data before major changes.

---

# 🧑‍💻 Development

Main entry point:

```text
DISCOMOD.js
```

Useful checks:

```bash
npm install
node --check DISCOMOD.js
npm start
```

For dashboard development, test:

```text
local Express serving
OAuth callback
session handling
guild selection
guild isolation
dashboard API authorization
frontend assets
public HTTPS routing
reverse proxy/tunnel behaviour
```

Use a private test server while developing moderation, role-management, verification, ticketing, automation, dashboard, and AI changes.

---

# ✅ Testing

Run the configured tests with:

```bash
npm run test:features
```

Automated tests do not prove that:

```text
Discord's live API is available
your bot token is valid
every AI provider is online
every math backend is installed
production OAuth is configured correctly
public networking/tunnel configuration is correct
```

Those still require runtime testing.

For the public dashboard, test the entire chain:

```text
Browser
  ↓
HTTPS
  ↓
public hostname
  ↓
tunnel / reverse proxy
  ↓
Express
  ↓
dashboard-public
  ↓
Discord OAuth2
  ↓
authenticated dashboard
```

---

# 📁 Project Structure

The normal layout keeps the main application modules directly under `Discomod/`.

```text
Discomod/
├── DISCOMOD.js
├── dashboard.js
├── beli_commands.js
├── math_commands.js
├── package.json
├── setup.sh
├── update_env
├── nuke_restart.sh
├── .env.example
├── NOTICE
├── dashboard-public/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── tests/
    └── ...
```

The repository contains additional feature modules in the root directory.

The exact file list can change between releases.

Do not delete modules only because they appear unused; some are optional integrations, compatibility layers, renderers, helpers, or dynamically loaded components.

---

# 🧩 Deployment Checklists

## Bot only

```text
☐ Node.js installed
☐ npm install completed
☐ .env configured
☐ Discord bot token configured
☐ Client ID configured
☐ Required intents/permissions enabled
☐ npm start works
```

## Bot + local dashboard

```text
☐ DASHBOARD_ENABLED=true
☐ Dashboard port selected
☐ OAuth redirect registered
☐ DASHBOARD_SESSION_SECRET set
☐ http://localhost:3000 works
☐ Discord login works locally
```

## Bot + public dashboard

```text
☐ Always-on production host
☐ HTTPS public hostname
☐ Cloudflare Tunnel or reverse proxy
☐ Public hostname → localhost:3000
☐ DASHBOARD_PUBLIC_URL configured
☐ DASHBOARD_REDIRECT_URI uses the public HTTPS callback
☐ Discord OAuth redirect matches exactly
☐ DASHBOARD_TRUST_PROXY configured when appropriate
☐ DASHBOARD_FORCE_INSECURE_COOKIES=false
☐ TURNSTILE configured if desired
☐ Node process stays running
☐ Tunnel/proxy stays running
☐ Public login tested
☐ Guild isolation tested
☐ Dashboard API permissions tested
```

## GitHub Codespaces

```text
☐ Project exists in your GitHub repository
☐ Codespace created
☐ setup.sh completed
☐ .env kept out of git
☐ npm install completed
☐ npm start works
☐ Dashboard port forwarded when needed
☐ Forwarded HTTPS URL registered with Discord
☐ Codespace reopened and npm start re-run after it goes idle
```

---

# 🧾 Credits

Originally created for **MonkeyVerseYT's server**, then expanded for broader use.

**CyberNovaX (Xenostopic)**

---

# ⚠️ Disclaimer

DISCOMOD is community software and should be deployed responsibly.

Automated moderation can make mistakes. AI systems can return incorrect or unexpected results. Third-party APIs can change or become unavailable. Discord can change its APIs, limits, permissions, and application-command behaviour. Math backend availability depends on the deployment environment.

Test major changes in a controlled server before deploying them broadly.

---

# 📄 License

**GNU Affero General Public License v3 (AGPL v3)**

See:

```text
NOTICE
```

for additional notices and attribution information.

---

# ❤️ Final Notes

The core deployment concept is:

```text
                         DISCOMOD
                            │
               ┌────────────┴────────────┐
               │                         │
            Discord                  Node.js
              bot                      process
                                        │
                                        ▼
                                      Express
                                        │
                                        ▼
                                dashboard-public/
                                        │
                                        ▼
                                  localhost:3000
                                        │
                                        ▼
                         Cloudflare Tunnel / proxy
                                        │
                                        ▼
                                 public HTTPS URL
```

The dashboard is therefore a normal Node/Express web application **served by the same process as the bot**.

The public hostname is only the internet-facing layer in front of Express.

For production:

```text
Keep Node running.
Keep the tunnel/reverse proxy running.
Use HTTPS.
Use an exact Discord OAuth2 callback URL.
Keep secrets private.
Back up persistent data.
Test the complete public request chain.
```

In one sentence:

> **Express hosts the website; `dashboard-public/` contains its frontend; Discord OAuth2 handles login; a tunnel/reverse proxy makes Express public; and `DISCOMOD.js` runs the bot and dashboard together.**

Have fun building with DISCOMOD.
