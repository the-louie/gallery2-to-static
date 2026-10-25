/**
 * ViewAbortContext tests
 *
 * Verifies that the view abort signal changes when location changes and that
 * the previous signal is aborted when navigating.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, useNavigate, Routes, Route } from "react-router-dom";
import { ViewAbortProvider, useViewAbortSignal } from "./ViewAbortContext";

function createWrapper(initialPath = "/") {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <ViewAbortProvider>{children}</ViewAbortProvider>
      </MemoryRouter>
    );
  };
}

describe("ViewAbortContext", () => {
  it("gives a live signal from the first render and keeps it after mount (REFAC-01)", () => {
    const seen: AbortSignal[] = [];
    const { result } = renderHook(
      () => {
        const signal = useViewAbortSignal();
        seen.push(signal);
        return signal;
      },
      { wrapper: createWrapper("/album/1") },
    );
    expect(seen[0].aborted).toBe(false);
    expect(new Set(seen).size).toBe(1); // not swapped after mount: fetches started on mount keep running
    expect(result.current).toBe(seen[0]);
  });

  it("StrictMode: the signal children end up with is live", () => {
    const { result } = renderHook(() => useViewAbortSignal(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <React.StrictMode>
          <MemoryRouter initialEntries={["/"]}>
            <ViewAbortProvider>{children}</ViewAbortProvider>
          </MemoryRouter>
        </React.StrictMode>
      ),
    });
    expect(result.current.aborted).toBe(false);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides a stable signal within the same view", () => {
    const { result, rerender } = renderHook(() => useViewAbortSignal(), {
      wrapper: createWrapper("/album/1"),
    });

    const signal1 = result.current;
    expect(signal1).toBeDefined();
    expect(signal1.aborted).toBe(false);

    rerender();
    const signal2 = result.current;
    expect(signal2).toBe(signal1);
  });

  it("aborts previous signal when location changes", async () => {
    const ref: { signal?: AbortSignal } = {};

    function PageOne() {
      ref.signal = useViewAbortSignal();
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/album/2")}>
          Nav
        </button>
      );
    }
    function PageTwo() {
      ref.signal = useViewAbortSignal();
      return <span>Page Two</span>;
    }

    render(
      <MemoryRouter initialEntries={["/album/1"]}>
        <ViewAbortProvider>
          <Routes>
            <Route path="/album/1" element={<PageOne />} />
            <Route path="/album/2" element={<PageTwo />} />
          </Routes>
        </ViewAbortProvider>
      </MemoryRouter>
    );

    const signal1 = ref.signal!;
    expect(signal1.aborted).toBe(false);

    const abortHandler = vi.fn();
    signal1.addEventListener("abort", abortHandler);

    await act(async () => {
      screen.getByText("Nav").click();
    });

    expect(signal1.aborted).toBe(true);
    expect(abortHandler).toHaveBeenCalled();
  });

  it("provides a new non-aborted signal after navigation", async () => {
    const ref: { signalA?: AbortSignal; signalB?: AbortSignal } = {};

    function PageA() {
      ref.signalA = useViewAbortSignal();
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/b")}>
          Go B
        </button>
      );
    }
    function PageB() {
      ref.signalB = useViewAbortSignal();
      return <span>Page B</span>;
    }

    render(
      <MemoryRouter initialEntries={["/a"]}>
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
      screen.getByText("Go B").click();
    });

    expect(signalA.aborted).toBe(true);
    expect(ref.signalB).toBeDefined();
    expect(ref.signalB!.aborted).toBe(false);
    expect(ref.signalB).not.toBe(signalA);
  });

  it("produces non-aborted signal after rapid navigation A -> B -> C", async () => {
    const ref: { signals: AbortSignal[] } = { signals: [] };

    function PageA() {
      ref.signals.push(useViewAbortSignal());
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/b")}>
          Go B
        </button>
      );
    }
    function PageB() {
      ref.signals.push(useViewAbortSignal());
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/c")}>
          Go C
        </button>
      );
    }
    function PageC() {
      ref.signals.push(useViewAbortSignal());
      return <span>Page C</span>;
    }

    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ViewAbortProvider>
          <Routes>
            <Route path="/a" element={<PageA />} />
            <Route path="/b" element={<PageB />} />
            <Route path="/c" element={<PageC />} />
          </Routes>
        </ViewAbortProvider>
      </MemoryRouter>
    );

    await act(async () => {
      screen.getByText("Go B").click();
    });

    await act(async () => {
      screen.getByText("Go C").click();
    });

    // All intermediate signals should be aborted
    // The final signal (page C) should NOT be aborted
    const lastSignal = ref.signals[ref.signals.length - 1];
    expect(lastSignal.aborted).toBe(false);
  });

  it("creates new signal when search params change on same path", async () => {
    const ref: { signal?: AbortSignal } = {};

    function Page() {
      ref.signal = useViewAbortSignal();
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/a?q=test")}>
          Search
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ViewAbortProvider>
          <Routes>
            <Route path="/a" element={<Page />} />
          </Routes>
        </ViewAbortProvider>
      </MemoryRouter>
    );

    const signalBefore = ref.signal!;
    expect(signalBefore.aborted).toBe(false);

    await act(async () => {
      screen.getByText("Search").click();
    });

    expect(signalBefore.aborted).toBe(true);
    expect(ref.signal!.aborted).toBe(false);
    expect(ref.signal).not.toBe(signalBefore);
  });

  it("cleanup aborts only the previous controller, not the current one", async () => {
    const ref: { signalA?: AbortSignal; signalB?: AbortSignal } = {};

    function PageA() {
      ref.signalA = useViewAbortSignal();
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/b")}>
          Go B
        </button>
      );
    }
    function PageB() {
      ref.signalB = useViewAbortSignal();
      return <span>Page B</span>;
    }

    render(
      <MemoryRouter initialEntries={["/a"]}>
        <ViewAbortProvider>
          <Routes>
            <Route path="/a" element={<PageA />} />
            <Route path="/b" element={<PageB />} />
          </Routes>
        </ViewAbortProvider>
      </MemoryRouter>
    );

    await act(async () => {
      screen.getByText("Go B").click();
    });

    // Previous signal aborted, current signal fresh
    expect(ref.signalA!.aborted).toBe(true);
    expect(ref.signalB!.aborted).toBe(false);
  });

  it("keeps the signal when only the image changes within the same album (PERF-03)", async () => {
    const ref: { signal?: AbortSignal } = {};
    function Viewer() {
      ref.signal = useViewAbortSignal();
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate("/album/7/image/13")}>
            Next
          </button>
          <button type="button" onClick={() => navigate("/album/8/image/1")}>
            Other album
          </button>
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={["/album/7/image/12"]}>
        <ViewAbortProvider>
          <Routes>
            <Route path="/album/:albumId/image/:imageId" element={<Viewer />} />
          </Routes>
        </ViewAbortProvider>
      </MemoryRouter>
    );
    const first = ref.signal!;
    await act(async () => {
      screen.getByText("Next").click();
    });
    expect(first.aborted).toBe(false);
    expect(ref.signal).toBe(first);

    await act(async () => {
      screen.getByText("Other album").click();
    });
    expect(first.aborted).toBe(true);
  });
});
