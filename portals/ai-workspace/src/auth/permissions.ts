/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export type PlatformRole = 'admin' | 'developer' | 'publisher' | 'operator' | 'viewer';

export const PLATFORM_ROLES: readonly PlatformRole[] = ['admin', 'developer', 'publisher', 'operator', 'viewer'];

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === 'string' && (PLATFORM_ROLES as readonly string[]).includes(value);
}

/** All platform API OAuth2 scopes derived from openapi.yaml x-required-scopes. */
export const SCOPES = {
  // Projects
  PROJECT_READ:   'api-platform:project:read',
  PROJECT_CREATE: 'api-platform:project:create',
  PROJECT_UPDATE: 'api-platform:project:update',
  PROJECT_DELETE: 'api-platform:project:delete',
  PROJECT_MANAGE: 'api-platform:project:manage',

  // Applications
  APPLICATION_READ:                    'api-platform:application:read',
  APPLICATION_CREATE:                  'api-platform:application:create',
  APPLICATION_UPDATE:                  'api-platform:application:update',
  APPLICATION_DELETE:                  'api-platform:application:delete',
  APPLICATION_MANAGE:                  'api-platform:application:manage',
  APPLICATION_API_KEY_READ:            'api-platform:application:api_key:read',
  APPLICATION_API_KEY_CREATE:          'api-platform:application:api_key:create',
  APPLICATION_API_KEY_DELETE:          'api-platform:application:api_key:delete',
  APPLICATION_API_KEY_MANAGE:          'api-platform:application:api_key:manage',
  APPLICATION_ASSOCIATIONS_READ:       'api-platform:application:associations:read',
  APPLICATION_ASSOCIATIONS_CREATE:     'api-platform:application:associations:create',
  APPLICATION_ASSOCIATIONS_DELETE:     'api-platform:application:associations:delete',
  APPLICATION_ASSOCIATIONS_MANAGE:     'api-platform:application:associations:manage',
  APPLICATION_ASSOCIATIONS_API_KEY_READ: 'api-platform:application:associations:api_key:read',

  // AI Gateways
  GATEWAY_READ:            'api-platform:gateway:read',
  GATEWAY_CREATE:          'api-platform:gateway:create',
  GATEWAY_UPDATE:          'api-platform:gateway:update',
  GATEWAY_DELETE:          'api-platform:gateway:delete',
  GATEWAY_MANAGE:          'api-platform:gateway:manage',
  GATEWAY_TOKEN_READ:      'api-platform:gateway:token:read',
  GATEWAY_TOKEN_CREATE:    'api-platform:gateway:token:create',
  GATEWAY_TOKEN_DELETE:    'api-platform:gateway:token:delete',
  GATEWAY_TOKEN_MANAGE:    'api-platform:gateway:token:manage',
  GATEWAY_POLICY_READ:     'api-platform:gateway:policy:read',
  GATEWAY_POLICY_CREATE:   'api-platform:gateway:policy:create',
  GATEWAY_POLICY_DELETE:   'api-platform:gateway:policy:delete',
  GATEWAY_POLICY_MANAGE:   'api-platform:gateway:policy:manage',
  GATEWAY_ARTIFACTS_READ:  'api-platform:gateway:artifacts:read',
  GATEWAY_MANIFEST_READ:   'api-platform:gateway:manifest:read',
  GATEWAY_STATUS_READ:     'api-platform:gateway:status:read',

  // LLM Providers
  LLM_PROVIDER_READ:                   'api-platform:llm_provider:read',
  LLM_PROVIDER_CREATE:                 'api-platform:llm_provider:create',
  LLM_PROVIDER_UPDATE:                 'api-platform:llm_provider:update',
  LLM_PROVIDER_DELETE:                 'api-platform:llm_provider:delete',
  LLM_PROVIDER_MANAGE:                 'api-platform:llm_provider:manage',
  LLM_PROVIDER_API_KEY_READ:           'api-platform:llm_provider:api_key:read',
  LLM_PROVIDER_API_KEY_CREATE:         'api-platform:llm_provider:api_key:create',
  LLM_PROVIDER_API_KEY_DELETE:         'api-platform:llm_provider:api_key:delete',
  LLM_PROVIDER_API_KEY_MANAGE:         'api-platform:llm_provider:api_key:manage',
  LLM_PROVIDER_DEPLOYMENT_READ:        'api-platform:llm_provider:deployment:read',
  LLM_PROVIDER_DEPLOYMENT_CREATE:      'api-platform:llm_provider:deployment:create',
  LLM_PROVIDER_DEPLOYMENT_DELETE:      'api-platform:llm_provider:deployment:delete',
  LLM_PROVIDER_DEPLOYMENT_MANAGE:      'api-platform:llm_provider:deployment:manage',
  LLM_PROVIDER_DEPLOYMENT_RESTORE:     'api-platform:llm_provider:deployment:restore',
  LLM_PROVIDER_DEPLOYMENT_UNDEPLOY:    'api-platform:llm_provider:deployment:undeploy',

  // LLM Proxies
  LLM_PROXY_READ:                   'api-platform:llm_proxy:read',
  LLM_PROXY_CREATE:                 'api-platform:llm_proxy:create',
  LLM_PROXY_UPDATE:                 'api-platform:llm_proxy:update',
  LLM_PROXY_DELETE:                 'api-platform:llm_proxy:delete',
  LLM_PROXY_MANAGE:                 'api-platform:llm_proxy:manage',
  LLM_PROXY_API_KEY_READ:           'api-platform:llm_proxy:api_key:read',
  LLM_PROXY_API_KEY_CREATE:         'api-platform:llm_proxy:api_key:create',
  LLM_PROXY_API_KEY_DELETE:         'api-platform:llm_proxy:api_key:delete',
  LLM_PROXY_API_KEY_MANAGE:         'api-platform:llm_proxy:api_key:manage',
  LLM_PROXY_DEPLOYMENT_READ:        'api-platform:llm_proxy:deployment:read',
  LLM_PROXY_DEPLOYMENT_CREATE:      'api-platform:llm_proxy:deployment:create',
  LLM_PROXY_DEPLOYMENT_DELETE:      'api-platform:llm_proxy:deployment:delete',
  LLM_PROXY_DEPLOYMENT_MANAGE:      'api-platform:llm_proxy:deployment:manage',
  LLM_PROXY_DEPLOYMENT_RESTORE:     'api-platform:llm_proxy:deployment:restore',
  LLM_PROXY_DEPLOYMENT_UNDEPLOY:    'api-platform:llm_proxy:deployment:undeploy',

  // LLM Templates
  LLM_TEMPLATE_READ:   'api-platform:llm_template:read',
  LLM_TEMPLATE_CREATE: 'api-platform:llm_template:create',
  LLM_TEMPLATE_UPDATE: 'api-platform:llm_template:update',
  LLM_TEMPLATE_DELETE: 'api-platform:llm_template:delete',
  LLM_TEMPLATE_MANAGE: 'api-platform:llm_template:manage',

  // MCP Proxies
  MCP_PROXY_READ:                   'api-platform:mcp_proxy:read',
  MCP_PROXY_CREATE:                 'api-platform:mcp_proxy:create',
  MCP_PROXY_UPDATE:                 'api-platform:mcp_proxy:update',
  MCP_PROXY_DELETE:                 'api-platform:mcp_proxy:delete',
  MCP_PROXY_MANAGE:                 'api-platform:mcp_proxy:manage',
  MCP_PROXY_DEPLOYMENT_READ:        'api-platform:mcp_proxy:deployment:read',
  MCP_PROXY_DEPLOYMENT_CREATE:      'api-platform:mcp_proxy:deployment:create',
  MCP_PROXY_DEPLOYMENT_DELETE:      'api-platform:mcp_proxy:deployment:delete',
  MCP_PROXY_DEPLOYMENT_MANAGE:      'api-platform:mcp_proxy:deployment:manage',
  MCP_PROXY_DEPLOYMENT_RESTORE:     'api-platform:mcp_proxy:deployment:restore',
  MCP_PROXY_DEPLOYMENT_UNDEPLOY:    'api-platform:mcp_proxy:deployment:undeploy',

  // DevPortals
  DEVPORTAL_READ:   'api-platform:devportal:read',
  DEVPORTAL_CREATE: 'api-platform:devportal:create',
  DEVPORTAL_UPDATE: 'api-platform:devportal:update',
  DEVPORTAL_DELETE: 'api-platform:devportal:delete',
  DEVPORTAL_MANAGE: 'api-platform:devportal:manage',

  // Subscriptions
  SUBSCRIPTION_READ:         'api-platform:subscription:read',
  SUBSCRIPTION_CREATE:       'api-platform:subscription:create',
  SUBSCRIPTION_UPDATE:       'api-platform:subscription:update',
  SUBSCRIPTION_DELETE:       'api-platform:subscription:delete',
  SUBSCRIPTION_MANAGE:       'api-platform:subscription:manage',
  SUBSCRIPTION_PLAN_READ:    'api-platform:subscription_plan:read',
  SUBSCRIPTION_PLAN_CREATE:  'api-platform:subscription_plan:create',
  SUBSCRIPTION_PLAN_UPDATE:  'api-platform:subscription_plan:update',
  SUBSCRIPTION_PLAN_DELETE:  'api-platform:subscription_plan:delete',
  SUBSCRIPTION_PLAN_MANAGE:  'api-platform:subscription_plan:manage',

  // REST APIs
  REST_API_READ:                    'api-platform:rest_api:read',
  REST_API_CREATE:                  'api-platform:rest_api:create',
  REST_API_UPDATE:                  'api-platform:rest_api:update',
  REST_API_DELETE:                  'api-platform:rest_api:delete',
  REST_API_MANAGE:                  'api-platform:rest_api:manage',
  REST_API_IMPORT:                  'api-platform:rest_api:import',
  REST_API_PUBLISH:                 'api-platform:rest_api:publish',
  REST_API_API_KEY_READ:            'api-platform:rest_api:api_key:read',
  REST_API_API_KEY_CREATE:          'api-platform:rest_api:api_key:create',
  REST_API_API_KEY_UPDATE:          'api-platform:rest_api:api_key:update',
  REST_API_API_KEY_DELETE:          'api-platform:rest_api:api_key:delete',
  REST_API_API_KEY_MANAGE:          'api-platform:rest_api:api_key:manage',
  REST_API_GATEWAY_READ:            'api-platform:rest_api:gateway:read',
  REST_API_GATEWAY_CREATE:          'api-platform:rest_api:gateway:create',
  REST_API_GATEWAY_MANAGE:          'api-platform:rest_api:gateway:manage',
  REST_API_DEPLOYMENT_READ:         'api-platform:rest_api:deployment:read',
  REST_API_DEPLOYMENT_CREATE:       'api-platform:rest_api:deployment:create',
  REST_API_DEPLOYMENT_DELETE:       'api-platform:rest_api:deployment:delete',
  REST_API_DEPLOYMENT_MANAGE:       'api-platform:rest_api:deployment:manage',
  REST_API_DEPLOYMENT_RESTORE:      'api-platform:rest_api:deployment:restore',
  REST_API_DEPLOYMENT_UNDEPLOY:     'api-platform:rest_api:deployment:undeploy',

  // WebSub APIs
  WEBSUB_API_READ:                   'api-platform:websub_api:read',
  WEBSUB_API_CREATE:                 'api-platform:websub_api:create',
  WEBSUB_API_UPDATE:                 'api-platform:websub_api:update',
  WEBSUB_API_DELETE:                 'api-platform:websub_api:delete',
  WEBSUB_API_MANAGE:                 'api-platform:websub_api:manage',
  WEBSUB_API_PUBLISH:                'api-platform:websub_api:publish',
  WEBSUB_API_API_KEY_CREATE:         'api-platform:websub_api:api_key:create',
  WEBSUB_API_API_KEY_UPDATE:         'api-platform:websub_api:api_key:update',
  WEBSUB_API_API_KEY_DELETE:         'api-platform:websub_api:api_key:delete',
  WEBSUB_API_API_KEY_MANAGE:         'api-platform:websub_api:api_key:manage',
  WEBSUB_API_DEPLOYMENT_READ:        'api-platform:websub_api:deployment:read',
  WEBSUB_API_DEPLOYMENT_CREATE:      'api-platform:websub_api:deployment:create',
  WEBSUB_API_DEPLOYMENT_DELETE:      'api-platform:websub_api:deployment:delete',
  WEBSUB_API_DEPLOYMENT_MANAGE:      'api-platform:websub_api:deployment:manage',
  WEBSUB_API_DEPLOYMENT_RESTORE:     'api-platform:websub_api:deployment:restore',
  WEBSUB_API_DEPLOYMENT_UNDEPLOY:    'api-platform:websub_api:deployment:undeploy',

  // WebBroker APIs
  WEBBROKER_API_READ:                   'api-platform:webbroker_api:read',
  WEBBROKER_API_CREATE:                 'api-platform:webbroker_api:create',
  WEBBROKER_API_UPDATE:                 'api-platform:webbroker_api:update',
  WEBBROKER_API_DELETE:                 'api-platform:webbroker_api:delete',
  WEBBROKER_API_MANAGE:                 'api-platform:webbroker_api:manage',
  WEBBROKER_API_PUBLISH:                'api-platform:webbroker_api:publish',
  WEBBROKER_API_API_KEY_CREATE:         'api-platform:webbroker_api:api_key:create',
  WEBBROKER_API_API_KEY_UPDATE:         'api-platform:webbroker_api:api_key:update',
  WEBBROKER_API_API_KEY_DELETE:         'api-platform:webbroker_api:api_key:delete',
  WEBBROKER_API_API_KEY_MANAGE:         'api-platform:webbroker_api:api_key:manage',
  WEBBROKER_API_DEPLOYMENT_READ:        'api-platform:webbroker_api:deployment:read',
  WEBBROKER_API_DEPLOYMENT_CREATE:      'api-platform:webbroker_api:deployment:create',
  WEBBROKER_API_DEPLOYMENT_DELETE:      'api-platform:webbroker_api:deployment:delete',
  WEBBROKER_API_DEPLOYMENT_MANAGE:      'api-platform:webbroker_api:deployment:manage',
  WEBBROKER_API_DEPLOYMENT_RESTORE:     'api-platform:webbroker_api:deployment:restore',
  WEBBROKER_API_DEPLOYMENT_UNDEPLOY:    'api-platform:webbroker_api:deployment:undeploy',

  // Git
  GIT_READ: 'api-platform:git:read',
} as const;

