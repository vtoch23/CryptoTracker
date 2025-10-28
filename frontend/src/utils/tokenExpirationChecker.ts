/**
 * Token Expiration Checker
 * Automatically monitors JWT token expiration and redirects to login when expired
 */

interface TokenPayload {
  sub: number;
  exp: number;
}

// Decode JWT token and extract payload
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid token format');
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

//Check if token is expired
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTimeUntilExpiration(token: string): number {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();
  const timeRemaining = expirationTime - currentTime;

  return Math.max(0, timeRemaining);
}

/**
 * Start monitoring token expiration
 * Returns a cleanup function to stop monitoring
 */
export function startTokenExpirationMonitor(
  onExpired: () => void,
  checkIntervalMs: number = 10000 // Check every 10 seconds by default
): () => void {
  console.log('Starting token expiration monitor...');

  const checkExpiration = () => {
    const token = localStorage.getItem('token');

    if (!token) {
      console.log('No token found in localStorage');
      onExpired();
      return;
    }

    const payload = decodeToken(token);
    if (!payload) {
      console.log('Invalid token detected');
      onExpired();
      return;
    }

    const timeRemaining = getTimeUntilExpiration(token);
    const expirationDate = new Date(payload.exp * 1000);

    if (timeRemaining <= 0) {
      console.log('Token has expired!');
      console.log(`Expired at: ${expirationDate.toLocaleString()}`);
      console.log(`Current time: ${new Date().toLocaleString()}`);
      console.log('Calling onExpired callback...');
      onExpired();
      console.log('onExpired callback completed');
      return;
    }

    // Log time remaining (only if less than 5 minutes)
    if (timeRemaining < 5 * 60 * 1000) {
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      console.log(`Token expires in ${minutes}m ${seconds}s (at ${expirationDate.toLocaleTimeString()})`);
    }
  };

  // Check immediately on start
  checkExpiration();

  // Set up interval to check periodically
  const intervalId = setInterval(checkExpiration, checkIntervalMs);

  // Return cleanup function
  return () => {
    console.log('Stopping token expiration monitor');
    clearInterval(intervalId);
  };
}

/**
 * One-time check for token expiration
 */
export function checkTokenExpiration(): {
  isExpired: boolean;
  timeRemaining: number;
  expirationDate: Date | null;
} {
  const token = localStorage.getItem('token');

  if (!token) {
    return {
      isExpired: true,
      timeRemaining: 0,
      expirationDate: null,
    };
  }

  const payload = decodeToken(token);
  if (!payload) {
    return {
      isExpired: true,
      timeRemaining: 0,
      expirationDate: null,
    };
  }

  const timeRemaining = getTimeUntilExpiration(token);
  const expirationDate = new Date(payload.exp * 1000);

  return {
    isExpired: timeRemaining <= 0,
    timeRemaining,
    expirationDate,
  };
}
