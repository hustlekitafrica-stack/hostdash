/**
 * API key authentication middleware.
 *
 * Supports Bearer token auth via `Authorization: Bearer sk_live_...`
 * alongside the existing Supabase session auth.
 */

import { createHash } from 'crypto';
import { publicSupabase } from './supabase/public';

export interface ApiAuthResult {
  userId: string;
}

/**
 * Attempt to authenticate a request using a Bearer API key.
 * Returns the userId if valid, or null if no valid key is found.
 *
 * Usage in an API route:
 * ```ts
 * const apiUser = await authenticateApiKey(request);
 * if (apiUser) userId = apiUser.userId;
 * ```
 */
export async function authenticateApiKey(
  request: Request,
): Promise<ApiAuthResult | null> {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey || !rawKey.startsWith('sk_live_')) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await publicSupabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();

  if (error || !data) return null;

  // Update last_used_at (fire-and-forget)
  publicSupabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return { userId: data.user_id };
}
