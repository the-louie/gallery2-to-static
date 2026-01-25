/**
 * ViewAbortContext tests
 *
 * Verifies that the view abort signal changes when location changes and that
 * the previous signal is aborted when navigating.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useNavigate, Routes, Route } from 'react-router-dom';
import { ViewAbortProvider, useViewAbortSignal } from './ViewAbortContext';

function createWrapper(initialPath = '/') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <ViewAbortProvider>{children}</ViewAbortProvider>
      </MemoryRouter>
    );
  };
}

describe('ViewAbortContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides a stable signal within the same view', () => {
    const { result, rerender } = renderHook(() => useViewAbortSignal(), {
      wrapper: createWrapper('/album/1'),
    });

    const signal1 = result.current;
    expect(signal1).toBeDefined();
    expect(signal1.aborted).toBe(false);

    rerender();
    const signal2 = result.current;
    expect(signal2).toBe(signal1);
  });

  it('aborts previous signal when location changes', async () => {
    let currentPath = '/album/1';

    function RouterWithNav({ children }: { children: React.ReactNode }) {
      return (
        <MemoryRouter initialEntries={[currentPath]}>
          <ViewAbortProvider>{children}</ViewAbortProvider>
        </MemoryRouter>
      );
    }

    const { result, rerender } = renderHook(() => useViewAbortSignal(), {
      wrapper: RouterWithNav,
    });

    const signal1 = result.current;
    expect(signal1.aborted).toBe(false);

    const abortHandler = vi.fn();
    signal1.addEventListener('abort', abortHandler);

    currentPath = '/album/2';
    rerender({});

    await act(async () => {
      await Promise.resolve();
    });

    expect(signal1.aborted).toBe(true);
    expect(abortHandler).toHaveBeenCalled();
  });

  it('provides a new non-aborted signal after navigation', async () => {
    const ref: { signalA?: AbortSignal; signalB?: AbortSignal } = {};

    function PageA() {
      ref.signalA = useViewAbortSignal();
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/b')}>
          Go B
        </button>
      );
    }
    function PageB() {
      ref.signalB = useViewAbortSignal();
      return <span>Page B</span>;
    }

    render(
      <MemoryRouter initialEntries={['/a']}>
        <ViewAbortProvider>
          <Routes>
            <Route path="/a" element={<PageA />} />
            <Route path="/b" element={<PageB />} />
          </Routes>
        </ViewAbortProvider>
      </MemoryRouter>
    );

    const signalA = ref.signalA!;
    expect(signalA).toBeDefined();
    expect(signalA.aborted).toBe(false);

    await act(async () => {
      screen.getByText('Go B').click();
    });

    expect(signalA.aborted).toBe(true);
    expect(ref.signalB).toBeDefined();
    expect(ref.signalB!.aborted).toBe(false);
    expect(ref.signalB).not.toBe(signalA);
  });
});
