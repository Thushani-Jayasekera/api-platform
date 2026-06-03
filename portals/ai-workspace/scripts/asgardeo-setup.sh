#!/usr/bin/env bash
# =============================================================================
# Asgardeo Full Setup — AI Workspace
# =============================================================================
# Automates every step needed to go from a fresh Asgardeo tenant to a fully
# configured AI Workspace environment:
#
#   1.  Acquire management API token
#   2.  Create (or reuse) the OIDC application with JWT access tokens
#   3.  Configure access-token claim attributes (email, username, firstName,
#       lastName, organization)
#   4.  Create (or reuse) the API Platform API resource with all scopes
#   5.  Authorize the API resource for the application
#   6.  Create roles  (admin / developer / publisher / operator / viewer)
#   7.  Assign scopes to each role
#   8.  Ensure the "organization" OIDC scope exposes org_id
#   9.  Write .env.local  (frontend)  and  env.server  (backend) output files
#
# Prerequisites
#   • jq installed  (brew install jq)
#   • An Asgardeo management application with client_credentials enabled and
#     the Management API authorized.  Minimum required internal scopes:
#       internal_application_mgt_create  internal_application_mgt_view
#       internal_application_mgt_update  internal_api_resource_create
#       internal_api_resource_update     internal_api_resource_view
#       internal_org_role_mgt_create     internal_org_role_mgt_view
#       internal_org_role_mgt_update     internal_org_role_mgt_permissions_update
#       internal_org_role_mgt_groups_update internal_org_role_mgt_users_update
#       internal_oidc_scope_mgt_create   internal_oidc_scope_mgt_update
#       internal_oidc_scope_mgt_view     internal_claim_meta_view
#
# Usage
#   export ASGARDEO_ORG=<tenant-name>           # e.g. "apiplatformtesting"
#   export ASGARDEO_CLIENT_ID=<mgmt-client-id>
#   export ASGARDEO_CLIENT_SECRET=<mgmt-client-secret>
#   # Optional overrides:
#   export PLATFORM_API_URL=https://localhost:3009/api-proxy/api/v1
#   export APP_REDIRECT_BASE=http://localhost:3009
#   export APP_NAME="AI Workspace"
#   bash scripts/asgardeo-setup.sh
# =============================================================================
set -euo pipefail

# ── Dependency check ──────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required — install it with: brew install jq"
  exit 1
fi

# ── Config ────────────────────────────────────────────────────────────────────
TENANT="${ASGARDEO_ORG:-${ASGARDEO_TENANT:-}}"
CLIENT_ID="${ASGARDEO_CLIENT_ID:-}"
CLIENT_SECRET="${ASGARDEO_CLIENT_SECRET:-}"
PLATFORM_API_URL="${PLATFORM_API_URL:-https://localhost:3009/api-proxy/api/v1}"
APP_REDIRECT_BASE="${APP_REDIRECT_BASE:-http://localhost:3009}"
APP_NAME="${APP_NAME:-AI Workspace}"

