#!/bin/sh
# nuke_restart.sh — completely rebuild the project's Python environment from scratch
#
# Like update_env.sh, but instead of upgrading the existing .venv in place it:
#   1. remembers which packages are installed,
#   2. moves the old .venv out of the way,
#   3. creates a brand-new .venv with the SAME name and location,
#   4. reinstalls the packages fresh (with the same compatibility protections),
#   5. verifies everything, then deletes the old copy.
# If anything fails before the new environment is verified, the old .venv is put back.
#
# After that it does the same extras as update_env:
#   mpmath vendoring, then the optional math/AI source-repo sync.
#
# Usage:
#   ./nuke_restart.sh [-y] [venv-path]
#     -y          don't ask for confirmation
#     venv-path   rebuild this venv instead of the auto-detected one
#
# Environment variables:
#   PYTHON_BIN=python3.12   Python used to build the new venv (default: python3, then python)
#   REPO_ROOT=/path         repository root (default: git root, else current directory)
#   PIN_VERSIONS=1          reinstall the EXACT versions that were installed before,
#                           instead of the newest versions that fit the constraints
#   RUN_SYSTEM_UPGRADE=1    also upgrade system packages (apt)
#   SYNC_MATH_REPOS=y|n     answer the math-source prompt automatically
#   SYNC_AI_REPOS=y|n       answer the AI-source prompt automatically
#
# This script is POSIX /bin/sh compatible.

set -eu

# ─────────────────────────────────────────────────────────────────────────────
# 0. Resolve repository root
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ -n "${REPO_ROOT:-}" ]; then
    REPO_ROOT=$(CDPATH= cd -- "$REPO_ROOT" && pwd)
elif REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
    :
else
    REPO_ROOT=$(pwd)
fi

# ─────────────────────────────────────────────────────────────────────────────
# Output helpers
# ─────────────────────────────────────────────────────────────────────────────

info() {
    printf '\n🔹 %s\n' "$1"
}

success() {
    printf '   ✅ %s\n' "$1"
}

warn() {
    printf '   ⚠️  %s\n' "$1"
}

fail() {
    printf '   ❌ %s\n' "$1"
    exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Arguments
# ─────────────────────────────────────────────────────────────────────────────

ASSUME_YES=0
VENV_ARG=""

for ARG in "$@"; do
    case "$ARG" in
        -y|--yes) ASSUME_YES=1 ;;
        -h|--help) sed -n '2,27p' "$0"; exit 0 ;;
        -*) fail "Unknown option: $ARG" ;;
        *) VENV_ARG="$ARG" ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# Temporary files / rollback
# ─────────────────────────────────────────────────────────────────────────────

FREEZE_FILE="/tmp/nuke_restart_freeze_$$.txt"
TOPLEVEL_FILE="/tmp/nuke_restart_toplevel_$$.txt"
PACKAGES_FILE="/tmp/nuke_restart_packages_$$.txt"
CONSTRAINTS_FILE="/tmp/nuke_restart_constraints_$$.txt"
CHECK_FILE="/tmp/nuke_restart_check_$$.txt"

VENV_PATH=""
OLD_BACKUP=""
CREATED_NEW=0
SUCCESS=0

cleanup() {
    rm -f \
        "$FREEZE_FILE" \
        "$TOPLEVEL_FILE" \
        "$PACKAGES_FILE" \
        "$CONSTRAINTS_FILE" \
        "${CONSTRAINTS_FILE}.tmp" \
        "$CHECK_FILE" \
        2>/dev/null || true
}

rollback_if_needed() {
    STATUS=$?

    if [ "$STATUS" -ne 0 ] && [ "$SUCCESS" -eq 0 ] && [ "$CREATED_NEW" -eq 1 ]; then
        printf '\n💥 Failure detected — undoing the rebuild...\n'

        set +e

        rm -rf "$VENV_PATH"

        if [ -n "$OLD_BACKUP" ] && [ -d "$OLD_BACKUP" ]; then
            if mv "$OLD_BACKUP" "$VENV_PATH"; then
                printf '   ✅ Your previous environment was restored: %s\n' "$VENV_PATH"
            else
                printf '   ⚠️  Could not move it back — your old environment is still at: %s\n' "$OLD_BACKUP"
            fi
        else
            printf '   ✅ Removed the incomplete new environment.\n'
        fi

        set -e
    fi

    cleanup

    if [ "$STATUS" -ne 0 ]; then
        exit "$STATUS"
    fi
}

