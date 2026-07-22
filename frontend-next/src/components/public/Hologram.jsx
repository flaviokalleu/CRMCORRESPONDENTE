"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Float } from "@react-three/drei";
import * as THREE from "three";

// Torre "holograma" que se materializa ao carregar: sobe do chão, ganha
// opacidade e é varrida por uma linha de scan — como uma projeção ligando.
// 100% procedural (sem modelo baixado). Foco visual central do hero.
export function Hologram({ position = [0.2, 0.4, -0.4] }) {
  const group = useRef(null);
  const bodyMat = useRef(null);
  const scan = useRef(null);
  const scanMat = useRef(null);
  const wireGroup = useRef(null);
  const start = useRef(null);

  const HEIGHT = 2.8;

  // Material holográfico: emissivo, aditivo, translúcido.
  const holoMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#22d3ee",
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        roughness: 0.4,
        metalness: 0.1,
      }),
    []
  );

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;

    // progresso de materialização (0→1 em ~2.2s)
    const p = Math.min(t / 2.2, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic

    if (group.current) {
      group.current.scale.y = 0.05 + eased * 0.95;
      group.current.position.y = position[1] - HEIGHT / 2 + (HEIGHT / 2) * group.current.scale.y;
      // leve rotação contínua depois de montado
      group.current.rotation.y = eased * 0.4 + state.clock.elapsedTime * 0.12;
    }

    // flicker holográfico sutil no corpo
    if (bodyMat.current) {
      const flicker = 0.85 + Math.sin(state.clock.elapsedTime * 18) * 0.05 + Math.sin(state.clock.elapsedTime * 7) * 0.05;
      bodyMat.current.opacity = eased * 0.28 * flicker;
      bodyMat.current.emissiveIntensity = 1.1 + Math.sin(state.clock.elapsedTime * 5) * 0.25;
    }

    // linha de scan subindo e reaparecendo
    if (scan.current && scanMat.current) {
      const y = ((state.clock.elapsedTime * 0.6) % 1) * HEIGHT - HEIGHT / 2;
      scan.current.position.y = y;
      scanMat.current.opacity = eased * 0.9;
    }
  });

  return (
    <Float speed={0.9} floatIntensity={0.5} rotationIntensity={0.15}>
      <group ref={group} position={[position[0], position[1], position[2]]}>
        {/* corpo translúcido */}
        <mesh material={holoMaterial}>
          <boxGeometry args={[1.05, HEIGHT, 1.05]} />
          <meshStandardMaterial
            ref={bodyMat}
            color="#38bdf8"
            emissive="#22d3ee"
            emissiveIntensity={1.3}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            roughness={0.4}
            metalness={0.1}
          />
          {/* arestas wireframe brilhantes */}
          <Edges ref={wireGroup} threshold={15} color="#7dd3fc" />
        </mesh>

        {/* linha de scan horizontal */}
        <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.25, 1.25]} />
          <meshBasicMaterial
            ref={scanMat}
            color="#a5f3fc"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* base de projeção brilhante */}
        <mesh position={[0, -HEIGHT / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </Float>
  );
}
