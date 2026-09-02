"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const IGNITE_DELAY = 0.25;
const IGNITE_TIME = 1.5;

function Ember({ quality }: { quality: number }) {
  const light = useRef<THREE.PointLight>(null);
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    const ignition = Math.min(1, Math.max(0, (t - IGNITE_DELAY) / IGNITE_TIME)) ** 1.7;

    const flicker = 0.82 + Math.sin(t * 2.3) * 0.11 + Math.sin(t * 5.7) * 0.06;

    if (light.current) light.current.intensity = 5.4 * flicker * ignition;
    if (core.current) core.current.scale.setScalar((0.9 + flicker * 0.14) * ignition);
    if (shell.current) shell.current.scale.setScalar(0.55 + ignition * 0.45);
  });

  const segments = quality > 0.5 ? 24 : 12;

  return (
    <group position={[0, -0.12, 0]}>
      <pointLight ref={light} color="#ffb703" distance={4.6} decay={2} />
      <mesh ref={core}>
        <sphereGeometry args={[0.17, segments, segments]} />
        <meshBasicMaterial color="#ffd84d" toneMapped={false} />
      </mesh>
      <mesh ref={shell}>
        <sphereGeometry args={[0.3, segments, segments]} />
        <meshBasicMaterial color="#f9a300" transparent opacity={0.28} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Fittings() {

  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#191512", metalness: 0.95, roughness: 0.34 }),
    [],
  );

  return (
    <group>
      <mesh position={[0, 1.02, 0]} material={metal}>
        <cylinderGeometry args={[0.46, 0.52, 0.13, 32]} />
      </mesh>
      <mesh position={[0, -1.02, 0]} material={metal}>
        <cylinderGeometry args={[0.52, 0.46, 0.13, 32]} />
      </mesh>
      <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <torusGeometry args={[0.26, 0.035, 12, 32, Math.PI * 1.35]} />
      </mesh>
      <mesh position={[0, 4.4, 0]} material={metal}>
        <cylinderGeometry args={[0.012, 0.012, 6, 6]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.44, 0, Math.sin(angle) * 0.44]} material={metal}>
            <cylinderGeometry args={[0.022, 0.022, 2.04, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

function GroundPool() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const ignition = Math.min(1, Math.max(0, (t - IGNITE_DELAY) / IGNITE_TIME)) ** 1.7;
    const flicker = 0.86 + Math.sin(t * 2.3) * 0.09;
    const material = mesh.current?.material as THREE.MeshBasicMaterial | undefined;
    if (material) material.opacity = 0.5 * ignition * flicker;
  });

  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,196,64,1)");
    gradient.addColorStop(0.4, "rgba(249,163,0,0.42)");
    gradient.addColorStop(1, "rgba(249,163,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.35, 0]}>
      <planeGeometry args={[7.5, 7.5]} />
      <meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Lantern({ quality }: { quality: number }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useFrame(({ clock, pointer }, delta) => {
    if (!group.current) return;

    target.current.x = pointer.y * 0.16;
    target.current.y = pointer.x * 0.42;

    const t = clock.elapsedTime;
    const k = Math.min(1, delta * 2.4);
    group.current.rotation.x += (target.current.x - group.current.rotation.x) * k;
    group.current.rotation.y += (target.current.y + t * 0.11 - group.current.rotation.y) * k;

    group.current.position.y = 0.42 + Math.sin(t * 0.62) * 0.05;
  });

  const scale = Math.min(1.05, Math.max(0.62, viewport.width / 6.4));

  return (
    <group ref={group} scale={scale}>
      <Ember quality={quality} />
      <Fittings />
      <RoundedBox args={[0.94, 2.04, 0.94]} radius={0.07} smoothness={quality > 0.5 ? 5 : 3}>
        <MeshTransmissionMaterial

          transmission={1}
          thickness={0.85}
          roughness={0.13}
          ior={1.52}
          chromaticAberration={0.35}
          anisotropy={0.22}
          distortion={0.42}
          distortionScale={0.4}
          temporalDistortion={0.08}
          backside={quality > 0.5}
          backsideThickness={0.4}

          samples={quality > 0.5 ? 6 : 3}
          resolution={quality > 0.5 ? 256 : 128}
          color="#e8e4d8"
          attenuationColor="#ffcf5a"
          attenuationDistance={2.4}
        />
      </RoundedBox>
    </group>
  );
}

function Rig() {
  return (
    <Environment resolution={192}>
      <Lightformer form="rect" intensity={2.2} position={[-3.4, 3.2, 2]} scale={[5, 6, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={1.5} position={[2.6, -2.4, 1.6]} scale={[4, 4, 1]} color="#f9d100" />
      <Lightformer form="rect" intensity={4.5} position={[0, 0.4, -4]} scale={[0.35, 5, 1]} color="#ffffff" />
      <Lightformer form="ring" intensity={1.1} position={[3.6, 2.4, -1.6]} scale={2.4} color="#fce472" />
    </Environment>
  );
}

function QualityGuard({ onDowngrade }: { onDowngrade: () => void }) {
  const samples = useRef<number[]>([]);
  const done = useRef(false);

  useFrame((_, delta) => {
    if (done.current) return;
    samples.current.push(delta);

    if (samples.current.length < 90) return;

    const recent = samples.current.slice(30);
    const median = [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)];
    done.current = true;
    if (median > 1 / 40) onDowngrade();
  });

  return null;
}

export function GlassLanternCanvas({ onReady }: { onReady?: () => void }) {
  const [quality, setQuality] = useState(1);

  return (
    <Canvas
      camera={{ position: [0, 0.1, 5.4], fov: 34 }}
      dpr={[1, quality > 0.5 ? 1.75 : 1.25]}
      gl={{ antialias: quality > 0.5, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => onReady?.()}

      events={undefined}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.16} />
      <Rig />
      <GroundPool />
      <Lantern quality={quality} />
      <QualityGuard onDowngrade={() => setQuality(0.4)} />
    </Canvas>
  );
}