trap 'rollback_if_needed' EXIT
trap 'exit 130' INT TERM

# ─────────────────────────────────────────────────────────────────────────────
# 1. Check basic tools
# ─────────────────────────────────────────────────────────────────────────────

info "Checking required tools..."

BASE_PYTHON=""

if [ -n "${PYTHON_BIN:-}" ]; then
    command -v "$PYTHON_BIN" >/dev/null 2>&1 || fail "PYTHON_BIN='$PYTHON_BIN' was not found."
    BASE_PYTHON=$(command -v "$PYTHON_BIN")
elif command -v python3 >/dev/null 2>&1; then
    BASE_PYTHON=$(command -v python3)
elif command -v python >/dev/null 2>&1; then
    BASE_PYTHON=$(command -v python)
else
    fail "Neither python3 nor python was found."
fi

# If a virtual environment is currently active, python3 may be the very venv we are
# about to replace. Resolve to the real base interpreter so it survives the rebuild.
REAL_PYTHON=$("$BASE_PYTHON" -c 'import sys; print(getattr(sys, "_base_executable", "") or sys.executable)' 2>/dev/null || true)
if [ -n "$REAL_PYTHON" ] && [ -x "$REAL_PYTHON" ]; then
    BASE_PYTHON="$REAL_PYTHON"
fi

command -v git >/dev/null 2>&1 || warn "git was not found. Repository syncing will be unavailable."

success "Python for the new environment: $BASE_PYTHON"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Optional system upgrade
# ─────────────────────────────────────────────────────────────────────────────

if [ "${RUN_SYSTEM_UPGRADE:-0}" = "1" ]; then
    info "Checking system package manager for upgrades..."

    if command -v apt-get >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive

        APT_OPTS='-o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"'

        sudo -E apt-get update -qq >/dev/null
        sudo -E apt-get upgrade -y -qq $APT_OPTS >/dev/null

        success "System packages upgraded."
    else
        warn "apt package manager not found. Skipping system-level upgrade."
    fi
else
    info "Skipping system-level package upgrade (set RUN_SYSTEM_UPGRADE=1 to enable)."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Resolve directories
# ─────────────────────────────────────────────────────────────────────────────

MATH_MODULES_DIR="$REPO_ROOT/math_modules"
AI_MODULES_DIR="$REPO_ROOT/ai_modules/core"

mkdir -p "$MATH_MODULES_DIR" "$AI_MODULES_DIR"

printf '   Repository root: %s\n' "$REPO_ROOT"
printf '   Math modules:    %s\n' "$MATH_MODULES_DIR"
printf '   AI modules:      %s\n' "$AI_MODULES_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Locate the virtual environment (same search order as update_env)
# ─────────────────────────────────────────────────────────────────────────────

if [ -n "$VENV_ARG" ]; then
    VENV_PATH=$(CDPATH= cd -- "$(dirname -- "$VENV_ARG")" && pwd)/$(basename -- "$VENV_ARG")
elif [ -x "$REPO_ROOT/.venv/bin/python" ]; then
    VENV_PATH="$REPO_ROOT/.venv"
elif [ -x "$HOME/venvs/advikmathlib_env/bin/python" ]; then
    VENV_PATH="$HOME/venvs/advikmathlib_env"
elif [ -x ".venv/bin/python" ]; then
    VENV_PATH=$(CDPATH= cd -- ".venv" && pwd)
else
    # Nothing found: build a new one with the standard name.
    VENV_PATH="$REPO_ROOT/.venv"
fi

# Safety checks before anything gets moved or deleted.
case "$VENV_PATH" in
    ""|"/"|"$HOME"|"$REPO_ROOT")
        fail "Refusing to rebuild '$VENV_PATH'."
        ;;
esac

if [ -e "$VENV_PATH" ] && [ ! -f "$VENV_PATH/pyvenv.cfg" ]; then
    fail "$VENV_PATH exists but doesn't look like a virtual environment (no pyvenv.cfg). Refusing to touch it."
fi

OLD_PY="$VENV_PATH/bin/python"
OLD_EXISTS=0
OLD_OK=0

if [ -d "$VENV_PATH" ]; then
    OLD_EXISTS=1
    if [ -x "$OLD_PY" ] && "$OLD_PY" -c 'import sys' >/dev/null 2>&1 </dev/null; then
        OLD_OK=1
    fi
fi

printf '\n'
printf '   Virtual environment: %s\n' "$VENV_PATH"

