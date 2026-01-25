/**
 * View Abort Context
 *
 * Provides a navigation-scoped AbortSignal so that in-flight image GETs (and other
 * view-scoped requests) can be canceled when the user navigates away. The signal
 * is stable for the lifetime of the current view and aborts when location changes.
 *
 * React Strict Mode: The controller is tied to location (view identity), not component
 * mount, so double-mount does not create a new controller or abort the current view's
 * requests prematurely.
 *
 * @module frontend/src/contexts/ViewAbortContext
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface ViewAbortContextValue {
  /** AbortSignal for the current view; aborts when user navigates away */
  signal: AbortSignal;
}

const defaultSignal = new AbortController().signal;

const ViewAbortContext = createContext<ViewAbortContextValue>({ signal: defaultSignal });
ViewAbortContext.displayName = 'ViewAbortContext';

export interface ViewAbortProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that creates a new AbortController whenever location (pathname or key) changes.
 * Aborts the previous controller before creating the new one so in-flight requests
 * for the previous view are canceled.
 */
export function ViewAbortProvider({ children }: ViewAbortProviderProps): React.ReactElement {
  const location = useLocation();
  const [signal, setSignal] = useState<AbortSignal>(() => defaultSignal);

  const viewIdentity = `${location.pathname}:${location.key}`;

  useEffect(() => {
    const controller = new AbortController();
    setSignal(controller.signal);

    return () => {
      controller.abort();
    };
  }, [viewIdentity]);

  const value = useMemo<ViewAbortContextValue>(() => ({ signal }), [signal]);

  return (
    <ViewAbortContext.Provider value={value}>
      {children}
    </ViewAbortContext.Provider>
  );
}

/**
 * Returns the current view's AbortSignal. Stable for the lifetime of the current view;
 * aborts when the user navigates away (pathname or key change).
 * Must be used within ViewAbortProvider (inside Router).
 */
export function useViewAbortSignal(): AbortSignal {
  const { signal } = useContext(ViewAbortContext);
  return signal;
}

export { ViewAbortContext };
