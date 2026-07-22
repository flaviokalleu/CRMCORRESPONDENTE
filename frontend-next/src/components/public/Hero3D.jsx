"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, RoundedBox } from "@react-three/drei";

// Composição 3D leve — SEM modelos GLTF baixados (zero peso extra de rede),
// só geometrias primitivas do Three.js. Representa "blocos" arquitetônicos
// abstratos flutuando, na paleta Caixa (navy + laranja). Mantém o hero
// performático mesmo com 3D real, alinhado à tendência 2026 de "3D leve"
// (produto/isométrico) em vez de cenas pesadas.
function Building({ position, size, color, floatSpeed = 1, floatIntensity = 0.6 }) {
  return (
    <Float speed={floatSpeed} floatIntensity={floatIntensity} rotationIntensity={0.35}>
      <RoundedBox position={position} args={size} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </RoundedBox>
    </Float>
  );
}

function Scene() {
  const group = useRef(null);
  useFrame((state) => {
    if (!group.current) return;
    // Parallax sutil com o mouse — sensação "cinematográfica" sem exagero.
    const x = state.pointer.x * 0.25;
    const y = state.pointer.y * 0.15;
    group.current.rotation.y += (x - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-y - group.current.rotation.x) * 0.04;
  });

  return (
    <group ref={group}>
      <Building position={[-1.4, -0.3, 0]} size={[1, 2.2, 1]} color="#0B1426" floatSpeed={1.1} />
      <Building position={[0.3, 0.4, -0.6]} size={[1.1, 1.4, 1.1]} color="#F97316" floatSpeed={0.9} />
      <Building position={[1.6, -0.6, 0.4]} size={[0.8, 1.7, 0.8]} color="#162a4a" floatSpeed={1.3} />
      <Building position={[-0.2, -1.1, 1]} size={[0.6, 0.6, 0.6]} color="#FB923C" floatSpeed={1.5} floatIntensity={0.9} />
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="h-full w-full" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.5, 6], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 5, 3]} intensity={1.1} castShadow />
        <Suspense fallback={null}>
          <Scene />
          <Environment preset="city" />
          <ContactShadows position={[0, -1.9, 0]} opacity={0.35} scale={10} blur={2.4} far={3} />
        </Suspense>
      </Canvas>
    </div>
  );
}
