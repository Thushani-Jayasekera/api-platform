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

import { useState, type JSX } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@wso2/oxygen-ui';
import { Eye, EyeOff, Lock } from '@wso2/oxygen-ui-icons-react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../../contexts/AppAuthContext';
import { useAppConfig } from '../../config/AppConfigContext';

export default function LoginBox(): JSX.Element {
  const { login } = useAppAuth();
  const navigate = useNavigate();
  const { auth } = useAppConfig();
  const isFileBasedAuth = auth.enabled && auth.fileBasedAuth.enabled;

  const [signInError, setSignInError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const doLogin = async (credentials: { username: string; password: string }) => {
    setSignInError('');
    setIsSubmitting(true);
    try {
      await login(credentials);
      const raw = sessionStorage.getItem('ai_workspace_return_url') || '/';
      sessionStorage.removeItem('ai_workspace_return_url');
      const returnUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFileBasedAuth) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Sign in to AI Workspace
          </Typography>
          <Typography color="text.secondary">
            Enter your credentials to continue
          </Typography>
        </Box>

        {signInError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {signInError}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); doLogin({ username, password }); }}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            autoComplete="username"
            autoFocus
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      size="small"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            fullWidth
            variant="contained"
            startIcon={<Lock />}
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Sign in
          </Button>
        </Box>
      </Box>
    );
  }

  const handleOidcSignIn = async () => {
    setSignInError('');
    try {
      await login();
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 10 }}>
        <Typography variant="h3" gutterBottom>
          Sign in to AI Workspace
        </Typography>
        <Typography color="text.secondary">
          Sign in with your username and password to continue
        </Typography>
      </Box>

      {signInError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {signInError}
        </Alert>
      )}

      <Box display="flex" flexDirection="column" gap={3}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Lock />}
          onClick={handleOidcSignIn}
        >
          Sign in
        </Button>
      </Box>
    </Box>
  );
}
