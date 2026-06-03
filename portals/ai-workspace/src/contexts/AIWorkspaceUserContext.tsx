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

// ============================================================================
// AIWorkspaceUserContext — Platform API (standalone) version
// ----------------------------------------------------------------------------
// Asgardeo authentication has been removed. All org data comes from the
// Platform API (https://localhost:9243/api/v1).
// Token exchange and IDP-specific logic are no-ops.
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { logger } from '../utils/logger';
import type { Organization, ValidateUserResponse } from '../utils/types';
import { PLATFORM_API_BASE_URL } from '../config.env';
import { getOrgToken, getStoredToken, setExchangedToken } from '../clients/aiWorkspaceApiClient';
import { useAppConfig } from '../config/AppConfigContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIWorkspaceUserContextType {
  isTokenExchanged: boolean;
  setIsTokenExchanged: React.Dispatch<React.SetStateAction<boolean>>;
  organizations: Organization[];
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  isOrgAdmin: boolean;
  setIsOrgAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  /** Always false — no Asgardeo sign-in hook available */
  shouldValidateUser: boolean;
  /** Always '' — no IDP in standalone mode */
  fidp: string;
  /** No-op — token exchange not needed for Platform API */
  exchangeOrgToken: (orgHandle: string) => Promise<boolean>;
  /** No-op — returns empty orgs; use getOrganizations instead */
  validateUser: () => Promise<ValidateUserResponse>;
  /** Calls GET /organizations on the Platform API */
  getOrganizations: () => Promise<Organization[]>;
  /** Always returns true (admin) in local dev */
  getIsOrgAdmin: (orgHandle: string) => Promise<boolean>;
}

const AIWorkspaceUserContext = createContext<AIWorkspaceUserContextType | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch all organizations the authenticated user belongs to from the Platform API.
 * Uses GET /users/me/organizations which returns an array and auto-seeds membership
 * from the JWT org claim on first call (backward-compatible migration).
 * Retries on network errors (ECONNREFUSED) to handle backend startup latency.
 */
async function fetchPlatformOrganizations(retries = 5, baseDelayMs = 2000): Promise<Organization[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getOrgToken()}`,
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, baseDelayMs * attempt));
      logger.info('[AIWorkspaceUserContext] Retrying GET /users/me/organizations (attempt %d/%d)', attempt, retries);
    }
    try {
      const res = await fetch(`${PLATFORM_API_BASE_URL}/users/me/organizations`, { headers });

      if (!res.ok) {
        // Treat 404 or 500 as "no orgs yet" — don't retry, send to /register-org.
        if (res.status === 404 || res.status === 500) {
          logger.warn('[AIWorkspaceUserContext] No organizations found (HTTP %d) — register one at /register-org', res.status);
          return [];
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `GET /users/me/organizations failed: HTTP ${res.status}`);
      }

      const platformOrgs: Array<{ id: string; handle: string; name: string; region: string }> = await res.json();

      if (!platformOrgs || platformOrgs.length === 0) {
        logger.info('[AIWorkspaceUserContext] No organizations found for user');
        return [];
      }

      logger.info('[AIWorkspaceUserContext] Loaded organizations:', platformOrgs.length);

      return platformOrgs.map((o) => ({
        id: o.id,
        uuid: o.id,
        handle: o.handle,
        name: o.name,
        region: o.region,
        owner: { id: 0, idpId: '' },
      }));
    } catch (err) {
      lastErr = err;
      logger.warn('[AIWorkspaceUserContext] GET /users/me/organizations failed (attempt %d): %o', attempt, err);
    }
  }
  throw lastErr;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const AIWorkspaceUserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { auth } = useAppConfig();
  const tokenExchangeEnabled = auth.fileBasedAuth.enabled
    ? auth.fileBasedAuth.tokenExchange.enabled
    : auth.idp.tokenExchange.enabled;

  const [isTokenExchanged, setIsTokenExchanged] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(true); // admin by default in local dev

  // Exchange the current identity token for a platform-issued org-scoped JWT.
  // Calls POST /auth/token with the target org ID; the platform API validates
  // membership and returns a signed token with organization=<orgId> in its claims.
  // Skipped for file-based/no-auth modes — the locally-built JWT already carries the org claim.
  const exchangeOrgToken = useCallback(async (orgId: string): Promise<boolean> => {
    if (!tokenExchangeEnabled) {
      logger.info('[AIWorkspaceUserContext] Token exchange disabled — skipping for org', orgId);
      return true;
    }
    logger.info('[AIWorkspaceUserContext] Requesting org-scoped token for org', orgId);
    try {
      const res = await fetch(`${PLATFORM_API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) {
        logger.error('[AIWorkspaceUserContext] Token exchange failed for org', orgId, 'status', res.status);
        return false;
      }
      const data: { token: string } = await res.json();
      setExchangedToken(data.token);
      logger.info('[AIWorkspaceUserContext] Org-scoped token stored for org', orgId);
      return true;
    } catch (err) {
      logger.error('[AIWorkspaceUserContext] Token exchange error:', err);
      return false;
    }
  }, [tokenExchangeEnabled]);

  // Not used in platform mode
  const validateUser = useCallback(async (): Promise<ValidateUserResponse> => {
    logger.info('[AIWorkspaceUserContext] validateUser — no-op in platform mode');
    return { organizations: [], idpId: '' };
  }, []);

  // Real call to Platform API — returns all orgs the user belongs to
  const getOrganizations = useCallback(async (): Promise<Organization[]> => {
    return fetchPlatformOrganizations();
  }, []);

  // Admin check — always true in local dev
  const getIsOrgAdmin = useCallback(async (_orgHandle: string): Promise<boolean> => {
    return true;
  }, []);

  return (
    <AIWorkspaceUserContext.Provider
      value={{
        isTokenExchanged,
        setIsTokenExchanged,
        organizations,
        setOrganizations,
        isOrgAdmin,
        setIsOrgAdmin,
        shouldValidateUser: false,  // No Asgardeo sign-in hook
        fidp: '',                   // No IDP in standalone mode
        exchangeOrgToken,
        validateUser,
        getOrganizations,
        getIsOrgAdmin,
      }}
    >
      {children}
    </AIWorkspaceUserContext.Provider>
  );
};

export const useAIWorkspaceUser = (): AIWorkspaceUserContextType => {
  const ctx = useContext(AIWorkspaceUserContext);
  if (!ctx) throw new Error('useAIWorkspaceUser must be used within a AIWorkspaceUserProvider');
  return ctx;
};

export default AIWorkspaceUserContext;