if [[ -z "$TENANT" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "ERROR: ASGARDEO_ORG, ASGARDEO_CLIENT_ID, and ASGARDEO_CLIENT_SECRET must be set"
  exit 1
fi

BASE="https://api.asgardeo.io/t/${TENANT}"

echo "==================================================================="
echo "  Asgardeo Setup  ·  tenant: ${TENANT}"
echo "==================================================================="

# ── Helpers ───────────────────────────────────────────────────────────────────

# Wraps curl; appends __STATUS__NNN to response so callers can split it.
api_call() {
  local method="$1" url="$2" body="${3:-}"
  local args=(-s -w "\n__STATUS__:%{http_code}"
    -H "Authorization: Bearer ${TOKEN}"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    -X "$method" "$url")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}"
}

get_status() { echo "$1" | grep -o '__STATUS__:[0-9]*' | cut -d: -f2; }
get_body()   { echo "$1" | sed 's/\n*__STATUS__:[0-9]*$//'; }

ok_status() {
  local s="$1"
  [[ "$s" == "200" || "$s" == "201" || "$s" == "204" ]]
}

# ── [1/9] Management token ────────────────────────────────────────────────────
echo ""
echo "▶ [1/9] Fetching management API token ..."

MGMT_SCOPES=(
  internal_application_mgt_create internal_application_mgt_view
  internal_application_mgt_update
  internal_api_resource_create internal_api_resource_update
  internal_api_resource_view
  internal_org_role_mgt_create internal_org_role_mgt_view
  internal_org_role_mgt_update internal_org_role_mgt_permissions_update
  internal_org_role_mgt_groups_update internal_org_role_mgt_users_update
  internal_oidc_scope_mgt_create internal_oidc_scope_mgt_update
  internal_oidc_scope_mgt_view internal_claim_meta_view
  internal_bulk_role_create internal_bulk_role_update internal_bulk_role_delete
  internal_org_bulk_role_create internal_org_bulk_role_update
  internal_org_bulk_role_delete
)
SCOPE_STR="${MGMT_SCOPES[*]}"

TOKEN_RESP=$(curl -s -X POST "${BASE}/oauth2/token" \
  -u "${CLIENT_ID}:${CLIENT_SECRET}" \
  -d "grant_type=client_credentials&scope=${SCOPE_STR}")
TOKEN=$(echo "$TOKEN_RESP" | jq -r '.access_token // empty')
if [[ -z "$TOKEN" ]]; then
  echo "  ✗ Failed to obtain token: $TOKEN_RESP"
  exit 1
fi
echo "  ✓ Token obtained"

# ── [2/9] Create or reuse application ────────────────────────────────────────
echo ""
echo "▶ [2/9] Setting up application '${APP_NAME}' ..."

FILTER=$(python3 -c "import urllib.parse; print(urllib.parse.quote('name eq \"${APP_NAME}\"'))" 2>/dev/null \
  || echo "name+eq+${APP_NAME// /+}")
APPS_RESP=$(curl -s -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  "${BASE}/api/server/v1/applications?filter=${FILTER}")
APP_ID=$(echo "$APPS_RESP" | jq -r '.applications[0].id // empty')

if [[ -n "$APP_ID" ]]; then
  echo "  ℹ Application already exists (id: ${APP_ID})"
else
  APP_CREATE_BODY=$(jq -n \
    --arg name  "$APP_NAME" \
    --arg base  "$APP_REDIRECT_BASE" \
    '{
      name: $name,
      description: "API Platform AI Workspace",
      inboundProtocolConfiguration: {
        oidc: {
          grantTypes: ["authorization_code", "refresh_token"],
          callbackURLs: [($base + "/login"), ($base + "/signin")],
          allowedOrigins: [$base],
          publicClient: false,
          accessToken: {
            type: "JWT",
            userAccessTokenExpiryInSeconds: 3600,
            applicationAccessTokenExpiryInSeconds: 3600
          },
          idToken: { expiryInSeconds: 3600 },
          logout: { postLogoutRedirectURIs: [($base + "/login")] }
        }
      }
    }')

  RESP=$(api_call POST "${BASE}/api/server/v1/applications" "$APP_CREATE_BODY")
  STATUS=$(get_status "$RESP"); BODY=$(get_body "$RESP")
  if ! ok_status "$STATUS"; then
    echo "  ✗ Failed (HTTP $STATUS): $BODY"
    exit 1
  fi
  APP_ID=$(echo "$BODY" | jq -r '.id')
  echo "  ✓ Application created (id: ${APP_ID})"
fi

# Fetch OIDC inbound config to get client ID
OIDC_RESP=$(curl -s -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  "${BASE}/api/server/v1/applications/${APP_ID}/inbound-protocols/oidc")
APP_CLIENT_ID=$(echo "$OIDC_RESP" | jq -r '.clientId // empty')
echo "  ✓ Client ID: ${APP_CLIENT_ID}"

# ── [3/9] Configure claim attributes ─────────────────────────────────────────
echo ""
echo "▶ [3/9] Configuring access-token claim attributes ..."

CLAIM_BODY=$(jq -n '{
  dialect: "LOCAL",
  claimMappings: [
    {localClaim: {uri: "http://wso2.org/claims/emailaddress"}, applicationClaim: "email",      requested: true},
    {localClaim: {uri: "http://wso2.org/claims/username"},     applicationClaim: "username",   requested: true},
    {localClaim: {uri: "http://wso2.org/claims/givenname"},    applicationClaim: "firstName",  requested: true},
    {localClaim: {uri: "http://wso2.org/claims/lastname"},     applicationClaim: "lastName",   requested: true},
    {localClaim: {uri: "http://wso2.org/claims/organization"}, applicationClaim: "organization", requested: true}
  ],
  requestedClaims: [
    {claim: {uri: "http://wso2.org/claims/emailaddress"}, mandatory: false},
    {claim: {uri: "http://wso2.org/claims/username"},     mandatory: false},
    {claim: {uri: "http://wso2.org/claims/givenname"},    mandatory: false},
    {claim: {uri: "http://wso2.org/claims/lastname"},     mandatory: false},
    {claim: {uri: "http://wso2.org/claims/organization"}, mandatory: false}
  ]
}')

RESP=$(api_call PUT "${BASE}/api/server/v1/applications/${APP_ID}/claim-configuration" "$CLAIM_BODY")
STATUS=$(get_status "$RESP")
if ok_status "$STATUS"; then
  echo "  ✓ Claim attributes configured"
else
  echo "  ⚠ HTTP $STATUS — claim config may need manual adjustment"
  echo "  $(get_body "$RESP" | jq -r '.description // .')"
fi

# ── [4/9] All scopes list — mirrors SCOPES in src/auth/permissions.ts ────────
ALL_SCOPES=(
  # Projects
  "api-platform:project:read"           "api-platform:project:create"
  "api-platform:project:update"         "api-platform:project:delete"
  "api-platform:project:manage"
  # Applications
  "api-platform:application:read"       "api-platform:application:create"
  "api-platform:application:update"     "api-platform:application:delete"
  "api-platform:application:manage"
  "api-platform:application:api_key:read"    "api-platform:application:api_key:create"
  "api-platform:application:api_key:delete"  "api-platform:application:api_key:manage"
  "api-platform:application:associations:read"    "api-platform:application:associations:create"
  "api-platform:application:associations:delete"  "api-platform:application:associations:manage"
  "api-platform:application:associations:api_key:read"
  # AI Gateways
  "api-platform:gateway:read"           "api-platform:gateway:create"
  "api-platform:gateway:update"         "api-platform:gateway:delete"
  "api-platform:gateway:manage"
  "api-platform:gateway:token:read"     "api-platform:gateway:token:create"
  "api-platform:gateway:token:delete"   "api-platform:gateway:token:manage"
  "api-platform:gateway:policy:read"    "api-platform:gateway:policy:create"
  "api-platform:gateway:policy:delete"  "api-platform:gateway:policy:manage"
  "api-platform:gateway:artifacts:read" "api-platform:gateway:manifest:read"
  "api-platform:gateway:status:read"
  # LLM Providers
  "api-platform:llm_provider:read"      "api-platform:llm_provider:create"
  "api-platform:llm_provider:update"    "api-platform:llm_provider:delete"
  "api-platform:llm_provider:manage"
  "api-platform:llm_provider:api_key:read"    "api-platform:llm_provider:api_key:create"
  "api-platform:llm_provider:api_key:delete"  "api-platform:llm_provider:api_key:manage"
  "api-platform:llm_provider:deployment:read"    "api-platform:llm_provider:deployment:create"
  "api-platform:llm_provider:deployment:delete"  "api-platform:llm_provider:deployment:manage"
  "api-platform:llm_provider:deployment:restore" "api-platform:llm_provider:deployment:undeploy"
  # LLM Proxies
  "api-platform:llm_proxy:read"         "api-platform:llm_proxy:create"
  "api-platform:llm_proxy:update"       "api-platform:llm_proxy:delete"
  "api-platform:llm_proxy:manage"
  "api-platform:llm_proxy:api_key:read"    "api-platform:llm_proxy:api_key:create"
  "api-platform:llm_proxy:api_key:delete"  "api-platform:llm_proxy:api_key:manage"
  "api-platform:llm_proxy:deployment:read"    "api-platform:llm_proxy:deployment:create"
  "api-platform:llm_proxy:deployment:delete"  "api-platform:llm_proxy:deployment:manage"
  "api-platform:llm_proxy:deployment:restore" "api-platform:llm_proxy:deployment:undeploy"
  # LLM Templates
  "api-platform:llm_template:read"      "api-platform:llm_template:create"
  "api-platform:llm_template:update"    "api-platform:llm_template:delete"
  "api-platform:llm_template:manage"
  # MCP Proxies
  "api-platform:mcp_proxy:read"         "api-platform:mcp_proxy:create"
  "api-platform:mcp_proxy:update"       "api-platform:mcp_proxy:delete"
  "api-platform:mcp_proxy:manage"
  "api-platform:mcp_proxy:deployment:read"    "api-platform:mcp_proxy:deployment:create"
  "api-platform:mcp_proxy:deployment:delete"  "api-platform:mcp_proxy:deployment:manage"
  "api-platform:mcp_proxy:deployment:restore" "api-platform:mcp_proxy:deployment:undeploy"
  # DevPortals
  "api-platform:devportal:read"         "api-platform:devportal:create"
  "api-platform:devportal:update"       "api-platform:devportal:delete"
  "api-platform:devportal:manage"
  # Subscriptions
  "api-platform:subscription:read"      "api-platform:subscription:create"
  "api-platform:subscription:update"    "api-platform:subscription:delete"
  "api-platform:subscription:manage"
  "api-platform:subscription_plan:read"   "api-platform:subscription_plan:create"
  "api-platform:subscription_plan:update" "api-platform:subscription_plan:delete"
  "api-platform:subscription_plan:manage"
  # REST APIs
  "api-platform:rest_api:read"          "api-platform:rest_api:create"
  "api-platform:rest_api:update"        "api-platform:rest_api:delete"
  "api-platform:rest_api:manage"        "api-platform:rest_api:publish"
  "api-platform:rest_api:import"
  "api-platform:rest_api:api_key:read"    "api-platform:rest_api:api_key:create"
  "api-platform:rest_api:api_key:update"  "api-platform:rest_api:api_key:delete"
  "api-platform:rest_api:api_key:manage"
  "api-platform:rest_api:gateway:read"    "api-platform:rest_api:gateway:create"
  "api-platform:rest_api:gateway:manage"
  "api-platform:rest_api:deployment:read"    "api-platform:rest_api:deployment:create"
  "api-platform:rest_api:deployment:delete"  "api-platform:rest_api:deployment:manage"
  "api-platform:rest_api:deployment:restore" "api-platform:rest_api:deployment:undeploy"
  # WebSub APIs
  "api-platform:websub_api:read"        "api-platform:websub_api:create"
  "api-platform:websub_api:update"      "api-platform:websub_api:delete"
  "api-platform:websub_api:manage"      "api-platform:websub_api:publish"
  "api-platform:websub_api:api_key:create"  "api-platform:websub_api:api_key:update"
  "api-platform:websub_api:api_key:delete"  "api-platform:websub_api:api_key:manage"
  "api-platform:websub_api:deployment:read"    "api-platform:websub_api:deployment:create"
  "api-platform:websub_api:deployment:delete"  "api-platform:websub_api:deployment:manage"
  "api-platform:websub_api:deployment:restore" "api-platform:websub_api:deployment:undeploy"
  # WebBroker APIs
  "api-platform:webbroker_api:read"     "api-platform:webbroker_api:create"
  "api-platform:webbroker_api:update"   "api-platform:webbroker_api:delete"
  "api-platform:webbroker_api:manage"   "api-platform:webbroker_api:publish"
  "api-platform:webbroker_api:api_key:create"  "api-platform:webbroker_api:api_key:update"
  "api-platform:webbroker_api:api_key:delete"  "api-platform:webbroker_api:api_key:manage"
  "api-platform:webbroker_api:deployment:read"    "api-platform:webbroker_api:deployment:create"
  "api-platform:webbroker_api:deployment:delete"  "api-platform:webbroker_api:deployment:manage"
  "api-platform:webbroker_api:deployment:restore" "api-platform:webbroker_api:deployment:undeploy"
  # Git
  "api-platform:git:read"
)

# Build JSON array of scope objects  {name, displayName, description}
SCOPES_JSON=$(printf '%s\n' "${ALL_SCOPES[@]}" \
  | jq -R '{
      name: .,
      displayName: (
        . | gsub("api-platform:"; "")
          | gsub("[_:]"; " ")
          | split(" ")
          | map(if . != "" then (.[0:1] | ascii_upcase) + .[1:] else . end)
          | join("")
      ),
      description: ""
    }' \
  | jq -s '.')

# ── [5/9] Create or reuse API resource ───────────────────────────────────────
echo ""
echo "▶ [4/9] Setting up API resource (identifier: ${PLATFORM_API_URL}) ..."

RES_LIST=$(curl -s -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  "${BASE}/api/server/v1/api-resources?attributes=id,identifier,name&limit=50")
RESOURCE_ID=$(echo "$RES_LIST" \
  | jq -r --arg id "$PLATFORM_API_URL" \
    '.apiResources[] | select(.identifier == $id) | .id' 2>/dev/null | head -1 || true)

if [[ -n "$RESOURCE_ID" ]]; then
  echo "  ℹ API resource already exists (id: ${RESOURCE_ID}) — updating scopes ..."
  PATCH_BODY=$(jq -n --argjson scopes "$SCOPES_JSON" '{addedScopes: $scopes}')
  RESP=$(api_call PATCH "${BASE}/api/server/v1/api-resources/${RESOURCE_ID}" "$PATCH_BODY")
  STATUS=$(get_status "$RESP")
  if ok_status "$STATUS"; then
    echo "  ✓ Scopes updated (${#ALL_SCOPES[@]} scopes)"
  else
    echo "  ⚠ Scope update HTTP $STATUS: $(get_body "$RESP" | jq -r '.description // .')"
  fi
else
  RES_BODY=$(jq -n \
    --arg name "API Platform" \
    --arg ident "$PLATFORM_API_URL" \
    --argjson scopes "$SCOPES_JSON" \
    '{
      name: $name,
      identifier: $ident,
      description: "API Platform management API",
      requiresAuthorization: true,
      scopes: $scopes
    }')

  RESP=$(api_call POST "${BASE}/api/server/v1/api-resources" "$RES_BODY")
  STATUS=$(get_status "$RESP"); BODY=$(get_body "$RESP")
  if ! ok_status "$STATUS"; then
    echo "  ✗ Failed (HTTP $STATUS): $BODY"
    exit 1
  fi
  RESOURCE_ID=$(echo "$BODY" | jq -r '.id')
  echo "  ✓ API resource created (id: ${RESOURCE_ID}, ${#ALL_SCOPES[@]} scopes)"
fi

# ── [6/9] Authorize API resource for the application ─────────────────────────
echo ""
echo "▶ [5/9] Authorizing API resource for the application ..."

SCOPE_NAMES_JSON=$(printf '%s\n' "${ALL_SCOPES[@]}" | jq -R '.' | jq -s '.')
AUTH_BODY=$(jq -n \
  --arg id "$RESOURCE_ID" \
  --argjson scopes "$SCOPE_NAMES_JSON" \
  '{id: $id, policyIdentifier: "RBAC", scopes: $scopes}')

RESP=$(api_call POST "${BASE}/api/server/v1/applications/${APP_ID}/authorized-apis" "$AUTH_BODY")
STATUS=$(get_status "$RESP")
if ok_status "$STATUS"; then
  echo "  ✓ API resource authorized"
elif [[ "$STATUS" == "409" ]]; then
  echo "  ℹ Already authorized — updating scope list ..."
  UPD_BODY=$(jq -n --argjson scopes "$SCOPE_NAMES_JSON" \
    '{policyIdentifier: "RBAC", scopes: $scopes}')
  RESP=$(api_call PUT \
    "${BASE}/api/server/v1/applications/${APP_ID}/authorized-apis/${RESOURCE_ID}" \
    "$UPD_BODY")
  STATUS=$(get_status "$RESP")
  if ok_status "$STATUS"; then echo "  ✓ Authorization updated"
  else echo "  ⚠ Update HTTP $STATUS: $(get_body "$RESP" | jq -r '.description // .')"; fi
else
  echo "  ⚠ HTTP $STATUS: $(get_body "$RESP" | jq -r '.description // .')"
fi

# ── [7/9] Create roles ────────────────────────────────────────────────────────
echo ""
echo "▶ [6/9] Setting up roles ..."

declare -A ROLE_IDS

create_or_get_role() {
  local name="$1"
  local resp id
  resp=$(curl -s -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
    "${BASE}/scim2/v2/Roles?filter=displayName+eq+${name}")
  id=$(echo "$resp" | jq -r '.Resources[0].id // empty')
  if [[ -n "$id" ]]; then echo "$id"; return; fi

  local body
  body=$(jq -n --arg n "$name" '{
    displayName: $n,
    schemas: ["urn:ietf:params:scim:schemas:extension:2.0:Role"],
    audience: {value: "organization", type: "organization"}
  }')
  resp=$(api_call POST "${BASE}/scim2/v2/Roles" "$body")
  local s
  s=$(get_status "$resp")
  if [[ "$s" == "201" ]]; then
    get_body "$resp" | jq -r '.id'
  else
    echo ""
  fi
}

for ROLE_NAME in admin developer publisher operator viewer; do
  RID=$(create_or_get_role "$ROLE_NAME")
  if [[ -n "$RID" ]]; then
    ROLE_IDS["$ROLE_NAME"]="$RID"
    echo "  ✓ Role '${ROLE_NAME}' ready (id: ${RID})"
  else
    echo "  ✗ Could not create/find role '${ROLE_NAME}'"
  fi
done

# ── [8/9] Assign scopes to roles ─────────────────────────────────────────────
echo ""
echo "▶ [7/9] Assigning scopes to roles ..."

# Build a SCIM2 PatchOp permissions body from an array of scope strings
permissions_patch() {
  printf '%s\n' "$@" \
    | jq -R '{value: .}' \
    | jq -s '{
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [{op: "replace", path: "permissions", value: .}]
      }'
}

