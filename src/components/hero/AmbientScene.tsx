import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { CanvasTexture, type Points } from "three";

function Particles({ count = 110 }: { count?: number }) {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 12;
      a[i * 3 + 1] = (Math.random() - 0.5) * 5;
      a[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return a;
  }, [count]);
  const dot = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d");
    if (g) { g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); }
    return new CanvasTexture(c);
  }, []);
  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.03;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.09} map={dot} alphaTest={0.3} color="#8b7cf6" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Orb({ position, color, size }: { position: [number, number, number]; color: string; size: number }) {
  return (
    <Float speed={1.1} rotationIntensity={0.5} floatIntensity={1.4}>
      <mesh position={position}>
        <icosahedronGeometry args={[size, 1]} />
        <meshStandardMaterial color={color} transparent opacity={0.55} roughness={0.35} flatShading />
      </mesh>
    </Float>
  );
}

/** Soft floating field. No models, no post-processing, capped pixel ratio, pauses when `active` is false. */
export default function AmbientScene({ active }: { active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={0.8} />
      <Particles />
      <Orb position={[-3.4, 0.6, 0]} color="#f06a6a" size={0.55} />
      <Orb position={[3.2, -0.4, -0.5]} color="#8b7cf6" size={0.7} />
      <Orb position={[0.6, 1.3, -1]} color="#7cc4f6" size={0.35} />
    </Canvas>
  );
}
