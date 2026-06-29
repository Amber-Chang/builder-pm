// auth middleware — validates auth_token on incoming requests
export interface AuthContext {
  auth_token: string;
  user_id: string;
  expires_at: number;
}

export function validateAuthToken(auth_token: string): boolean {
  if (!auth_token || auth_token.length < 16) return false;
  return auth_token.startsWith('tok_');
}

export function parseAuthToken(auth_token: string): AuthContext | null {
  if (!validateAuthToken(auth_token)) return null;
  return {
    auth_token,
    user_id: auth_token.slice(4, 12),
    expires_at: Date.now() + 3600_000,
  };
}

export function refreshAuthToken(old_auth_token: string): string {
  if (!validateAuthToken(old_auth_token)) {
    throw new Error(`Invalid auth_token for refresh`);
  }
  return `tok_refreshed_${Date.now()}`;
}
