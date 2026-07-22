"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Environment,
  MeshReflectorMaterial,
  RoundedBox,
  Sparkles,
} from "@react-three/drei";
import { Hologram } from "@/components/public/Hologram";

// Composição 3D de luxo — SEM modelos GLTF baixados (zero peso de rede), só
// primitivas. "Torres" arquitetônicas em ouro fundido e navy flutuando sobre
// um piso escuro reflexivo, sob um holofote quente. Parallax de mouse +
// deriva lenta dão sensação cinematográfica. Paleta Caixa (navy + laranja).
function Tower({ position, size, color, metalness = 0.9, roughness = 0.25, floatSpeed = 1, floatIntensity = 0.7 }) {
  return (
    <Float speed={floatSpeed} floatIntensity={floatIntensity} rotationIntensity={0.3}>
      <RoundedBox position={position} args={size} radius={0.07} smoothness={5} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={1.2} />
      </RoundedBox>
    </Float>
  );
}

function Scene() {
  const group = useRef(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const x = state.pointer.x * 0.3;
    const y = state.pointer.y * 0.18;
    group.current.rotation.y += (x + Math.sin(t * 0.15) * 0.08 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-y - group.current.rotation.x) * 0.04;
  });

  return (
    <group ref={group} position={[0, 0.1, 0]}>
      <Tower position={[-1.6, -0.1, 0]} size={[1, 2.4, 1]} color="#0B1426" metalness={0.6} roughness={0.35} floatSpeed={1.1} />
      <Tower position={[1.8, -0.4, 0.3]} size={[0.85, 1.9, 0.85]} color="#F97316" metalness={0.95} roughness={0.18} floatSpeed={1.25} />
      <Tower position={[-0.4, -1.0, 1]} size={[0.6, 0.7, 0.6]} color="#FB923C" metalness={0.95} roughness={0.15} floatSpeed={1.5} floatIntensity={1} />

      {/* holograma central que se materializa ao carregar — foco do hero */}
      <Hologram position={[0.3, 0.35, -0.3]} />

      {/* poeira dourada de luz no ar */}
      <Sparkles count={40} scale={7} size={2.5} speed={0.3} color="#FCE3C4" opacity={0.6} />

      {/* piso escuro reflexivo — a assinatura cinematográfica */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.85}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#070C18"
          metalness={0.6}
          mirror={0}
        />
      </mesh>
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="h-full w-full" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.6, 6.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        {/* holofote quente vindo de cima — spot de galeria */}
        <spotLight
          position={[2, 7, 4]}
          angle={0.5}
          penumbra={0.8}
          intensity={2.4}
          color="#FFD9A8"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 3, 2]} intensity={0.5} color="#8fb4ff" />
        <Suspense fallback={null}>
          <Scene />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}
