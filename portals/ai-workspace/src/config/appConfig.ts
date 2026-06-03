/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { PlatformRole } from '../auth/permissions';

// ── IDP (OIDC) configuration ─────────────────────────────────────────────────

export interface IdpClaimsConfig {
  /** JWT claim that holds the organization UUID. */
  organization: string;
  /** JWT claim for the user's display name. */
  username: string;
  /** JWT claim for the user's email address. */
  email: string;
  /** JWT claim for pre-filling the org registration name field. */
  orgName: string;
  /** JWT claim for pre-filling the org registration handle field. */
  orgHandle: string;
}

export interface IdpHintsConfig {
  /** Query parameter name used to pass a federated IDP hint (e.g. "fidp", "kc_idp_hint"). */
  param: string;
  google: string;
  github: string;
  microsoft: string;
  enterprise: string;
}

export interface TokenExchangeConfig {
  /**
   * When true, the IDP access token is exchanged for a platform-issued org-scoped JWT
   * via POST /auth/token after org selection. When false, the original token is used as-is.
   */
  enabled: boolean;
}

export interface IdpConfig {
  enabled: boolean;
  /** OIDC issuer URL. Discovery happens at {authority}/.well-known/openid-configuration */
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  /** Override the end_session_endpoint when the IdP does not advertise it in discovery. */
  endSessionEndpoint?: string;
  /** OAuth2 scopes to request. */
  scopes: string[];
  claims: IdpClaimsConfig;
  idpHints: IdpHintsConfig;
  /** Token exchange — enabled by default; disable when the IDP token already carries the org claim. */
  tokenExchange: TokenExchangeConfig;
}

// ── File-based auth configuration ────────────────────────────────────────────

export interface FileBasedUser {
  username: string;
  password: string;
  name: string;
  email: string;
  role: PlatformRole;
}

export interface OrgDetails {
  /** UUID — must match a seeded org in the local platform-api database. */
  id: string;
  name: string;
  handle: string;
  /** Geographic region passed on registration (default: 'us'). */
  region?: string;
}

export interface FileBasedAuthConfig {
  enabled: boolean;
  org: OrgDetails;
  users: FileBasedUser[];
  /**
   * HMAC-SHA256 secret used to sign locally-issued JWTs. Must match
   * AUTH_JWT_SECRET_KEY configured on platform-api. When omitted the token
   * is unsigned (alg: none) — only acceptable when platform-api also has
   * AUTH_JWT_SKIP_VALIDATION=true.
   */
  jwtSecret?: string;
  /** Token exchange — disabled by default; the locally-issued JWT already carries the org claim. */
  tokenExchange: TokenExchangeConfig;
}

// ── Auth configuration ────────────────────────────────────────────────────────

export interface AuthConfig {
  /**
   * When false the app skips all login UI and auto-injects a JWT with the
   * organization claim set to fileBasedAuth.orgId. Use this when you want to
   * test the app without any authentication friction.
   */
  enabled: boolean;
  idp: IdpConfig;
  fileBasedAuth: FileBasedAuthConfig;
}

// ── Root app configuration ────────────────────────────────────────────────────

export interface AppConfig {
  /**
   * Enables dev-mode UI indicators (e.g. "Local development mode" badge).
   * Has no effect on security — use auth.enabled for that.
   */
  devMode: boolean;
  auth: AuthConfig;
}

// ── Default config (safe fallback, all auth disabled) ────────────────────────

export const DEFAULT_APP_CONFIG: AppConfig = {
  devMode: false,
  auth: {
    enabled: false,
    idp: {
      enabled: false,
      authority: '',
      clientId: '',
      redirectUri: '',
      postLogoutRedirectUri: '',
      endSessionEndpoint: '',
      scopes: ['openid', 'profile', 'email'],
      claims: {
        organization: 'organization',
        username: 'given_name',
        email: 'email',
        orgName: 'org_name',
        orgHandle: 'org_handle',
      },
      idpHints: {
        param: 'fidp',
        google: 'google',
        github: 'github',
        microsoft: 'microsoft',
        enterprise: 'EnterpriseIDP',
      },
      tokenExchange: { enabled: true },
    },
    fileBasedAuth: {
      enabled: false,
      org: { id: '', name: '', handle: '' },
      users: [],
      tokenExchange: { enabled: false },
    },
  },
};

// ── Loader ────────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  // Runtime injection (Docker entrypoint) takes priority, then Vite build-time env.
  const runtime = (window as any).__RUNTIME_CONFIG__?.[key];
  if (runtime) return runtime;
  return (import.meta.env[key] as string | undefined) ?? '';
}