/**
 * Check whether a set of scopes grants a requested scope.
 *
 * Rules (matching discussion #2045):
 *  1. Exact match — the scope is directly present.
 *  2. Parent :manage — `api-platform:X:manage` is a superset that covers all
 *     CRUD operations and sub-resource scopes under resource X.
 */
export function checkPermission(userScopes: string[], scope: string): boolean {
  if (userScopes.includes(scope)) return true;
  // Derive parent :manage scope: api-platform:<resource>:manage
  const parts = scope.split(':');
  if (parts.length >= 3) {
    const parentManage = `${parts[0]}:${parts[1]}:manage`;
    if (parentManage !== scope && userScopes.includes(parentManage)) return true;
  }
  return false;
}

/** @deprecated use checkPermission via useAppAuth().hasPermission instead */
export function expandScopes(scopes: string[]): string[] {
  return [...new Set(scopes)];
}

export const ROLE_SCOPES: Record<PlatformRole, string[]> = {
  admin: [
    SCOPES.PROJECT_MANAGE,
    SCOPES.APPLICATION_MANAGE,
    SCOPES.APPLICATION_API_KEY_MANAGE,
    SCOPES.APPLICATION_ASSOCIATIONS_MANAGE,
    SCOPES.GATEWAY_MANAGE,
    SCOPES.GATEWAY_TOKEN_MANAGE,
    SCOPES.GATEWAY_POLICY_MANAGE,
    SCOPES.LLM_PROVIDER_MANAGE,
    SCOPES.LLM_PROVIDER_API_KEY_MANAGE,
    SCOPES.LLM_PROVIDER_DEPLOYMENT_MANAGE,
    SCOPES.LLM_PROXY_MANAGE,
    SCOPES.LLM_PROXY_API_KEY_MANAGE,
    SCOPES.LLM_PROXY_DEPLOYMENT_MANAGE,
    SCOPES.LLM_TEMPLATE_MANAGE,
    SCOPES.MCP_PROXY_MANAGE,
    SCOPES.MCP_PROXY_DEPLOYMENT_MANAGE,
    SCOPES.DEVPORTAL_MANAGE,
    SCOPES.SUBSCRIPTION_MANAGE,
    SCOPES.SUBSCRIPTION_PLAN_MANAGE,
    SCOPES.REST_API_MANAGE,
    SCOPES.REST_API_DEPLOYMENT_MANAGE,
    SCOPES.WEBSUB_API_MANAGE,
    SCOPES.WEBSUB_API_DEPLOYMENT_MANAGE,
    SCOPES.WEBBROKER_API_MANAGE,
    SCOPES.WEBBROKER_API_DEPLOYMENT_MANAGE,
    SCOPES.GIT_READ,
  ],
  developer: [
    SCOPES.PROJECT_MANAGE,
    SCOPES.APPLICATION_MANAGE,
    SCOPES.APPLICATION_API_KEY_MANAGE,
    SCOPES.APPLICATION_ASSOCIATIONS_MANAGE,
    SCOPES.LLM_PROVIDER_MANAGE,
    SCOPES.LLM_PROVIDER_API_KEY_MANAGE,
    SCOPES.LLM_PROVIDER_DEPLOYMENT_MANAGE,
    SCOPES.LLM_PROXY_MANAGE,
    SCOPES.LLM_PROXY_API_KEY_MANAGE,
    SCOPES.LLM_PROXY_DEPLOYMENT_MANAGE,
    SCOPES.LLM_TEMPLATE_MANAGE,
    SCOPES.MCP_PROXY_MANAGE,
    SCOPES.MCP_PROXY_DEPLOYMENT_MANAGE,
    SCOPES.REST_API_MANAGE,
    SCOPES.REST_API_DEPLOYMENT_MANAGE,
    SCOPES.WEBSUB_API_MANAGE,
    SCOPES.WEBSUB_API_DEPLOYMENT_MANAGE,
    SCOPES.WEBBROKER_API_MANAGE,
    SCOPES.WEBBROKER_API_DEPLOYMENT_MANAGE,
    SCOPES.GIT_READ,
  ],
  publisher: [
    SCOPES.PROJECT_READ,
    SCOPES.LLM_PROVIDER_READ,
    SCOPES.LLM_PROXY_READ,
    SCOPES.MCP_PROXY_READ,
    SCOPES.APPLICATION_READ,
    SCOPES.REST_API_READ,
    SCOPES.REST_API_PUBLISH,
    SCOPES.WEBSUB_API_READ,
    SCOPES.WEBSUB_API_PUBLISH,
    SCOPES.WEBBROKER_API_READ,
    SCOPES.WEBBROKER_API_PUBLISH,
    SCOPES.DEVPORTAL_MANAGE,
    SCOPES.SUBSCRIPTION_READ,
  ],
  operator: [
    SCOPES.PROJECT_READ,
    SCOPES.GATEWAY_MANAGE,
    SCOPES.GATEWAY_TOKEN_MANAGE,
    SCOPES.GATEWAY_POLICY_READ,
    SCOPES.LLM_PROVIDER_READ,
    SCOPES.LLM_PROVIDER_DEPLOYMENT_MANAGE,
    SCOPES.LLM_PROXY_READ,
    SCOPES.LLM_PROXY_DEPLOYMENT_MANAGE,
    SCOPES.MCP_PROXY_READ,
    SCOPES.MCP_PROXY_DEPLOYMENT_MANAGE,
    SCOPES.REST_API_READ,
    SCOPES.REST_API_DEPLOYMENT_MANAGE,
    SCOPES.WEBSUB_API_READ,
    SCOPES.WEBSUB_API_DEPLOYMENT_MANAGE,
    SCOPES.WEBBROKER_API_READ,
    SCOPES.WEBBROKER_API_DEPLOYMENT_MANAGE,
  ],
  viewer: [
    SCOPES.PROJECT_READ,
    SCOPES.APPLICATION_READ,
    SCOPES.APPLICATION_API_KEY_READ,
    SCOPES.APPLICATION_ASSOCIATIONS_READ,
    SCOPES.GATEWAY_READ,
    SCOPES.GATEWAY_TOKEN_READ,
    SCOPES.GATEWAY_POLICY_READ,
    SCOPES.LLM_PROVIDER_READ,
    SCOPES.LLM_PROXY_READ,
    SCOPES.LLM_TEMPLATE_READ,
    SCOPES.MCP_PROXY_READ,
    SCOPES.DEVPORTAL_READ,
    SCOPES.SUBSCRIPTION_READ,
    SCOPES.SUBSCRIPTION_PLAN_READ,
    SCOPES.REST_API_READ,
    SCOPES.WEBSUB_API_READ,
    SCOPES.WEBBROKER_API_READ,
  ],
};
