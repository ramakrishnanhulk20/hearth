"use client";

import { MeshTransmissionMaterial, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sequence } from "./random";

const FLAME = new THREE.Color("#ffb340");

const ATTEN_BASE = new THREE.Color("#3a2f14");

export function FocalFlame({
  brightness = 1,
  fill = 0,
  boostRef,
  fillRef,
  brightnessRef,
}: {

  brightness?: number;

  fill?: number;

  boostRef?: React.MutableRefObject<number>;

  fillRef?: React.MutableRefObject<number>;

  brightnessRef?: React.MutableRefObject<number>;
}) {
  const light = useRef<THREE.PointLight>(null);
  const core = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.82 + Math.sin(t * 2.3) * 0.11 + Math.sin(t * 5.7) * 0.06;
    const boost = boostRef ? boostRef.current : 0;
    const f = fillRef ? fillRef.current : fill;
    const br = brightnessRef ? brightnessRef.current : brightness;
    const b = br * (1 + boost * 1.4 + f * 0.6);
    if (light.current) light.current.intensity = 6 * flicker * b;
    if (core.current) core.current.scale.setScalar((0.55 + b * 0.5) * (0.9 + flicker * 0.14));
    if (group.current) group.current.position.y = Math.sin(t * 0.6) * 0.05;
    if (glass.current && fillRef) {
      glass.current.attenuationColor.copy(ATTEN_BASE).lerp(FLAME, 0.3 + f * 0.7);
      glass.current.attenuationDistance = 2.6 - f * 1.4;
    }
  });

  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#191512", metalness: 0.95, roughness: 0.34 }),
    [],
  );

  return (
    <group ref={group}>
      <group position={[0, -0.12, 0]}>
        <pointLight ref={light} color="#ffb703" distance={5} decay={2} />
        <mesh ref={core}>
          <sphereGeometry args={[0.17, 20, 20]} />
          <meshBasicMaterial color="#ffd84d" toneMapped={false} />
        </mesh>
      </group>

      <mesh position={[0, 1.02, 0]} material={metal}>
        <cylinderGeometry args={[0.46, 0.52, 0.13, 24]} />
      </mesh>
      <mesh position={[0, -1.02, 0]} material={metal}>
        <cylinderGeometry args={[0.52, 0.46, 0.13, 24]} />
      </mesh>
      <mesh position={[0, 1.36, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <torusGeometry args={[0.26, 0.035, 10, 28, Math.PI * 1.35]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44]} material={metal}>
            <cylinderGeometry args={[0.022, 0.022, 2.04, 6]} />
          </mesh>
        );
      })}

      <RoundedBox args={[0.94, 2.04, 0.94]} radius={0.07} smoothness={4}>
        <MeshTransmissionMaterial
          ref={glass as never}
          transmission={1}
          thickness={0.85}
          roughness={0.16}
          ior={1.5}

          chromaticAberration={0.04}
          anisotropy={0.1}
          distortion={0.16}
          distortionScale={0.25}
          temporalDistortion={0.04}
          backside
          samples={5}
          resolution={256}
          color="#e8e4d8"
          attenuationColor={new THREE.Color("#3a2f14").lerp(FLAME, 0.3 + fill * 0.7)}
          attenuationDistance={2.6 - fill * 1.4}
        />
      </RoundedBox>
    </group>
  );
}

