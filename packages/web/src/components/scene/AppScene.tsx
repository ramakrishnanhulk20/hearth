"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, AdaptiveDpr, Preload } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import {
  FocalFlame,
  FlameCrowd,
  DepositCoins,
  SealPulse,
  DrawSpark,
  useFlameField,
} from "@/components/scene/flames";
import { ClaimBurst, MintShower } from "./effects";
import { sceneSignals as S } from "./signals";

const FOCAL_POS: [number, number, number] = [0, -0.5, 0.5];
const CROWD_POS: [number, number, number] = [0, 0.9, -3];

const pointer = { x: 0, y: 0 };

function Backdrop() {
  const field = useFlameField(150);
  const reveal = useRef(1);
  const winner = useRef(-1);
  const winGlow = useRef(0);
  const flare = useRef(0);
  const { camera } = useThree();
  const drift = useMemo(() => new THREE.Vector3(), []);

  const winnerIndex = useMemo(() => {
    let best = 0;
    let bestScore = Infinity;
    field.forEach((l, i) => {
      const depth = -l.position[2];
      if (depth < 6 || depth > 14) return;
      const score = Math.abs(l.position[0] + 1) + Math.abs(depth - 9);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  }, [field]);

  const drawTarget = useMemo<[number, number, number]>(() => {
    const w = field[winnerIndex].position;
    return [
      CROWD_POS[0] + w[0] - FOCAL_POS[0],
      CROWD_POS[1] + w[1] - FOCAL_POS[1],
      CROWD_POS[2] + w[2] - FOCAL_POS[2],
    ];
  }, [field, winnerIndex]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Published for the draw spark, which aims at whichever flame the crowd picked as the winner.
    S.winnerIndex.current = winnerIndex;
    winner.current = winnerIndex;
    winGlow.current = S.winGlow.current;

    flare.current = S.boost.current + S.peek.current * 0.5 + S.burst.current * 0.9;

    const targetX = Math.sin(t * 0.12) * 0.18 + pointer.x * 0.35;
    const targetY = 0.05 + Math.sin(t * 0.16) * 0.09 + pointer.y * 0.2;
    drift.set(targetX, targetY, camera.position.z);
    camera.position.lerp(drift, 0.03);
    camera.lookAt(0, -0.35, 0);
  });

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fogExp2 attach="fog" args={["#050505", 0.026]} />
      <ambientLight intensity={0.12} />

      <Environment resolution={128}>
        <Lightformer form="rect" intensity={1.4} position={[-3, 3, 2]} scale={[5, 6, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.1} position={[3, -2, 1.5]} scale={[4, 4, 1]} color="#f9d100" />
        <Lightformer form="rect" intensity={0.9} position={[0, 0.4, -4]} scale={[0.6, 5, 1]} color="#fff4e0" />
      </Environment>

      <group position={CROWD_POS}>
        <FlameCrowd field={field} refs={{ reveal, winner, winGlow }} />
      </group>

      <group position={FOCAL_POS}>
        <FocalFlame boostRef={flare} fillRef={S.peek} brightnessRef={S.brightness} />
        <DepositCoins progressRef={S.deposit} fall={1.6} />
        <DepositCoins progressRef={S.withdraw} reverse fall={1.6} />
        <SealPulse progressRef={S.deposit} />
        <ClaimBurst progressRef={S.burst} />
        <MintShower progressRef={S.mint} />
        <DrawSpark
          progressRef={S.draw}
          target={drawTarget}
          spread={Math.hypot(drawTarget[0], drawTarget[1]) * 0.09}
          lift={1.5}
        />
      </group>
    </>
  );
}

function StillBackdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(60% 55% at 72% 42%, rgba(249,183,64,0.16), transparent 60%)," +
          "radial-gradient(50% 60% at 20% 70%, rgba(249,209,0,0.06), transparent 65%)," +
          "#050505",
      }}
    />
  );
}

export default function AppScene() {
  const reduced = useReducedMotion();

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // A reader who has asked for reduced motion gets the same colours as a still image, with no
  // WebGL context, no render loop and no cost.
  if (reduced) return <StillBackdrop />;

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0.05, 7.6], fov: 38 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.72} luminanceSmoothing={0.28} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.22} darkness={0.9} />
        </EffectComposer>

        <Backdrop />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
    </div>
  );
}
