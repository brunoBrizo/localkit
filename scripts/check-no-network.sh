#!/bin/sh
# Paste-safe guard for the desktop app. The CSP only covers the webview, so
# this fails if an HTTP client, a TLS stack or a network plugin enters the
# Rust or npm dependencies. Run it with: npm run check:no-network
set -eu

denied='reqwest|hyper|ureq|isahc|attohttpc|curl|surf|h2|quinn|tungstenite|tokio-tungstenite|rustls|native-tls|openssl|tauri-plugin-(http|updater|websocket|upload)'

# Runtime dependencies (build tools excluded) for every desktop target LocalKit
# ships. Not `--target all`: tauri pulls reqwest and rustls for Android and iOS
# only, which LocalKit doesn't build.
targets='x86_64-apple-darwin aarch64-apple-darwin x86_64-pc-windows-msvc aarch64-pc-windows-msvc x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu'
crates=$(for t in $targets; do
  cargo tree --manifest-path src-tauri/Cargo.toml --target "$t" -e normal --prefix none --format '{p}'
done | sort -u)
found=$(printf '%s\n' "$crates" | grep -E "^($denied) v" || true)
plugins=$(grep -oE '"@tauri-apps/plugin-(http|updater|websocket|upload)"' package.json || true)

if [ -n "$found$plugins" ]; then
  echo "Network-capable dependencies found; LocalKit must stay offline:"
  printf '%s\n' "$found" "$plugins" | grep -v '^$'
  exit 1
fi
echo "OK: no network-capable crates or plugins ($(printf '%s\n' "$crates" | wc -l | tr -d ' ') crates checked)."
