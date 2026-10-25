/**
 * Error handling for the recursive album walk (LOGIC-21).
 *
 * Child album walks are started before the parent awaits its own photos, so a child that rejects
 * early would be an unhandled rejection until the parent reaches its `await` — and Node 22 exits on
 * unhandled rejections, skipping the run's catch/finally and summary. settleSubtree attaches the
 * handler immediately and records the failure instead, so the rest of the tree is still extracted
 * and the run ends with a list of failed albums and a non-zero exit code.
 */

export interface SubtreeFailure {
    albumId: number;
    message: string;
}

/** Wrap a child album walk: never rejects; a failure is appended to `failures`. */
export function settleSubtree(walk: Promise<void>, albumId: number, failures: SubtreeFailure[]): Promise<void> {
    return walk.then(
        () => undefined,
        (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`Album ${albumId} failed, its subtree is incomplete: ${message}`);
            failures.push({ albumId, message });
        },
    );
}

/** Summary lines for the end of a run; empty when nothing failed. */
export function formatSubtreeFailures(failures: SubtreeFailure[]): string[] {
    if (failures.length === 0) return [];
    const sorted = [...failures].sort((a, b) => a.albumId - b.albumId);
    return [`${failures.length} album subtree(s) FAILED (output incomplete):`, ...sorted.map((f) => `  - album ${f.albumId}: ${f.message}`)];
}