if [ "$OLD_OK" -eq 1 ]; then
    printf '   Current state:       working (Python %s)\n' "$("$OLD_PY" --version 2>&1 | awk '{print $2}')"
elif [ "$OLD_EXISTS" -eq 1 ]; then
    printf '   Current state:       exists but does not run (broken or copied from another machine)\n'
else
    printf '   Current state:       does not exist yet (a new one will be created)\n'
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Confirm
# ─────────────────────────────────────────────────────────────────────────────

if [ "$OLD_EXISTS" -eq 1 ] && [ "$ASSUME_YES" -ne 1 ]; then
    printf '\n⚠️  This will delete and rebuild %s from scratch.\n' "$VENV_PATH"
    printf '   Your current environment is kept until the new one is verified.\n'
    printf '\n   Continue? [y/N] → '

    read -r CONFIRM </dev/tty || CONFIRM=""

    case "$CONFIRM" in
        y|Y) ;;
        *)
            printf 'Cancelled. Nothing was changed.\n'
            exit 0
            ;;
    esac
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. Remember what is installed + build compatibility constraints
# ─────────────────────────────────────────────────────────────────────────────

info "Recording the packages installed in the current environment..."

: > "$FREEZE_FILE"
: > "$TOPLEVEL_FILE"
: > "$PACKAGES_FILE"

if [ "$OLD_OK" -eq 1 ]; then
    if "$OLD_PY" -m pip freeze > "$FREEZE_FILE" 2>/dev/null &&
       "$OLD_PY" -m pip list --not-required --format=freeze > "$TOPLEVEL_FILE" 2>/dev/null
    then
        # Package names only (pip/setuptools/wheel/packaging are handled separately).
        sed 's/==.*//' "$TOPLEVEL_FILE" |
            grep -viE '^(pip|setuptools|wheel|packaging)$' > "$PACKAGES_FILE" || true

        TOTAL_COUNT=$(wc -l < "$FREEZE_FILE" | tr -d ' ')
        TOP_COUNT=$(wc -l < "$PACKAGES_FILE" | tr -d ' ')

        success "$TOTAL_COUNT packages installed, $TOP_COUNT of them directly requested"
    else
        warn "Could not read the package list from the current environment."
        : > "$FREEZE_FILE"
        : > "$PACKAGES_FILE"
    fi
else
    warn "The current environment can't be read, so its package list is unavailable."

    if [ -f "$REPO_ROOT/requirements.txt" ]; then
        success "Will use $REPO_ROOT/requirements.txt instead"
    else
        warn "No requirements.txt found either — only the core packages will be installed."
    fi
fi

info "Building dependency compatibility constraints..."

: > "$CONSTRAINTS_FILE"

if [ "$OLD_OK" -eq 1 ]; then
    "$OLD_PY" > "$CONSTRAINTS_FILE" <<'PYEOF'
import importlib.metadata

def installed_version(name):
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None

def dependencies(name):
    try:
        return importlib.metadata.requires(name) or []
    except importlib.metadata.PackageNotFoundError:
        return []

# Preserve the currently installed Pydantic version if present.
pydantic_version = installed_version("pydantic")
if pydantic_version:
    print(f"pydantic=={pydantic_version}")

# Pydantic declares the exact compatible pydantic-core version.
for req in dependencies("pydantic"):
    if req.lower().startswith("pydantic-core"):
        req = req.split(";", 1)[0].strip()
        print(req)

# Playwright's pyee requirement is intentionally preserved.
for req in dependencies("playwright"):
    if req.lower().startswith("pyee"):
        req = req.split(";", 1)[0].strip()
        print(req)

# Preserve SymPy's declared mpmath requirement where available.
for req in dependencies("sympy"):
    if req.lower().startswith("mpmath"):
        req = req.split(";", 1)[0].strip()
        print(req)
PYEOF
fi

# Fallbacks for the environment that originally produced the conflicts.
printf 'pyee>=13,<14\n' >> "$CONSTRAINTS_FILE"
printf 'mpmath>=1.1.0,<1.4\n' >> "$CONSTRAINTS_FILE"

awk 'NF && !seen[$0]++' "$CONSTRAINTS_FILE" > "${CONSTRAINTS_FILE}.tmp"
mv "${CONSTRAINTS_FILE}.tmp" "$CONSTRAINTS_FILE"

printf '   Active compatibility constraints:\n'
sed 's/^/      • /' "$CONSTRAINTS_FILE"

