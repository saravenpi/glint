#!/usr/bin/env bash
set -euo pipefail

unset REPO_URL INSTALL_DIR BIN_DIR WRAPPER CONF_FILE
REPO_URL=${REPO_URL:-"https://github.com/saravenpi/glint.git"}
INSTALL_DIR=${INSTALL_DIR:-"$HOME/.glint-src"}
BIN_DIR=${BIN_DIR:-"$HOME/.local/bin"}
WRAPPER="$BIN_DIR/glint"
CONF_FILE="$HOME/.glint.conf"

log()  { printf "\e[1;32m[glint]\e[0m %s\n" "$*"; }
err()  { printf "\e[1;31m[glint]\e[0m %s\n" "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null || err "command '$1' required"; }

if [ "$(id -u)" = 0 ]; then
  BIN_DIR="/usr/local/bin"
  log "Root installation detected (BIN_DIR=$BIN_DIR)"
fi

mkdir -p "$BIN_DIR"

if ! command -v bun >/dev/null; then
  log "Bun not found → installing..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
need bun

if [ -d "$INSTALL_DIR/.git" ]; then
  log "Source found → updating"
  git -C "$INSTALL_DIR" pull --ff-only
else
  log "Cloning $REPO_URL into $INSTALL_DIR"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

log "Installing dependencies with Bun"
(cd "$INSTALL_DIR" && bun install)

cat <<'EOS' >"$WRAPPER"
#!/usr/bin/env bash
export PATH="$HOME/.bun/bin:$PATH"
exec bun run "$HOME/.glint-src/src/index.ts" "$@"
EOS
chmod +x "$WRAPPER"
log "CLI installed at $WRAPPER"

if [ ! -f "$CONF_FILE" ]; then
  cat <<'EOF' >"$CONF_FILE"
{
  "feeds": [
    "https://news.ycombinator.com/rss"
  ],
  "outputDir": "~/glint"
}
EOF
  log "Config file created: $CONF_FILE"
else
  log "Config file already exists: $CONF_FILE (unchanged)"
fi

log "Installation complete 🎉  Add $BIN_DIR to your \$PATH if necessary."
log "Run: glint"
unset REPO_URL INSTALL_DIR BIN_DIR WRAPPER CONF_FILE
