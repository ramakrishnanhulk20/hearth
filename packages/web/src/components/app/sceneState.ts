export type Signal = { current: number };

const sig = (v = 0): Signal => ({ current: v });

export const sceneSignals = {

  brightness: sig(0.05),

  boost: sig(0),

  fill: sig(0),

  deposit: sig(0),

  withdraw: sig(0),

  draw: sig(0),

  winGlow: sig(0),

  winnerIndex: sig(-1),

  peek: sig(0),

  burst: sig(0),

  mint: sig(0),
};

export type SceneSignals = typeof sceneSignals;

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __lanternScene?: SceneSignals }).__lanternScene = sceneSignals;
}