ADMIN_SCOPES=(
  "api-platform:project:manage"
  "api-platform:application:manage"
  "api-platform:application:api_key:manage"
  "api-platform:application:associations:manage"
  "api-platform:gateway:manage"
  "api-platform:gateway:token:manage"
  "api-platform:gateway:policy:manage"
  "api-platform:llm_provider:manage"
  "api-platform:llm_provider:api_key:manage"
  "api-platform:llm_provider:deployment:manage"
  "api-platform:llm_proxy:manage"
  "api-platform:llm_proxy:api_key:manage"
  "api-platform:llm_proxy:deployment:manage"
  "api-platform:llm_template:manage"
  "api-platform:mcp_proxy:manage"
  "api-platform:mcp_proxy:deployment:manage"
  "api-platform:devportal:manage"
  "api-platform:subscription:manage"
  "api-platform:subscription_plan:manage"
  "api-platform:rest_api:manage"
  "api-platform:rest_api:deployment:manage"
  "api-platform:websub_api:manage"
  "api-platform:websub_api:deployment:manage"
  "api-platform:webbroker_api:manage"
  "api-platform:webbroker_api:deployment:manage"
  "api-platform:git:read"
)

DEVELOPER_SCOPES=(
  "api-platform:project:manage"
  "api-platform:application:manage"
  "api-platform:application:api_key:manage"
  "api-platform:application:associations:manage"
  "api-platform:llm_provider:manage"
  "api-platform:llm_provider:api_key:manage"
  "api-platform:llm_provider:deployment:manage"
  "api-platform:llm_proxy:manage"
  "api-platform:llm_proxy:api_key:manage"
  "api-platform:llm_proxy:deployment:manage"
  "api-platform:llm_template:manage"
  "api-platform:mcp_proxy:manage"
  "api-platform:mcp_proxy:deployment:manage"
  "api-platform:rest_api:manage"
  "api-platform:rest_api:deployment:manage"
  "api-platform:websub_api:manage"
  "api-platform:websub_api:deployment:manage"
  "api-platform:webbroker_api:manage"
  "api-platform:webbroker_api:deployment:manage"
  "api-platform:git:read"
)

