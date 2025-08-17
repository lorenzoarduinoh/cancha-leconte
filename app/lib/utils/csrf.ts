/**
 * CSRF token utility functions for frontend
 */

/**
 * Get CSRF token from cookies
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('cancha-csrf-token='));
  
  if (csrfCookie) {
    return csrfCookie.split('=')[1];
  }
  
  return null;
}

/**
 * Make a request with CSRF token
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCSRFToken();
  
  const headers = {
    ...options.headers,
    ...(csrfToken && { 'x-csrf-token': csrfToken }),
  };
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Initialize CSRF token by making a GET request to login endpoint
 */
export async function initializeCSRF(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      // Token should now be in cookies
      return getCSRFToken();
    }
  } catch (error) {
    console.error('Failed to initialize CSRF token:', error);
  }
  
  return null;
}