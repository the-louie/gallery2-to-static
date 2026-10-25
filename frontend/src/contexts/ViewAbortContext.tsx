/**
 * View Abort Context
 *
 * Provides a navigation-scoped AbortSignal so that in-flight image GETs (and other
 * view-scoped requests) can be canceled when the user navigates away. A new
 * AbortController is created whenever the location pathname or search changes, and
 * the previous controller is aborted in the effect cleanup.
 *
 * The controller is captured in the effect closure, so cleanup always aborts the
 * specific controller that was created by that effect invocation -- not the current
 * one. This prevents the race condition where a fast unmount/remount could abort a
 * newly created controller.
 *
 * React Strict Mode: Effects re-run on simulated remount, creating a fresh controller.
 * The cleanup from the simulated unmount correctly aborts only the first controller.
 *
 * @module frontend/src/contexts/ViewAbortContext
 */

import React, {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { getViewKey } from "@/utils/viewKey";

export interface ViewAbortContextValue {
  /** AbortSignal for the current view; aborts when user navigates away */
  signal: AbortSignal;
}

const defaultSignal = new AbortController().signal;

const ViewAbortContext = createContext<ViewAbortContextValue>({
  signal: defaultSignal,
});
ViewAbortContext.displayName = "ViewAbortContext";

export interface ViewAbortProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that creates a new AbortController whenever the view (getViewKey(pathname)) or
 * search changes. The effect cleanup aborts the controller captured in its closure, ensuring
 * that only the previous view's requests are canceled, not the current one. Stepping between
 * images of the same album is not a view change, so lightbox preloads are not aborted (PERF-03).
 */
export function ViewAbortProvider({
  children,
}: ViewAbortProviderProps): React.ReactElement {
  const location = useLocation();
  const viewKey = getViewKey(location.pathname);
  const [signal, setSignal] = useState<AbortSignal>(() => defaultSignal);

  useEffect(() => {
    const controller = new AbortController();
    setSignal(controller.signal);

    return () => {
      controller.abort();
    };
  }, [viewKey, location.search]);

  const value = useMemo<ViewAbortContextValue>(() => ({ signal }), [signal]);

  return (
    <ViewAbortContext value={value}>
      {children}
    </ViewAbortContext>
  );
}

/**
 * Returns the current view's AbortSignal. Stable for the lifetime of the current view;
 * aborts when the user navigates away (pathname or search change).
 * Must be used within ViewAbortProvider (inside Router).
 */
export function useViewAbortSignal(): AbortSignal {
  const { signal } = use(ViewAbortContext);
  return signal;
}

export { ViewAbortContext };