success "Dependency constraints prepared"

# ─────────────────────────────────────────────────────────────────────────────
# 7. Move the old environment aside and create the new one
# ─────────────────────────────────────────────────────────────────────────────

info "Creating a fresh virtual environment at $VENV_PATH..."

CREATED_NEW=1

if [ "$OLD_EXISTS" -eq 1 ]; then
    OLD_BACKUP="${VENV_PATH}.old-$$"
    mv "$VENV_PATH" "$OLD_BACKUP"
    success "Old environment set aside (kept until the new one is verified)"
fi

"$BASE_PYTHON" -m venv "$VENV_PATH" ||
    fail "Could not create the virtual environment. On Debian/Ubuntu try: sudo apt install python3-venv"

PYTHON="$VENV_PATH/bin/python"

printf '   Python executable:    %s\n' "$PYTHON"
printf '   Python version:      '
"$PYTHON" --version

if [ "$OLD_OK" -eq 1 ]; then
    OLD_MM=$("$OLD_BACKUP/bin/python" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || true)
    NEW_MM=$("$PYTHON" -c 'import sys; print("%d.%d" % sys.version_info[:2])')
    if [ -n "$OLD_MM" ] && [ "$OLD_MM" != "$NEW_MM" ]; then
        warn "Python changed from $OLD_MM to $NEW_MM. Packages will be installed for $NEW_MM."
    fi
fi

