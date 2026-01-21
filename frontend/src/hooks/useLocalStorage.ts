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
 * - localStorage not available (private browsing, SSR)
 * - Quota exceeded errors
 * - JSON parse errors for corrupted data
 *
 * In all error cases, the hook falls back to the initial value and
 * logs warnings in development mode.
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
 * Check if localStorage is available
 * @returns true if localStorage is available and working
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
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
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
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

        // Save state
        setStoredValue(valueToStore);

        // Save to localStorage if available
        if (isLocalStorageAvailable()) {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
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
          console.warn(`Error parsing storage event for key "${key}":`, error);
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
