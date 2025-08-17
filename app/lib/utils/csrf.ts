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
    const tokenValue = csrfCookie.split('=')[1];
    // Handle empty cookie values
    if (!tokenValue || tokenValue.trim() === '') {
      return null;
    }
    // Decode URL-encoded cookie values
    return decodeURIComponent(tokenValue);
  }
  
  return null;
}

/**
 * Make a request with CSRF token
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCSRFToken();
  
  // For state-changing operations, require CSRF token
  const method = options.method?.toUpperCase();
  const requiresCSRF = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (requiresCSRF && !csrfToken) {
    throw new Error('CSRF token not found');
  }
  
  // Handle both plain objects and Headers instances
  let headers: Record<string, string> = {};
  
  if (options.headers) {
    if (options.headers instanceof Headers) {
      // Convert Headers to plain object, preserving original case
      for (const [key, value] of options.headers.entries()) {
        headers[key] = value;
      }
    } else {
      // Copy plain object
      headers = { ...options.headers as Record<string, string> };
    }
  }
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
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