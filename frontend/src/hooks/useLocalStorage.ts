/**
 * React hook for localStorage persistence
 *
 * Provides a state value synced with localStorage. Handles errors gracefully
 * when localStorage is unavailable (e.g., private browsing mode).
 *
 * ## Features
 *
 * - Generic type support for any serializable value
 * - Automatic JSON serialization/deserialization
 * - Graceful error handling for localStorage unavailability
 * - Fallback to initial value on errors
 * - Supports functional updates like useState
 *
 * ## Error Handling
 *
 * The hook handles the following error cases:
 * - localStorage not available (private browsing, SSR, disabled)
 * - Quota exceeded errors (QUOTA_EXCEEDED_ERR)
 * - Security errors (SECURITY_ERR) - private browsing mode
 * - JSON parse errors for corrupted data
 * - Write failures (state still updates optimistically)
 *
 * In all error cases, the hook falls back gracefully:
 * - Read errors: Returns initial value
 * - Write errors: State updates optimistically, but persistence fails silently
 * - Corrupted data: Automatically cleaned up from localStorage
 * - All errors: Logged as warnings in development mode only
 *
 * ## Usage
 *
 * ```tsx
 * function ThemeSelector() {
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 *
 *   return (
 *     <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
 *       Current: {theme}
 *     </button>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Check if localStorage is available and working
 * @returns true if localStorage is available and working, false otherwise
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    // Handle specific error types
    if (error instanceof DOMException) {
      // SECURITY_ERR: Private browsing mode or localStorage disabled
      // QUOTA_EXCEEDED_ERR: Storage quota exceeded
      // These are expected in some scenarios, so we just return false
      return false;
    }
    return false;
  }
}

/**
 * Get the specific error type from a DOMException
 * @param error - The error to check
 * @returns The error name or 'UNKNOWN_ERROR'
 */
function getErrorType(error: unknown): string {
  if (error instanceof DOMException) {
    return error.name;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Hook to persist state in localStorage
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no value exists in localStorage
 * @returns A tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * const [name, setName] = useLocalStorage('userName', 'Guest');
 *
 * // Direct update
 * setName('John');
 *
 * // Functional update
 * setName(prev => prev.toUpperCase());
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use provided initialValue
  const readValue = useCallback((): T => {
    // Return initial value if localStorage is not available
    if (!isLocalStorageAvailable()) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`localStorage is not available. Using initial value for key "${key}".`);
      }
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      const errorType = getErrorType(error);
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Error reading localStorage key "${key}" (${errorType}):`,
          error instanceof Error ? error.message : error
        );
      }
      // If data is corrupted, remove it to prevent future errors
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore errors when trying to clean up corrupted data
      }
      return initialValue;
    }
  }, [key, initialValue]);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save state first (optimistic update)
        setStoredValue(valueToStore);

        // Save to localStorage if available
        if (isLocalStorageAvailable()) {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (storageError) {
            const errorType = getErrorType(storageError);

            // Handle quota exceeded error
            if (errorType === 'QuotaExceededError') {
              if (process.env.NODE_ENV === 'development') {
                console.warn(
                  `localStorage quota exceeded for key "${key}". Value will not be persisted.`
                );
              }
              // State is already updated, but persistence failed
              // This is acceptable - the app continues to work
              return;
            }

            // Handle security error (private browsing)
            if (errorType === 'SecurityError') {
              if (process.env.NODE_ENV === 'development') {
                console.warn(
                  `localStorage access denied for key "${key}" (likely private browsing mode). Value will not be persisted.`
                );
              }
              // State is already updated, but persistence failed
              return;
            }

            // Other errors
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                `Error setting localStorage key "${key}" (${errorType}):`,
                storageError instanceof Error ? storageError.message : storageError
              );
            }
          }
        }
      } catch (error) {
        // This catch handles errors in the value computation (functional updates)
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `Error computing value for localStorage key "${key}":`,
            error instanceof Error ? error.message : error
          );
        }
        // Don't update state if value computation failed
      }
    },
    [key, storedValue]
  );

  // Listen for changes to this key in other tabs/windows
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Error parsing storage event for key "${key}":`, error);
          }
        }
      } else if (event.key === key && event.newValue === null) {
        // Key was removed, reset to initial value
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
