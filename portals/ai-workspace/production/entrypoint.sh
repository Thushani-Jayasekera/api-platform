#!/bin/sh
set -e

echo "Starting AI Workspace with runtime configuration..."

# Ensure runtime directories exist and have correct permissions
mkdir -p /tmp
# Create nginx runtime dirs under /tmp so non-root user can write
mkdir -p /tmp/nginx/cache /tmp/nginx/logs /tmp/nginx/run || true

# Ensure nginx pid exists and is writable
touch /tmp/nginx/nginx.pid
chmod 666 /tmp/nginx/nginx.pid || true

# Try to symlink /var paths to /tmp ones when possible (won't overwrite read-only mounts)
if [ ! -e /var/cache/nginx ] || [ -L /var/cache/nginx ]; then
  ln -sf /tmp/nginx/cache /var/cache/nginx || true
fi
if [ ! -e /var/log/nginx ] || [ -L /var/log/nginx ]; then
  ln -sf /tmp/nginx/logs /var/log/nginx || true
fi
if [ ! -e /var/run/nginx ] || [ -L /var/run/nginx ]; then
  ln -sf /tmp/nginx/run /var/run/nginx || true
fi

# ── app-config.json ────────────────────────────────────────────────────────
# Preferred: mount your own app-config.json at /app/app-config.json.
# Fallback : generate one from VITE_* environment variables so the container
#            can still be configured without a volume mount.

if [ -f /app/app-config.json ]; then
  echo "Using mounted app-config.json"
else
  echo "No app-config.json found — generating from environment variables..."

  AUTH_ENABLED="${VITE_AUTH_ENABLED:-true}"
  DEV_MODE="${VITE_DEV_MODE:-false}"

  IDP_ENABLED="${VITE_IDP_ENABLED:-false}"
  IDP_AUTHORITY="${VITE_OIDC_AUTHORITY:-}"
  IDP_CLIENT_ID="${VITE_OIDC_CLIENT_ID:-}"
  IDP_REDIRECT_URI="${VITE_OIDC_REDIRECT_URI:-}"
  IDP_POST_LOGOUT_URI="${VITE_OIDC_POST_LOGOUT_REDIRECT_URI:-}"
  IDP_END_SESSION="${VITE_OIDC_END_SESSION_ENDPOINT:-}"
  # Scopes: space-separated string → JSON array
  IDP_SCOPE_STR="${VITE_OIDC_SCOPE:-openid profile email}"
  IDP_SCOPES_JSON=$(echo "$IDP_SCOPE_STR" | tr ' ' '\n' | sed 's/^/"/;s/$/"/' | paste -sd ',' | sed 's/^/[/;s/$/]/')

  CLAIM_ORG="${VITE_OIDC_ORG_CLAIM:-organization}"
  CLAIM_USERNAME="${VITE_OIDC_USERNAME_CLAIM:-given_name}"
  CLAIM_EMAIL="${VITE_OIDC_EMAIL_CLAIM:-email}"
  CLAIM_ORG_NAME="${VITE_OIDC_ORG_NAME_CLAIM:-org_name}"
  CLAIM_ORG_HANDLE="${VITE_OIDC_ORG_HANDLE_CLAIM:-org_handle}"

  IDP_HINT_PARAM="${VITE_OIDC_IDP_HINT_PARAM:-fidp}"
  SOCIAL_GOOGLE="${VITE_SOCIAL_IDP_GOOGLE:-google}"
  SOCIAL_GITHUB="${VITE_SOCIAL_IDP_GITHUB:-github}"
  SOCIAL_MICROSOFT="${VITE_SOCIAL_IDP_MICROSOFT:-microsoft}"
  SOCIAL_ENTERPRISE="${VITE_SOCIAL_IDP_ENTERPRISE:-EnterpriseIDP}"

  FILE_AUTH_ENABLED="${VITE_FILE_AUTH_ENABLED:-false}"
  FILE_AUTH_ORG_ID="${VITE_DEV_ORG_ID:-}"
  FILE_AUTH_ORG_NAME="${VITE_DEV_ORG_NAME:-}"
  FILE_AUTH_ORG_HANDLE="${VITE_DEV_ORG_HANDLE:-}"

  cat > /app/app-config.json << EOF
{
  "devMode": $DEV_MODE,
  "auth": {
    "enabled": $AUTH_ENABLED,
    "idp": {
      "enabled": $IDP_ENABLED,
      "authority": "$IDP_AUTHORITY",
      "clientId": "$IDP_CLIENT_ID",
      "redirectUri": "$IDP_REDIRECT_URI",
      "postLogoutRedirectUri": "$IDP_POST_LOGOUT_URI",
      "endSessionEndpoint": "$IDP_END_SESSION",
      "scopes": $IDP_SCOPES_JSON,
      "claims": {
        "organization": "$CLAIM_ORG",
        "username": "$CLAIM_USERNAME",
        "email": "$CLAIM_EMAIL",
        "orgName": "$CLAIM_ORG_NAME",
        "orgHandle": "$CLAIM_ORG_HANDLE"
      },
      "idpHints": {
        "param": "$IDP_HINT_PARAM",
        "google": "$SOCIAL_GOOGLE",
        "github": "$SOCIAL_GITHUB",
        "microsoft": "$SOCIAL_MICROSOFT",
        "enterprise": "$SOCIAL_ENTERPRISE"
      }
    },
    "fileBasedAuth": {
      "enabled": $FILE_AUTH_ENABLED,
      "org": {
        "id": "$FILE_AUTH_ORG_ID",
        "name": "$FILE_AUTH_ORG_NAME",
        "handle": "$FILE_AUTH_ORG_HANDLE"
      },
      "users": []
    }
  }
}
EOF

  echo "app-config.json generated from environment variables"
fi

# ── runtime-config.js (legacy flat env injection) ──────────────────────────
echo "Generating runtime-config.js from environment variables..."

cat > /tmp/runtime-config.js << 'EOF_HEADER'
// Runtime Configuration - Generated from environment variables
window.__RUNTIME_CONFIG__ = {
EOF_HEADER

env | grep '^VITE_' | while IFS='=' read -r key value; do
  escaped_value=$(echo "$value" | sed "s/'/\\\\'/g")
  echo "  $key: '$escaped_value'," >> /tmp/runtime-config.js
done

cat >> /tmp/runtime-config.js << 'EOF_FOOTER'
};
console.log('Runtime configuration loaded from environment variables');
console.log('Loaded', Object.keys(window.__RUNTIME_CONFIG__).length, 'configuration values');
EOF_FOOTER

chmod 644 /tmp/runtime-config.js

var_count=$(env | grep -c '^VITE_' || echo "0")
echo "runtime-config.js generated with $var_count VITE_* variables"

# Start nginx in foreground
echo "Starting nginx..."
exec nginx -g "daemon off;"