PUBLISHER_SCOPES=(
  "api-platform:project:read"
  "api-platform:application:read"
  "api-platform:llm_provider:read"
  "api-platform:llm_proxy:read"
  "api-platform:mcp_proxy:read"
  "api-platform:rest_api:read"
  "api-platform:rest_api:publish"
  "api-platform:devportal:manage"
  "api-platform:subscription:read"
  "api-platform:websub_api:read"
  "api-platform:websub_api:publish"
  "api-platform:webbroker_api:read"
  "api-platform:webbroker_api:publish"
)

OPERATOR_SCOPES=(
  "api-platform:project:read"
  "api-platform:gateway:manage"
  "api-platform:gateway:token:manage"
  "api-platform:gateway:policy:read"
  "api-platform:llm_provider:read"
  "api-platform:llm_provider:deployment:manage"
  "api-platform:llm_proxy:read"
  "api-platform:llm_proxy:deployment:manage"
  "api-platform:mcp_proxy:read"
  "api-platform:mcp_proxy:deployment:manage"
  "api-platform:rest_api:read"
  "api-platform:rest_api:deployment:manage"
  "api-platform:websub_api:read"
  "api-platform:websub_api:deployment:manage"
  "api-platform:webbroker_api:read"
  "api-platform:webbroker_api:deployment:manage"
)