/**
 * Applies VITE_* environment variable overrides on top of the loaded JSON config.
 *
 * This lets you set individual fields via env vars without editing the config file.
 * An env var only overrides its corresponding field when it is non-empty.
 *
 * Supported overrides:
 *   VITE_DEV_MODE              → devMode
 *   VITE_AUTH_ENABLED          → auth.enabled
 *   VITE_IDP_ENABLED           → auth.idp.enabled
 *   VITE_FILE_AUTH_ENABLED     → auth.fileBasedAuth.enabled
 *   VITE_FILE_AUTH_JWT_SECRET  → auth.fileBasedAuth.jwtSecret
 *   VITE_DEV_ORG_ID            → auth.fileBasedAuth.org.id
 *   VITE_DEV_ORG_NAME          → auth.fileBasedAuth.org.name
 *   VITE_DEV_ORG_HANDLE        → auth.fileBasedAuth.org.handle
 *   VITE_OIDC_AUTHORITY        → auth.idp.authority
 *   VITE_OIDC_CLIENT_ID        → auth.idp.clientId
 *   VITE_OIDC_REDIRECT_URI     → auth.idp.redirectUri
 *   VITE_OIDC_POST_LOGOUT_REDIRECT_URI → auth.idp.postLogoutRedirectUri
 *   VITE_OIDC_END_SESSION_ENDPOINT     → auth.idp.endSessionEndpoint
 */
function applyEnvOverrides(config: AppConfig): AppConfig {
  const override = <T>(envKey: string, current: T, parse?: (v: string) => T): T => {
    const raw = getEnv(envKey);
    if (!raw) return current;
    return parse ? parse(raw) : raw as unknown as T;
  };
  const parseBool = (v: string) => v === 'true';

  return {
    ...config,
    devMode: override('VITE_DEV_MODE', config.devMode, parseBool),
    auth: {
      ...config.auth,
      enabled: override('VITE_AUTH_ENABLED', config.auth.enabled, parseBool),
      idp: {
        ...config.auth.idp,
        enabled:                override('VITE_IDP_ENABLED',                    config.auth.idp.enabled, parseBool),
        authority:              override('VITE_OIDC_AUTHORITY',                  config.auth.idp.authority),
        clientId:               override('VITE_OIDC_CLIENT_ID',                  config.auth.idp.clientId),
        redirectUri:            override('VITE_OIDC_REDIRECT_URI',               config.auth.idp.redirectUri),
        postLogoutRedirectUri:  override('VITE_OIDC_POST_LOGOUT_REDIRECT_URI',   config.auth.idp.postLogoutRedirectUri),
        endSessionEndpoint:     override('VITE_OIDC_END_SESSION_ENDPOINT',       config.auth.idp.endSessionEndpoint),
      },
      fileBasedAuth: {
        ...config.auth.fileBasedAuth,
        enabled:   override('VITE_FILE_AUTH_ENABLED',    config.auth.fileBasedAuth.enabled, parseBool),
        jwtSecret: override('VITE_FILE_AUTH_JWT_SECRET', config.auth.fileBasedAuth.jwtSecret) || config.auth.fileBasedAuth.jwtSecret,
        org: {
          id:     override('VITE_DEV_ORG_ID',     config.auth.fileBasedAuth.org.id),
          name:   override('VITE_DEV_ORG_NAME',   config.auth.fileBasedAuth.org.name),
          handle: override('VITE_DEV_ORG_HANDLE', config.auth.fileBasedAuth.org.handle),
        },
      },
    },
  };
}

function validateConfig(config: AppConfig): AppConfig {
  if (!config.devMode && !config.auth.enabled) {
    console.error(
      '[app-config] auth.enabled=false is not allowed when devMode=false. ' +
      'Forcing auth.enabled=true to prevent unauthenticated access in production.'
    );
    return {
      ...config,
      auth: { ...config.auth, enabled: true },
    };
  }
  return config;
}

/**
 * Fetches /app-config.json then applies VITE_* env var overrides.
 *
 * Local dev  : served from public/app-config.json by Vite
 * Docker     : mounted as a volume at /app/app-config.json, or generated by
 *              entrypoint.sh from VITE_* environment variables
 *
 * Falls back to DEFAULT_APP_CONFIG on any fetch/parse error so the app always
 * boots even if the config file is missing.
 */
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const res = await fetch('/app-config.json', { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[app-config] fetch returned ${res.status}, using defaults`);
      return validateConfig(applyEnvOverrides(DEFAULT_APP_CONFIG));
    }
    const json = await res.json();
    return validateConfig(applyEnvOverrides(json as AppConfig));
  } catch (err) {
    console.warn('[app-config] failed to load, using defaults:', err);
    return validateConfig(applyEnvOverrides(DEFAULT_APP_CONFIG));
  }
}