# From this point onward EVERY pip operation uses this exact Python.
pip_cmd() {
    "$PYTHON" -m pip "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
# 8. Upgrade pip + packaging
# ─────────────────────────────────────────────────────────────────────────────

info "Upgrading pip + packaging..."

pip_cmd install \
    -q \
    --upgrade \
    pip \
    packaging

PIP_VERSION=$(pip_cmd --version | awk '{print $2}')

success "pip $PIP_VERSION ready"

# ─────────────────────────────────────────────────────────────────────────────
# 9. Install the packages fresh
# ─────────────────────────────────────────────────────────────────────────────

INSTALL_OK=1

if [ -s "$PACKAGES_FILE" ]; then
    INSTALL_OK=0

    if [ "${PIN_VERSIONS:-0}" = "1" ] && [ -s "$FREEZE_FILE" ]; then
        info "Reinstalling the exact versions from the old environment..."

        if pip_cmd install -r "$FREEZE_FILE"; then
            INSTALL_OK=1
        fi
    else
        info "Installing packages fresh (newest versions that fit the constraints)..."

        if pip_cmd install --constraint "$CONSTRAINTS_FILE" -r "$PACKAGES_FILE"; then
            INSTALL_OK=1
        elif [ -s "$FREEZE_FILE" ]; then
            warn "The newest versions couldn't be installed together."
            info "Falling back to the exact versions from the old environment..."

            if pip_cmd install -r "$FREEZE_FILE"; then
                INSTALL_OK=1
            fi
        fi
    fi
elif [ "$OLD_OK" -eq 0 ] && [ -f "$REPO_ROOT/requirements.txt" ]; then
    INSTALL_OK=0

    info "Installing from $REPO_ROOT/requirements.txt..."

    if pip_cmd install --constraint "$CONSTRAINTS_FILE" -r "$REPO_ROOT/requirements.txt"; then
        INSTALL_OK=1
    fi
fi

if [ "$INSTALL_OK" -ne 1 ]; then
    fail "Could not reinstall the packages."
fi

success "Packages installed"

# Core packages required by the sanity check (no-ops if they are already installed).
info "Making sure the core math packages are present..."

pip_cmd install \
    -q \
    --constraint "$CONSTRAINTS_FILE" \
    sympy \
    mpmath

success "Core packages ready"

# ─────────────────────────────────────────────────────────────────────────────
# 10. Verify dependency tree
# ─────────────────────────────────────────────────────────────────────────────

info "Verifying environment..."

set +e
pip_cmd check > "$CHECK_FILE" 2>&1
CHECK_STATUS=$?
set -e

if [ "$CHECK_STATUS" -ne 0 ]; then
    warn "Dependency conflicts detected:"
    printf '%s\n' "────────────────────────────────────────────────────────"
    cat "$CHECK_FILE"
    printf '%s\n' "────────────────────────────────────────────────────────"

    info "Attempting automatic dependency repair..."

    set +e
    pip_cmd install \
        -q \
        --constraint "$CONSTRAINTS_FILE" \
        pydantic \
        pydantic-core \
        "pyee>=13,<14" \
        "mpmath>=1.1.0,<1.4"
    set -e

    info "Running dependency check again..."

    set +e
    pip_cmd check
    RECHECK_STATUS=$?
    set -e

    if [ "$RECHECK_STATUS" -ne 0 ]; then
        fail "Dependencies are still broken."
    fi

    success "Dependency repair succeeded."
else
    success "Dependency verification passed — no broken requirements found."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. Sanity check — this decides whether the rebuild is kept
# ─────────────────────────────────────────────────────────────────────────────

info "Sanity check..."

"$PYTHON" - <<'PYEOF'
import sys

mods = [
    ("sympy", "sympy"),
    ("mpmath", "mpmath"),
]

failed = False

for label, mod in mods:
    try:
        module = __import__(mod)
        version = getattr(module, "__version__", "?")
        print(f"    {label:8} {version} ✅")
    except Exception as exc:
        print(f"    {label:8} ❌ {exc}")
        failed = True

if failed:
    sys.exit(1)
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# 12. Commit: the new environment works, so the old one can go
# ─────────────────────────────────────────────────────────────────────────────

SUCCESS=1

if [ -n "$OLD_BACKUP" ] && [ -d "$OLD_BACKUP" ]; then
    rm -rf "$OLD_BACKUP"
    success "Old environment removed"
fi

success "Fresh $VENV_PATH is ready"

# ─────────────────────────────────────────────────────────────────────────────
# 13. Vendor independent latest mpmath
# ─────────────────────────────────────────────────────────────────────────────

VENDOR_DIR="$REPO_ROOT/_vendor_mpmath"

info "Vendoring latest mpmath → $VENDOR_DIR..."

rm -rf "$VENDOR_DIR"

if pip_cmd install \
    mpmath \
    --target="$VENDOR_DIR" \
    --no-deps \
    -q
then
    if [ -d "$VENDOR_DIR/mpmath" ]; then
        rm -rf "$VENDOR_DIR/mpmath14"

        mv \
            "$VENDOR_DIR/mpmath" \
            "$VENDOR_DIR/mpmath14"

        success "Vendored mpmath copy created"
    else
        warn "Could not create vendored mpmath copy"
    fi
else
    warn "Could not download mpmath for vendoring"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 14. Optional math source repositories
# ─────────────────────────────────────────────────────────────────────────────

DLREPOS="${SYNC_MATH_REPOS:-}"

if [ -z "$DLREPOS" ]; then
    printf '\n📦  Download/update math library source repos?\n'
    printf '   Shallow clones are used and .git/readme files are removed afterwards.\n'
    printf '\n   Clone math repos now? [y/N] → '

    read -r DLREPOS </dev/tty || DLREPOS=""
fi

case "$DLREPOS" in
    y|Y)
        if ! command -v git >/dev/null 2>&1; then
            warn "git not found — skipping math source sync"
        else
            while IFS='|' read -r NAME URL; do
                [ -z "$NAME" ] && continue

                DEST="$MATH_MODULES_DIR/$NAME"

                rm -rf "$DEST"

                printf '   ↓  %s  %s\n' "$NAME" "$URL"

                if git clone \
                    --depth=1 \
                    --single-branch \
                    -q \
                    "$URL" \
                    "$DEST" 2>/dev/null
                then
                    rm -rf "$DEST/.git"

                    find "$DEST" \
                        -type f \
                        -name ".gitignore" \
                        -delete \
                        2>/dev/null || true

                    find "$DEST" \
                        -type f \
                        -iname "readme*" \
                        -delete \
                        2>/dev/null || true

                    success "$NAME synced"
                else
                    rm -rf "$DEST" 2>/dev/null || true
                    warn "Failed: $NAME"
                fi

            done <<'MATH_REPOS'
precision|https://github.com/fredrik-johansson/arb
algebra|https://codeberg.org/ginac/cln
symbolic|https://github.com/fricas/fricas
geometry|https://codeberg.org/ginac/ginac
integers|https://github.com/asheplyakov/gmp
matrices|https://github.com/linbox-team/linbox
floats|https://gitlab.inria.fr/mpfr/mpfr.git
analysis|https://github.com/mpmath/mpmath
arrays|https://github.com/numpy/numpy
theory|https://pari.math.u-bordeaux.fr/git/pari.git
advanced|https://github.com/sagemath/sage
scientific|https://github.com/scipy/scipy
gaypy|https://github.com/sympy/sympy
MATH_REPOS
        fi
        ;;
    *)
        printf 'Skipped math source sync.\n'
        ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
