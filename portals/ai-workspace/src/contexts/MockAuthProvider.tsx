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

import React, { useCallback, useMemo, useState } from 'react';
import { AppAuthContext, type AppUser } from './AppAuthContext';
import { ROLE_SCOPES, expandScopes, checkPermission } from '../auth/permissions';
import { clearAuthData } from '../auth/logout';
import { setStoredToken, clearStoredToken } from '../clients/aiWorkspaceApiClient';
import { buildSignedJwt } from '../auth/noAuthJwt';
import type { FileBasedAuthConfig } from '../config/appConfig';

const MOCK_SESSION_KEY = 'mock_auth_user';

function loadStoredUser(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function MockAuthProvider({
  config,
  children,
}: {
  config: FileBasedAuthConfig;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AppUser | null>(loadStoredUser);
  const [mockToken, setMockToken] = useState<string | null>(
    () => sessionStorage.getItem('platform_auth_token')
  );

  const login = useCallback(async (credentials?: { username: string; password: string }) => {
    if (!credentials) return;
    const match = config.users.find(
      (u) => u.username === credentials.username && u.password === credentials.password
    );
    if (!match) throw new Error('Invalid username or password');

    const scopes = expandScopes(ROLE_SCOPES[match.role]);
    const appUser: AppUser = {
      name: match.name,
      email: match.email,
      role: match.role,
      scopes,
    };
    const iat = Math.floor(Date.now() / 1000);
    const mockToken = await buildSignedJwt({
      iss: 'mock-auth',
      sub: match.username,
      given_name: match.name,
      email: match.email,
      role: match.role,
      organization: config.org.id,
      org_name: config.org.name,
      org_handle: config.org.handle,
      scope: scopes.join(' '),
      iat,
      exp: iat + 86400,
    }, config.jwtSecret);
    setStoredToken(mockToken);
    setMockToken(mockToken);
    sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(appUser));
    setUser(appUser);
  }, []);

  const logout = useCallback(async () => {
    clearStoredToken();
    clearAuthData();
    setMockToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasPermission = useCallback(
    (scope: string) => checkPermission(user?.scopes ?? [], scope),
    [user]
  );

  const value = useMemo(
    () => ({
      isAuthenticated: user !== null,
      isLoading: false,
      user,
      accessToken: mockToken,
      hasPermission,
      login,
      logout,
    }),
    [user, mockToken, hasPermission, login, logout]
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}
