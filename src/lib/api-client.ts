import { auth } from './firebase/client';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  await auth.authStateReady();
  
  if (!auth.currentUser) {
    // Prevent useless backend calls when the user is logged out (e.g. during redirects)
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 });
  }

  const token = await auth.currentUser.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers
  });
}