export function DepositCoins({
  progressRef,
  reverse = false,
  fall = 3.4,
}: {
  progressRef: React.MutableRefObject<number>;

  reverse?: boolean;

  fall?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 16;

  const seeds = useMemo(() => {
    const noise = sequence(reverse ? 47 : 91, N * 3);
    return Array.from({ length: N }, (_, index) => {
      const at = index * 3;
      return {
        delay: (index / N) * 0.7,
        ox: (noise[at] - 0.5) * 1.8,
        oz: (noise[at + 1] - 0.5) * 1.8 - 0.3,
        wobble: noise[at + 2] * Math.PI * 2,
      };
    });
  }, [reverse]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const p = progressRef.current;
    const time = clock.elapsedTime;

    for (let i = 0; i < N; i++) {
      const seed = seeds[i];

      const local = THREE.MathUtils.clamp((p - seed.delay) / 0.32, 0, 1);
      if (local <= 0 || local >= 1) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const e = 1 - Math.pow(1 - local, 2);

      const rise = fall - 1.05;
      const y = reverse ? 1.05 + e * rise : fall - e * rise;
      const spread = reverse ? e : 1 - e;
      const x = seed.ox * spread + Math.sin(time * 3 + seed.wobble) * 0.05 * spread;
      const z = seed.oz * spread;

      const scale = 0.085 * Math.min(1, local * 5) * (local > 0.85 ? (1 - local) / 0.15 : 1);

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(time * 2 + i, time * 1.4, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 0.28, 14]} />
      <meshStandardMaterial
        color="#ffd23f"
        emissive="#ff9d00"
        emissiveIntensity={2.4}
        metalness={0.9}
        roughness={0.25}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export function SealPulse({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const ring = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const p = progressRef.current;

    const bump = p >= 0.99 ? 0 : Math.max(0, 1 - Math.abs(p - 0.88) / 0.1);
    const eased = bump * bump;

    if (ring.current) {
      const s = 0.5 + (1 - bump) * 1.4;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = eased * 0.9;
      ring.current.visible = eased > 0.01;
    }
  });

  return (
    <mesh ref={ring} position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
      <torusGeometry args={[0.5, 0.018, 8, 48]} />
      <meshBasicMaterial color="#ffd84d" transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}

export function DrawSpark({
  progressRef,
  target,
  spread = 7,
  lift = 2.2,
}: {
  progressRef: React.MutableRefObject<number>;
  target: [number, number, number];

  spread?: number;

  lift?: number;
}) {
  const spark = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const TRAIL = 22;

  const curve = useMemo(() => {
    const start = new THREE.Vector3(0, 0.1, 0);
    const end = new THREE.Vector3(target[0], target[1], target[2]);
    const pts: THREE.Vector3[] = [start];
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      const a = i / steps;
      const p = start.clone().lerp(end, a);
      p.x += Math.sin(a * Math.PI * 3) * spread * (1 - a);
      p.y += Math.sin(a * Math.PI * 2) * (spread * 0.5) + lift * (1 - a * 0.5);
      pts.push(p);
    }
    pts.push(end);
    return new THREE.CatmullRomCurve3(pts);
  }, [target, spread, lift]);

  useFrame(() => {
    const p = progressRef.current;
    const active = p > 0.002 && p < 0.999;

    if (spark.current) {
      spark.current.visible = active;
      if (active) {
        const point = curve.getPoint(p);
        spark.current.position.copy(point);

        const s = 0.16 * (0.6 + Math.min(1, p * 4)) * (p > 0.9 ? (1 - p) / 0.1 : 1);
        spark.current.scale.setScalar(Math.max(0.001, s));
      }
    }

    if (trail.current) {
      trail.current.visible = active;
      if (active) {
        for (let k = 0; k < TRAIL; k++) {
          const tp = Math.max(0, p - k * 0.012);
          const point = curve.getPoint(tp);
          const fade = (1 - k / TRAIL) * (p > 0.9 ? (1 - p) / 0.1 : 1);
          dummy.position.copy(point);
          dummy.scale.setScalar(Math.max(0.001, 0.09 * fade));
          dummy.updateMatrix();
          trail.current.setMatrixAt(k, dummy.matrix);
        }
        trail.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <mesh ref={spark} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#fff2c0" toneMapped={false} />
      </mesh>
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.7} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export type Flame = {
  position: [number, number, number];
  scale: number;
  glow: number;
  phase: number;
};

export function useFlameField(count: number): Flame[] {
  return useMemo(() => {
    const noise = sequence(20, count * 8);
    const items: Flame[] = [];
    for (let index = 0; index < count; index++) {
      const at = index * 8;
      // The square root spreads the crowd evenly over the disc instead of bunching it at the
      // centre, which is what makes the field read as depth rather than as a clump.
      const ring = Math.sqrt(noise[at]);
      const angle = noise[at + 1] * Math.PI * 2;
      const radius = 4 + ring * 42;
      items.push({
        position: [
          Math.cos(angle) * radius + (noise[at + 2] - 0.5) * 6,
          -2 - noise[at + 3] * 6 - ring * 3,
          -6 - ring * 60 + (noise[at + 4] - 0.5) * 8,
        ],
        scale: 0.5 + noise[at + 5] * 0.9,
        glow: 0.25 + noise[at + 6] * 0.5,
        phase: noise[at + 7] * Math.PI * 2,
      });
    }
    return items;
  }, [count]);
}

export type CrowdRefs = {

  reveal: React.MutableRefObject<number>;

  winner: React.MutableRefObject<number>;

  winGlow: React.MutableRefObject<number>;
};

export function FlameCrowd({ field, refs }: { field: Flame[]; refs: CrowdRefs }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const fittings = useRef<THREE.InstancedMesh>(null);
  const cores = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const n = field.length;

  const bodyGeo = useMemo(() => new RoundedBoxGeometry(0.5, 1.1, 0.5, 3, 0.07), []);

  const fittingsGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];

    const top = new THREE.CylinderGeometry(0.25, 0.3, 0.1, 14);
    top.translate(0, 0.56, 0);
    parts.push(top);

    const base = new THREE.CylinderGeometry(0.3, 0.25, 0.1, 14);
    base.translate(0, -0.56, 0);
    parts.push(base);

    for (const [x, z] of [
      [0.22, 0.22],
      [-0.22, 0.22],
      [0.22, -0.22],
      [-0.22, -0.22],
    ]) {
      const bar = new THREE.CylinderGeometry(0.02, 0.02, 1.06, 6);
      bar.translate(x, 0, z);
      parts.push(bar);
    }

    const hook = new THREE.TorusGeometry(0.1, 0.02, 6, 16, Math.PI * 1.35);
    hook.rotateX(Math.PI / 2);
    hook.translate(0, 0.7, 0);
    parts.push(hook);

    return mergeGeometries(parts, false) ?? top;
  }, []);

  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.13, 8, 8), []);

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0e0d0b",
        metalness: 0,
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.5,
        envMapIntensity: 1.5,
        ior: 1.45,
      }),
    [],
  );
  const metalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2a231b", metalness: 0.92, roughness: 0.38 }),
    [],
  );
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  useFrame(({ clock }) => {
    if (!body.current || !fittings.current || !cores.current) return;
    const t = clock.elapsedTime;
    const reveal = refs.reveal.current;
    const winner = refs.winner.current;
    const winGlow = refs.winGlow.current;

    for (let i = 0; i < n; i++) {
      const l = field[i];
      const flicker = 0.8 + Math.sin(t * 1.7 + l.phase) * 0.2;
      const isWinner = i === winner;
      const base = l.glow * flicker * reveal;
      const intensity = isWinner ? base + winGlow * 2.4 : base;
      const y = l.position[1] + Math.sin(t * 0.5 + l.phase) * 0.15;

      const rv = reveal * reveal * (3 - 2 * reveal);
      const s = l.scale * rv * (isWinner ? 1 + winGlow * 0.15 : 1);

      dummy.position.set(l.position[0], y, l.position[2]);
      dummy.scale.setScalar(s);
      dummy.rotation.set(0, l.phase, 0);
      dummy.updateMatrix();

      body.current.setMatrixAt(i, dummy.matrix);
      fittings.current.setMatrixAt(i, dummy.matrix);
      cores.current.setMatrixAt(i, dummy.matrix);

      color.copy(FLAME).multiplyScalar(Math.min(2.8, intensity));
      cores.current.setColorAt(i, color);
    }

    for (const mesh of [body, fittings, cores]) mesh.current!.instanceMatrix.needsUpdate = true;
    if (cores.current.instanceColor) cores.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={body} args={[bodyGeo, glassMat, n]} frustumCulled={false} />
      <instancedMesh ref={fittings} args={[fittingsGeo, metalMat, n]} frustumCulled={false} />
      <instancedMesh ref={cores} args={[coreGeo, coreMat, n]} frustumCulled={false} />
    </group>
  );
}
