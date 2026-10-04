import { auth } from './firebase/client';

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const DEFAULT_CACHE_TTL_MS = 30_000;
const apiCache = new Map<string, CacheEntry<unknown>>();
const inFlightGets = new Map<string, Promise<unknown>>();
let authReadyPromise: Promise<void> | null = null;
let cachedToken: { uid: string; token: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

function getAuthReady() {
  authReadyPromise ??= auth.authStateReady();
  return authReadyPromise;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  await getAuthReady();
  
  if (!auth.currentUser) {
    // Prevent useless backend calls when the user is logged out (e.g. during redirects)
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 });
  }

  const user = auth.currentUser;
  const now = Date.now();
  if (!cachedToken || cachedToken.uid !== user.uid || cachedToken.expiresAt <= now) {
    tokenPromise ??= user.getIdToken().then((token) => {
      cachedToken = {
        uid: user.uid,
        token,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      return token;
    }).finally(() => {
      tokenPromise = null;
    });
  }

  const token = cachedToken?.uid === user.uid && cachedToken.expiresAt > now
    ? cachedToken.token
    : await tokenPromise;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Provide a safe wrapper around response.json()
  response.json = async () => {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: 'Invalid JSON response from server' };
    }
  };

  return response;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export function getCachedApiData<T>(key: string): T | null {
  const cached = apiCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return cached.data as T;
}

export function invalidateApiCache(keys?: string | string[]) {
  if (!keys) {
    apiCache.clear();
    return;
  }

  for (const key of Array.isArray(keys) ? keys : [keys]) {
    apiCache.delete(key);
  }
}

export async function apiGet<T>(
  url: string,
  options: { ttlMs?: number; force?: boolean } = {}
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;

  if (!options.force) {
    const cached = getCachedApiData<T>(url);
    if (cached) return cached;

    const inFlight = inFlightGets.get(url);
    if (inFlight) return inFlight as Promise<T>;
  }

  const request = fetchWithAuth(url, { cache: 'no-store' })
    .then((response) => parseApiResponse<T>(response))
    .then((data) => {
      apiCache.set(url, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .finally(() => {
      inFlightGets.delete(url);
    });

  inFlightGets.set(url, request);
  return request;
}

export function prefetchApi(urls: string[]) {
  urls.forEach((url) => {
    void apiGet(url).catch(() => {});
  });
}