VIEWER_SCOPES=(
  "api-platform:project:read"
  "api-platform:application:read"
  "api-platform:application:api_key:read"
  "api-platform:application:associations:read"
  "api-platform:gateway:read"
  "api-platform:gateway:token:read"
  "api-platform:gateway:policy:read"
  "api-platform:llm_provider:read"
  "api-platform:llm_proxy:read"
  "api-platform:llm_template:read"
  "api-platform:mcp_proxy:read"
  "api-platform:devportal:read"
  "api-platform:subscription:read"
  "api-platform:subscription_plan:read"
  "api-platform:rest_api:read"
  "api-platform:websub_api:read"
  "api-platform:webbroker_api:read"
)

for ROLE_NAME in admin developer publisher operator viewer; do
  RID="${ROLE_IDS[$ROLE_NAME]:-}"
  if [[ -z "$RID" ]]; then
    echo "  ⚠ Skipping '${ROLE_NAME}' — role ID not available"
    continue
  fi

  case "$ROLE_NAME" in
    admin)     eval "ROLE_SCOPES=(\"\${ADMIN_SCOPES[@]}\")" ;;
    developer) eval "ROLE_SCOPES=(\"\${DEVELOPER_SCOPES[@]}\")" ;;
    publisher) eval "ROLE_SCOPES=(\"\${PUBLISHER_SCOPES[@]}\")" ;;
    operator)  eval "ROLE_SCOPES=(\"\${OPERATOR_SCOPES[@]}\")" ;;
    viewer)    eval "ROLE_SCOPES=(\"\${VIEWER_SCOPES[@]}\")" ;;
  esac

  PATCH=$(permissions_patch "${ROLE_SCOPES[@]}")
  RESP=$(api_call PATCH "${BASE}/scim2/v2/Roles/${RID}" "$PATCH")
  STATUS=$(get_status "$RESP")
  if ok_status "$STATUS"; then
    echo "  ✓ Scopes assigned to '${ROLE_NAME}' (${#ROLE_SCOPES[@]} scopes)"
  else
    echo "  ✗ Failed for '${ROLE_NAME}' (HTTP $STATUS): $(get_body "$RESP" | jq -r '.detail // .')"
  fi
