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

import React from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { AuthProvider } from 'react-oidc-context';
import { AcrylicOrangeTheme, AcrylicPurpleTheme, ClassicTheme, HighContrastTheme, OxygenUIThemeProvider } from '@wso2/oxygen-ui';
import App from './App.tsx';
import './styles.css';
import { loadAppConfig, type AppConfig } from './config/appConfig';
import { AppConfigContext } from './config/AppConfigContext';
import { MockAuthProvider } from './contexts/MockAuthProvider';
import { NoAuthProvider } from './contexts/NoAuthProvider';
import { OIDCAppAuthProvider } from './contexts/OIDCAppAuthProvider';

const container = document.getElementById('root')!;
const root = createRoot(container);

function buildAuthTree(config: AppConfig, children: React.ReactNode): React.ReactNode {
  const { auth } = config;

  // auth.enabled = false → skip login entirely, auto-inject org JWT
  if (!auth.enabled) {
    return <NoAuthProvider config={auth.fileBasedAuth}>{children}</NoAuthProvider>;
  }

  // auth.enabled + fileBasedAuth → username/password login form
  if (auth.fileBasedAuth.enabled) {
    return <MockAuthProvider config={auth.fileBasedAuth}>{children}</MockAuthProvider>;
  }

  // auth.enabled + idp → full OIDC flow
  const { idp } = auth;
  return (
    <AuthProvider
      authority={idp.authority}
      client_id={idp.clientId}
      redirect_uri={idp.redirectUri}
      post_logout_redirect_uri={idp.postLogoutRedirectUri}
      scope={idp.scopes.join(' ')}
      extraTokenParams={{ scope: idp.scopes.join(' ') }}
      loadUserInfo={true}
      metadata={idp.endSessionEndpoint ? { end_session_endpoint: idp.endSessionEndpoint } : undefined}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      <OIDCAppAuthProvider>{children}</OIDCAppAuthProvider>
    </AuthProvider>
  );
}

async function bootstrap() {
  const config = await loadAppConfig();

  const app = (
    <React.StrictMode>
      <OxygenUIThemeProvider
        themes={[
          { key: 'acrylicOrange', label: 'Acrylic Orange Theme', theme: AcrylicOrangeTheme },
          { key: 'acrylicPurple', label: 'Acrylic Purple Theme', theme: AcrylicPurpleTheme },
          { key: 'highContrast',  label: 'High Contrast Theme',  theme: HighContrastTheme  },
          { key: 'classic',       label: 'Classic Theme',        theme: ClassicTheme       },
        ]}
        initialTheme="acrylicOrange"
      >
        <AppConfigContext.Provider value={config}>
          {buildAuthTree(
            config,
            <IntlProvider locale="en" defaultLocale="en">
              <App />
            </IntlProvider>
          )}
        </AppConfigContext.Provider>
      </OxygenUIThemeProvider>
    </React.StrictMode>
  );

  root.render(app);
}

bootstrap();
