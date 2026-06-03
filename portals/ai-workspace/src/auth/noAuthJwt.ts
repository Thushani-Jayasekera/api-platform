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

import type { OrgDetails } from '../config/appConfig';

function base64UrlEncode(input: Uint8Array | string): string {
  let binary = '';
  if (typeof input === 'string') {
    const bytes = new TextEncoder().encode(input);
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
  } else {
    input.forEach((b) => (binary += String.fromCharCode(b)));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signHs256(signingInput: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return base64UrlEncode(new Uint8Array(sig));
}

/**
 * Builds a JWT carrying the given payload. When a secret is provided the token
 * is signed with HMAC-SHA256 (HS256); otherwise an unsigned token (alg: none)
 * is produced. Use the signed form whenever the token will be validated by
 * platform-api's LocalJWTAuthMiddleware.
 */
export async function buildSignedJwt(
  payload: Record<string, unknown>,
  secret?: string,
): Promise<string> {
  const alg = secret ? 'HS256' : 'none';
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = secret ? await signHs256(signingInput, secret) : '';
  return `${signingInput}.${signature}`;
}

/**
 * Builds a JWT for the no-auth / file-based-auth dev path, carrying the
 * organization claim and the provided scopes.
 *
 * Pass `secret` (matching AUTH_JWT_SECRET_KEY on platform-api) to produce an
 * HS256-signed token; omit it to produce an unsigned (alg: none) token.
 */
export async function buildNoAuthJwt(org: OrgDetails, scopes: string[], secret?: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  return buildSignedJwt({
    iss: 'no-auth',
    sub: 'dev-user',
    given_name: 'Dev User',
    email: 'dev@localhost',
    role: 'admin',
    organization: org.id,
    org_name: org.name,
    org_handle: org.handle,
    scope: scopes.join(' '),
    iat,
    exp: iat + 86400,
  }, secret);
}