done

# ── [9/9] Ensure "organization" OIDC scope exposes org_id ────────────────────
echo ""
echo "▶ [8/9] Ensuring 'organization' OIDC scope ..."

SCOPE_CHECK=$(curl -s -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  "${BASE}/api/server/v1/oidc/scopes/organization" 2>/dev/null || echo '{}')
SCOPE_EXISTS=$(echo "$SCOPE_CHECK" | jq -r '.name // empty')

ORG_SCOPE_BODY=$(jq -n '{
  name: "organization",
  displayName: "Organization",
  description: "Organization identity claims",
  claims: ["org_id", "org_name"]
}')

if [[ -n "$SCOPE_EXISTS" ]]; then
  echo "  ℹ Scope already exists — ensuring org_id and org_name claims are included ..."
  RESP=$(api_call PUT "${BASE}/api/server/v1/oidc/scopes/organization" "$ORG_SCOPE_BODY")
  STATUS=$(get_status "$RESP")
  if ok_status "$STATUS"; then echo "  ✓ Scope updated"
  else echo "  ⚠ HTTP $STATUS: $(get_body "$RESP" | jq -r '.description // .')"; fi
else
  RESP=$(api_call POST "${BASE}/api/server/v1/oidc/scopes" "$ORG_SCOPE_BODY")
  STATUS=$(get_status "$RESP")
  if ok_status "$STATUS"; then echo "  ✓ Scope created"
  else echo "  ⚠ HTTP $STATUS: $(get_body "$RESP" | jq -r '.description // .')"; fi
