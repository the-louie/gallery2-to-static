/**
 * RegenQueue tests (Sprint 16 T-01): debounce, one run at a time, coalescing during a run, errors
 * do not stop later runs. Uses short real delays.
 */
import assert from 'assert';
import { RegenQueue } from './regenQueue.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(): Promise<void> {
    // debounce: five requests inside the window -> one run
    let starts = 0;
    let concurrent = 0;
    let maxConcurrent = 0;
    const q = new RegenQueue(async () => {
        starts += 1;
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await sleep(40);
        concurrent -= 1;
    }, { delayMs: 30 });
    assert.strictEqual(q.busy, false);
    for (let i = 0; i < 5; i++) {
        q.request();
        await sleep(5);
    }
    assert.strictEqual(starts, 0, 'nothing runs before the delay');
    assert.strictEqual(q.busy, true);
    await q.idle();
    assert.strictEqual(starts, 1, 'five requests in the window run once');
    assert.strictEqual(q.runs, 1);

    // requests during a run coalesce into exactly one follow-up run
    q.request();
    await sleep(45); // now inside the run (30 ms delay + 40 ms run)
    assert.strictEqual(starts, 2);
    q.request();
    q.request();
    q.request();
    await q.idle();
    assert.strictEqual(starts, 3, 'one follow-up run, not three');
    assert.strictEqual(maxConcurrent, 1, 'never two runs at once');

    // a request after idle starts a fresh cycle
    q.request();
    await q.idle();
    assert.strictEqual(starts, 4);

    // cancel drops a scheduled run
    q.request();
    q.cancel();
    await sleep(60);
    assert.strictEqual(starts, 4, 'cancelled before it fired');
    assert.strictEqual(q.busy, false);

    // a failing run is reported and does not block the next one
    const errors: string[] = [];
    let n = 0;
    const q2 = new RegenQueue(async () => {
        n += 1;
        if (n === 1) throw new Error('disk full');
    }, { delayMs: 10, onError: (e) => errors.push((e as Error).message) });
    q2.request();
    await q2.idle();
    assert.deepStrictEqual(errors, ['disk full']);
    assert.strictEqual(q2.runs, 0, 'a failed run is not counted');
    q2.request();
    await q2.idle();
    assert.strictEqual(n, 2);
    assert.strictEqual(q2.runs, 1);

    // default delay is 5 s
    const q3 = new RegenQueue(async () => {});
    assert.strictEqual((q3 as unknown as { delayMs: number }).delayMs, 5000);

    console.log('regenQueue tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });
