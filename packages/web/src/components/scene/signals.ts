export type Signal = { current: number };

const sig = (value = 0): Signal => ({ current: value });

/**
 * Plain mutable numbers the scene reads every frame.
 *
 * They are not React state on purpose: a scroll-driven or transaction-driven animation writes to
 * them sixty times a second, and re-rendering the app that often would drop frames on the one
 * screen that has to stay smooth.
 */
export const sceneSignals = {
  /** How lit the hearth is at rest. Rises when a wallet connects. */
  brightness: sig(0.05),
  /** A short flare over the resting brightness while something is happening. */
  boost: sig(0),
  /** Coins falling into the hearth during a deposit. */
  deposit: sig(0),
  /** Coins rising out of it during a withdrawal. */
  withdraw: sig(0),
  /** The spark crossing the pool during a draw. */
  draw: sig(0),
  /** How brightly the flame the draw stopped at is burning. */
  winGlow: sig(0),
  /** Which flame in the crowd the draw is heading for. */
  winnerIndex: sig(-1),
  /** How far the saver's own flame is opened while a reveal is in flight. */
  peek: sig(0),
  /** The burst when a prize is claimed. */
  burst: sig(0),
  /** Test USDC raining in from the faucet. */
  mint: sig(0),
};

export type SceneSignals = typeof sceneSignals;

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __hearthScene?: SceneSignals }).__hearthScene = sceneSignals;
}