fi

# ── [9/9] Write env files ─────────────────────────────────────────────────────
echo ""
echo "▶ [9/9] Writing env files ..."

OIDC_SCOPE_STR="openid profile email organization api-platform:project:read api-platform:project:create api-platform:project:update api-platform:project:delete api-platform:project:manage api-platform:application:read api-platform:application:create api-platform:application:update api-platform:application:delete api-platform:application:manage api-platform:application:api_key:read api-platform:application:api_key:create api-platform:application:api_key:delete api-platform:application:api_key:manage api-platform:application:associations:read api-platform:application:associations:create api-platform:application:associations:delete api-platform:application:associations:manage api-platform:application:associations:api_key:read api-platform:gateway:read api-platform:gateway:create api-platform:gateway:update api-platform:gateway:delete api-platform:gateway:manage api-platform:gateway:token:read api-platform:gateway:token:create api-platform:gateway:token:delete api-platform:gateway:token:manage api-platform:gateway:policy:read api-platform:gateway:policy:create api-platform:gateway:policy:delete api-platform:gateway:policy:manage api-platform:gateway:artifacts:read api-platform:gateway:manifest:read api-platform:gateway:status:read api-platform:llm_provider:read api-platform:llm_provider:create api-platform:llm_provider:update api-platform:llm_provider:delete api-platform:llm_provider:manage api-platform:llm_provider:api_key:read api-platform:llm_provider:api_key:create api-platform:llm_provider:api_key:delete api-platform:llm_provider:api_key:manage api-platform:llm_provider:deployment:read api-platform:llm_provider:deployment:create api-platform:llm_provider:deployment:delete api-platform:llm_provider:deployment:manage api-platform:llm_provider:deployment:restore api-platform:llm_provider:deployment:undeploy api-platform:llm_proxy:read api-platform:llm_proxy:create api-platform:llm_proxy:update api-platform:llm_proxy:delete api-platform:llm_proxy:manage api-platform:llm_proxy:api_key:read api-platform:llm_proxy:api_key:create api-platform:llm_proxy:api_key:delete api-platform:llm_proxy:api_key:manage api-platform:llm_proxy:deployment:read api-platform:llm_proxy:deployment:create api-platform:llm_proxy:deployment:delete api-platform:llm_proxy:deployment:manage api-platform:llm_proxy:deployment:restore api-platform:llm_proxy:deployment:undeploy api-platform:llm_template:read api-platform:llm_template:create api-platform:llm_template:update api-platform:llm_template:delete api-platform:llm_template:manage api-platform:mcp_proxy:read api-platform:mcp_proxy:create api-platform:mcp_proxy:update api-platform:mcp_proxy:delete api-platform:mcp_proxy:manage api-platform:mcp_proxy:deployment:read api-platform:mcp_proxy:deployment:create api-platform:mcp_proxy:deployment:delete api-platform:mcp_proxy:deployment:manage api-platform:mcp_proxy:deployment:restore api-platform:mcp_proxy:deployment:undeploy api-platform:devportal:read api-platform:devportal:create api-platform:devportal:update api-platform:devportal:delete api-platform:devportal:manage api-platform:subscription:read api-platform:subscription:create api-platform:subscription:update api-platform:subscription:delete api-platform:subscription:manage api-platform:subscription_plan:read api-platform:subscription_plan:create api-platform:subscription_plan:update api-platform:subscription_plan:delete api-platform:subscription_plan:manage api-platform:rest_api:read api-platform:rest_api:create api-platform:rest_api:update api-platform:rest_api:delete api-platform:rest_api:manage api-platform:rest_api:publish api-platform:rest_api:import api-platform:rest_api:api_key:read api-platform:rest_api:api_key:create api-platform:rest_api:api_key:update api-platform:rest_api:api_key:delete api-platform:rest_api:api_key:manage api-platform:rest_api:gateway:read api-platform:rest_api:gateway:create api-platform:rest_api:gateway:manage api-platform:rest_api:deployment:read api-platform:rest_api:deployment:create api-platform:rest_api:deployment:delete api-platform:rest_api:deployment:manage api-platform:rest_api:deployment:restore api-platform:rest_api:deployment:undeploy api-platform:websub_api:read api-platform:websub_api:create api-platform:websub_api:update api-platform:websub_api:delete api-platform:websub_api:manage api-platform:websub_api:publish api-platform:websub_api:api_key:create api-platform:websub_api:api_key:update api-platform:websub_api:api_key:delete api-platform:websub_api:api_key:manage api-platform:websub_api:deployment:read api-platform:websub_api:deployment:create api-platform:websub_api:deployment:delete api-platform:websub_api:deployment:manage api-platform:websub_api:deployment:restore api-platform:websub_api:deployment:undeploy api-platform:webbroker_api:read api-platform:webbroker_api:create api-platform:webbroker_api:update api-platform:webbroker_api:delete api-platform:webbroker_api:manage api-platform:webbroker_api:publish api-platform:webbroker_api:api_key:create api-platform:webbroker_api:api_key:update api-platform:webbroker_api:api_key:delete api-platform:webbroker_api:api_key:manage api-platform:webbroker_api:deployment:read api-platform:webbroker_api:deployment:create api-platform:webbroker_api:deployment:delete api-platform:webbroker_api:deployment:manage api-platform:webbroker_api:deployment:restore api-platform:webbroker_api:deployment:undeploy api-platform:git:read"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cat > "${REPO_ROOT}/.env.local" <<EOF
# Generated by scripts/asgardeo-setup.sh — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Tenant: ${TENANT}

