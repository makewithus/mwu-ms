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

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Provide a safe wrapper around response.json()
  const originalJson = response.json.bind(response);
  response.json = async () => {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return { error: 'Invalid JSON response from server' };
    }
  };

  return response;
}
