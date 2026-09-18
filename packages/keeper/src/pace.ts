/** A clock and a wait, swapped out in tests so the pacing can be asserted without real time. */
export interface PaceHooks {
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

const REAL_SLEEP = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/**
 * The keeper's own speed limit: at most one request started every `minGapMs`.
 *
 * The endpoint counts requests per second and refuses the rest. A pass reads about twenty-eight
 * times, and from a data centre those round trips take a few milliseconds each, so the whole pass
 * arrives inside one second and a single keeper can trip a shared limit on its own. On a laptop
 * the same pass takes six seconds and never shows the problem, which is why this is measured
 * rather than guessed.
 *
 * Callers are served in the order they asked, one at a time, so a burst queues instead of all
 * waiting the same amount and then firing together.
 */
export class Pacer {
  private readonly minGapMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  /** The end of the queue. Each caller waits for the one in front of it. */
  private tail: Promise<void> = Promise.resolve();
  private lastAt = Number.NEGATIVE_INFINITY;

  constructor(minGapMs: number, hooks: PaceHooks = {}) {
    this.minGapMs = minGapMs;
    this.now = hooks.now ?? Date.now;
    this.sleep = hooks.sleep ?? REAL_SLEEP;
  }

  /** Resolves when the caller may start its request. */
  wait(): Promise<void> {
    const mine = this.tail.then(() => this.hold());
    this.tail = mine.then(
      () => undefined,
      () => undefined,
    );
    return mine;
  }

  /** Runs one request at the paced rate. */
  async run<T>(work: () => Promise<T>): Promise<T> {
    await this.wait();
    return work();
  }

  private async hold(): Promise<void> {
    const due = this.lastAt + this.minGapMs;
    const now = this.now();
    if (now < due) await this.sleep(due - now);
    // Read the clock again rather than trusting `due`: a real sleep overshoots, and counting the
    // overshoot as part of the gap is what keeps the measured rate at or under the limit.
    this.lastAt = this.now();
  }
}
