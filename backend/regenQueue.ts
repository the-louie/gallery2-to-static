/**
 * Debounced, serialised regeneration (Sprint 16 T-01; data-master.md "Commands"): `request()`
 * starts (or restarts) a 5 s timer; when it fires the injected runner (`generate.ts --changed`)
 * runs once. Requests that arrive while a run is in progress coalesce into exactly one follow-up
 * run after the run ends, again debounced. The runner never runs twice at the same time.
 */
export interface RegenQueueOptions {
    /** Debounce delay in ms (default 5000). */
    delayMs?: number;
    /** Receives the error of a failed run (default: console.error with the message only). */
    onError?: (err: unknown) => void;
}

export class RegenQueue {
    private readonly runner: () => Promise<void>;
    private readonly delayMs: number;
    private readonly onError: (err: unknown) => void;
    private timer: NodeJS.Timeout | undefined;
    private running = false;
    private pending = false;
    private idleWaiters: Array<() => void> = [];
    /** Completed runs (for monitoring and tests). */
    runs = 0;

    constructor(runner: () => Promise<void>, opts: RegenQueueOptions = {}) {
        this.runner = runner;
        this.delayMs = opts.delayMs ?? 5000;
        this.onError = opts.onError ?? ((err) => console.error(`regen failed: ${err instanceof Error ? err.message : String(err)}`));
    }

    /** Asks for a regeneration soon. Safe to call any number of times. */
    request(): void {
        if (this.running) {
            this.pending = true;
            return;
        }
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.fire(), this.delayMs);
        this.timer.unref?.();
    }

    /** True while a run is in progress or one is scheduled. */
    get busy(): boolean {
        return this.running || this.timer !== undefined || this.pending;
    }

    /** Resolves once nothing is running or scheduled (tests, graceful shutdown). */
    idle(): Promise<void> {
        if (!this.busy) return Promise.resolve();
        return new Promise((resolve) => this.idleWaiters.push(resolve));
    }

    /** Drops a scheduled (not yet started) run; a run in progress finishes. */
    cancel(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
        this.pending = false;
        this.settleIfIdle();
    }

    private async fire(): Promise<void> {
        this.timer = undefined;
        this.running = true;
        try {
            await this.runner();
            this.runs += 1;
        } catch (err) {
            this.onError(err);
        } finally {
            this.running = false;
        }
        if (this.pending) {
            this.pending = false;
            this.request();
        }
        this.settleIfIdle();
    }

    private settleIfIdle(): void {
        if (this.busy) return;
        const waiters = this.idleWaiters;
        this.idleWaiters = [];
        for (const w of waiters) w();
    }
}
