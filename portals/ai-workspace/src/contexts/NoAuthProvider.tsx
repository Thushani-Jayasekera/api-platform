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

import React, { useEffect, useMemo, useState } from 'react';
import { AppAuthContext, type AppUser } from './AppAuthContext';
import { ROLE_SCOPES, expandScopes, checkPermission } from '../auth/permissions';
import { buildNoAuthJwt } from '../auth/noAuthJwt';
import { setStoredToken } from '../clients/aiWorkspaceApiClient';
import type { FileBasedAuthConfig } from '../config/appConfig';

/**
 * Used when auth.enabled = false in app-config.json.
 *
 * Skips all login UI and immediately presents the app as if the user is
 * authenticated. Injects a pre-built JWT carrying the configured orgId as the
 * organization claim so all API calls work against the local platform-api.
 */
export function NoAuthProvider({
  config,
  children,
}: {
  config: FileBasedAuthConfig;
  children: React.ReactNode;
}) {
  const adminScopes = expandScopes(ROLE_SCOPES['admin']);
  const user: AppUser = { name: 'Dev User', email: 'dev@localhost', role: 'admin', scopes: adminScopes };
  const hasPermission = (scope: string) => checkPermission(adminScopes, scope);

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    buildNoAuthJwt(config.org, adminScopes, config.jwtSecret).then((t) => {
      setStoredToken(t);
      setToken(t);
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: token !== null,
      isLoading: token === null,
      user,
      accessToken: token,
      hasPermission,
      login: async () => {},
      logout: async () => {
        window.location.href = '/login';
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}
