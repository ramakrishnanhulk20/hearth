"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sequence } from "./random";

export function ClaimBurst({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 44;

  const seeds = useMemo(() => {
    const noise = sequence(1337, N * 5);
    return Array.from({ length: N }, (_, index) => {
      const at = index * 5;
      const angle = noise[at] * Math.PI * 2;
      const elevation = (noise[at + 1] - 0.15) * Math.PI * 0.9;
      return {
        dir: [
          Math.cos(angle) * Math.cos(elevation),
          Math.sin(elevation) * 1.1 + 0.35,
          Math.sin(angle) * Math.cos(elevation),
        ] as const,
        speed: 2.2 + noise[at + 2] * 2.8,
        delay: noise[at + 3] * 0.14,
        spin: noise[at + 4] * Math.PI * 2,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const p = progressRef.current;
    const t = clock.elapsedTime;

    for (let i = 0; i < N; i++) {
      const seed = seeds[i];
      const local = THREE.MathUtils.clamp((p - seed.delay) / (1 - seed.delay), 0, 1);
      if (local <= 0) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const e = 1 - Math.pow(1 - local, 2);
      const dist = e * seed.speed;
      dummy.position.set(
        seed.dir[0] * dist,
        0.15 + seed.dir[1] * dist - e * e * 0.9,
        seed.dir[2] * dist,
      );
      const scale = 0.085 * Math.min(1, local * 6) * (local > 0.8 ? (1 - local) / 0.2 : 1);
      dummy.scale.setScalar(Math.max(0.001, scale));
      dummy.rotation.set(t * 3 + seed.spin, t * 2.2, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#ffe27a"
        emissive="#ffab2e"
        emissiveIntensity={2.8}
        metalness={0.85}
        roughness={0.25}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export function MintShower({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 22;

  const seeds = useMemo(() => {
    const noise = sequence(24680, N * 5);
    return Array.from({ length: N }, (_, index) => {
      const at = index * 5;
      return {
        x: (noise[at] - 0.5) * 6.2,
        z: (noise[at + 1] - 0.5) * 2.4 - 0.2,
        delay: noise[at + 2] * 0.55,
        sway: noise[at + 3] * Math.PI * 2,
        spin: noise[at + 4] * Math.PI * 2,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const p = progressRef.current;
    const t = clock.elapsedTime;

    for (let i = 0; i < N; i++) {
      const seed = seeds[i];
      const local = THREE.MathUtils.clamp((p - seed.delay) / 0.42, 0, 1);
      if (local <= 0 || local >= 1) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const y = 3.2 - local * 4.4;
      const x = seed.x + Math.sin(t * 1.5 + seed.sway) * 0.12;
      const scale = 0.07 * Math.min(1, local * 5) * (local > 0.8 ? (1 - local) / 0.2 : 1);
      dummy.position.set(x, y, seed.z);
      dummy.scale.setScalar(Math.max(0.001, scale));
      dummy.rotation.set(t * 2 + seed.spin, t * 1.3, 0);
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
        emissiveIntensity={2.2}
        metalness={0.9}
        roughness={0.25}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