VITE_OIDC_AUTHORITY=https://api.asgardeo.io/t/${TENANT}/oauth2/token
VITE_OIDC_CLIENT_ID=${APP_CLIENT_ID}

VITE_OIDC_REDIRECT_URI=${APP_REDIRECT_BASE}/signin
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=${APP_REDIRECT_BASE}/login

VITE_OIDC_SCOPE=${OIDC_SCOPE_STR}

VITE_OIDC_IDP_HINT_PARAM=fidp

VITE_PLATFORM_API_BASE_URL=${APP_REDIRECT_BASE}/api-proxy/api/v1

VITE_PERMISSION_MODE=scope
VITE_DISABLE_AUTH=false
EOF

cat > "${REPO_ROOT}/env.server" <<EOF
# Generated by scripts/asgardeo-setup.sh — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Tenant: ${TENANT}
# Source this or export each variable in your shell / k8s manifest.

export IDP_ENABLED=true
export IDP_JWKS_URL=https://api.asgardeo.io/t/${TENANT}/oauth2/jwks
export EXTERNAL_IDP_ISSUER=https://api.asgardeo.io/t/${TENANT}/oauth2/token
export EXTERNAL_IDP_AUDIENCE=${APP_CLIENT_ID}
export IDP_ORGANIZATION_CLAIM_NAME=org_id
export EXTERNAL_IDP_ORGANIZATION_CLAIM_NAME=org_id
export EXTERNAL_IDP_ROLE_MAPPINGS='admin=admin, developer=developer, publisher=publisher, operator=operator, viewer=viewer'
EOF

echo "  ✓ .env.local   written to ${REPO_ROOT}/.env.local"
echo "  ✓ env.server   written to ${REPO_ROOT}/env.server"

echo ""
echo "==================================================================="
echo "  Setup complete!"
echo ""
echo "  Application : ${APP_NAME}"
echo "  Client ID   : ${APP_CLIENT_ID}"
echo "  Tenant      : ${TENANT}"
echo ""
echo "  Remaining manual steps (Asgardeo console):"
echo "    • Create a group and assign the roles created above"
echo "    • Invite / create users and assign them to the group"
echo "    • Verify 'organization' attribute is enabled for profile"
echo "      display in Manage → Attributes → Attributes"
echo "==================================================================="