# 15. Optional AI API / SDK source repositories
# ─────────────────────────────────────────────────────────────────────────────

DLAI="${SYNC_AI_REPOS:-}"

if [ -z "$DLAI" ]; then
    printf '\n🤖  Download/update AI API/SDK source repos?\n'
    printf '   Provider map:\n'
    printf '     openai      → OpenAI Python SDK\n'
    printf '     anthropic   → Anthropic Claude Python SDK\n'
    printf '     gemini      → Google Gen AI Python SDK\n'
    printf '     groq        → Groq Python SDK\n'
    printf '     mistral     → Mistral AI Python SDK\n'
    printf '     xai         → xAI Python SDK (Grok)\n'
    printf '     deepseek    → DeepSeek official harness/SDK source\n'
    printf '     roastedbyai → roastedbyai source used by roast features\n'
    printf '     wolfram     → Wolfram Python client source\n'
    printf '\n   Clone/update AI repos now? [y/N] → '

    read -r DLAI </dev/tty || DLAI=""
fi

case "$DLAI" in
    y|Y)
        if ! command -v git >/dev/null 2>&1; then
            warn "git not found — skipping AI source sync"
        else
            while IFS='|' read -r NAME URL; do
                [ -z "$NAME" ] && continue

                DEST="$AI_MODULES_DIR/$NAME"

                rm -rf "$DEST"

                printf '   ↓  %s  %s\n' "$NAME" "$URL"

                if git clone \
                    --depth=1 \
                    --single-branch \
                    -q \
                    "$URL" \
                    "$DEST" 2>/dev/null
                then
                    rm -rf "$DEST/.git"

                    find "$DEST" \
                        -type f \
                        -name ".gitignore" \
                        -delete \
                        2>/dev/null || true

                    find "$DEST" \
                        -type f \
                        -iname "readme*" \
                        -delete \
                        2>/dev/null || true

                    success "$NAME synced"
                else
                    rm -rf "$DEST" 2>/dev/null || true
                    warn "Failed: $NAME  ($URL)"
                fi

            done <<'AI_REPOS'
openai|https://github.com/openai/openai-python
anthropic|https://github.com/anthropics/anthropic-sdk-python
gemini|https://github.com/googleapis/python-genai
groq|https://github.com/groq/groq-python
mistral|https://github.com/mistralai/client-python
xai|https://github.com/xai-org/xai-sdk-python
deepseek|https://github.com/deepseek-ai/deepseek-harness
roastedbyai|https://github.com/jvherck/roastedbyai
wolfram|https://github.com/WolframResearch/WolframClientForPython
AI_REPOS
        fi

        cat > "$AI_MODULES_DIR/provider-manifest.json" <<'JSON'
{
  "providers": {
    "openai":   { "source": "openai", "api_style": "native" },
    "claude":   { "source": "anthropic", "api_style": "native" },
    "gemini":   { "source": "gemini", "api_style": "native" },
    "groq":     { "source": "groq", "api_style": "native" },
    "mistral":  { "source": "mistral", "api_style": "native" },
    "grok":     { "source": "xai", "api_style": "native" },
    "deepseek": { "source": "deepseek", "api_style": "openai-compatible" }
  }
}
JSON

        success "AI provider manifest written → $AI_MODULES_DIR/provider-manifest.json"
        ;;
    *)
        printf 'Skipped AI source sync.\n'
        ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
# 16. Final dependency report
# ─────────────────────────────────────────────────────────────────────────────

info "Final dependency report..."

set +e
FINAL_REPORT=$(pip_cmd check 2>&1)
FINAL_REPORT_STATUS=$?
set -e

if [ "$FINAL_REPORT_STATUS" -eq 0 ]; then
    success "pip check: No broken requirements found."
else
    warn "pip check found remaining problems:"
    printf '%s\n' "────────────────────────────────────────────────────────"
    printf '%s\n' "$FINAL_REPORT"
    printf '%s\n' "────────────────────────────────────────────────────────"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 17. Finish
# ─────────────────────────────────────────────────────────────────────────────

printf '\n✅ nuke_restart finished — fresh environment + optional source sync complete.\n'
printf '   Repository: %s\n' "$REPO_ROOT"
printf '   Virtual environment: %s\n' "$VENV_PATH"
printf '   Python:     %s\n' "$PYTHON"
