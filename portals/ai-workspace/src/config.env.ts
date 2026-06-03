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
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Configuration for AI Workspace Authentication
 */

// Extend Window interface to include runtime config
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Record<string, string>;
  }
}

import { getEnvOrDefault } from './utils/getEnvOrDefault';

/*
 * Single line environment variable definitions with defaults using getEnvOrDefault utility to improve readability and maintainability.
 */

// Debug mode
export const DEBUG = getEnvOrDefault('VITE_DEBUG', false);

// Permission resolution mode:
//   "scope" (default) — use the OAuth2 scope claim in the JWT directly
//   "role"            — expand the platform_role/role claim to its full scope set
export const PERMISSION_MODE = (getEnvOrDefault('VITE_PERMISSION_MODE', 'scope') as string) === 'role'
  ? 'role' as const
  : 'scope' as const;

// Domain and environment settings
export const DOMAIN = getEnvOrDefault('VITE_DOMAIN', 'localhost:3009');

// OIDC configuration — works with any OIDC-compliant identity provider
// Set VITE_OIDC_AUTHORITY to your IdP's issuer URL; endpoints are auto-discovered
// from {authority}/.well-known/openid-configuration
export const OIDC_AUTHORITY = getEnvOrDefault(
  'VITE_OIDC_AUTHORITY',
  'https://localhost:8090'
);
export const OIDC_CLIENT_ID = getEnvOrDefault('VITE_OIDC_CLIENT_ID', '');
export const OIDC_REDIRECT_URI = getEnvOrDefault(
  'VITE_OIDC_REDIRECT_URI',
  `https://${DOMAIN}/signin`
);
export const OIDC_POST_LOGOUT_REDIRECT_URI = getEnvOrDefault(
  'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
  `https://${DOMAIN}/login`
);
export const OIDC_END_SESSION_ENDPOINT = getEnvOrDefault(
  'VITE_OIDC_END_SESSION_ENDPOINT',
  ''
);

// API Base URLs
export const DEV_PORTAL_BASE_URL = getEnvOrDefault(
  'VITE_DEV_PORTAL_BASE_URL',
  'https://devportal.preview-dv.bijira.dev'
);

export const API_BASE_URLS = {
  devOps: getEnvOrDefault(
    'VITE_API_DEVOPS',
    'https://apis.preview-dv.choreo.dev/devops/1.0.0'
  ),
  policyHubApi: getEnvOrDefault(
    'VITE_API_POLICY_HUB',
    'https://db720294-98fd-40f4-85a1-cc6a3b65bc9a-dev.e1-us-east-azure.choreoapis.dev/api-platform/policy-hub-api/policy-hub-public/v1.0'
  ),
  moesifAPI: getEnvOrDefault(
    'VITE_API_MOESIF_API',
    'https://apis.preview-dv.choreo.dev/moesif-key/0.1.0'
  ),
} as const;

// Moesif web console base URL
export const MOESIF_WEB_URL = getEnvOrDefault(
  'VITE_MOESIF_WEB_URL',
  'https://web-dev.moesif.com'
);

// Moesif Application API Key for event tracking
export const MOESIF_APP_API_KEY = getEnvOrDefault(
  'VITE_MOESIF_APP_API_KEY',
  'eyJhcHAiOiI5Mjo1NjYiLCJ2ZXIiOiIyLjEiLCJvcmciOiI2Mjg6NDE3IiwicHViIjp0cnVlLCJpYXQiOjE3Njk5MDQwMDB9.gxcZJ7eybasZ5JY_JJj2ARuTiWZNnYIeAtL8oQbhfxk'
);

// Platform Gateway Version
export const PLATFORM_GATEWAY_VERSION = getEnvOrDefault(
  'VITE_PLATFORM_GATEWAY_VERSION',
  'v1.0.0'
);

// Platform Control Plane URL for gateway configuration
export const PLATFORM_CONTROL_PLANE_URL = getEnvOrDefault(
  'VITE_PLATFORM_CONTROL_PLANE_URL',
  'https://connect.preview-dv.bijira.dev'
);

// Policy Hub web URL
export const POLICY_HUB_WEB_URL = getEnvOrDefault(
  'VITE_POLICY_HUB_WEB_URL',
  'https://wso2.com/api-platform/policy-hub/'
);

// Platform API base URL (local dev: https://localhost:9243/api/v1)
export const PLATFORM_API_BASE_URL = getEnvOrDefault(
  'VITE_PLATFORM_API_BASE_URL',
  'https://localhost:9243/api/v1'
);

// Dev-mode org UUID — the organization that mock-auth users belong to.
// Must match a seeded org in the local platform-api database.
export const DEV_ORG_ID = getEnvOrDefault(
  'VITE_DEV_ORG_ID',
  'db278eb4-9e08-4a6e-a00a-493d0ce4b8a6'
);
