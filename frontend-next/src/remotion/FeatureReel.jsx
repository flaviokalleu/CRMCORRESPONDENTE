"use client";

import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Users, Building2, KeyRound, Wallet, MessageCircle } from "lucide-react";

// Composição Remotion: sequência animada com precisão de frame mostrando os
// módulos do CRM. Tocada ao vivo no navegador via @remotion/player (não é
// pré-renderizada em vídeo) — permanece 100% React/DOM, então continua leve
// e acessível, sem baixar nenhum arquivo .mp4.
const FEATURES = [
  { icon: Users, label: "Clientes", desc: "Funil completo de aprovação" },
  { icon: Building2, label: "Imóveis", desc: "Portfólio à venda e locação" },
  { icon: KeyRound, label: "Aluguéis", desc: "Contratos, régua e repasses" },
  { icon: Wallet, label: "Financeiro", desc: "Receitas, despesas e Asaas" },
  { icon: MessageCircle, label: "WhatsApp", desc: "Notificações em tempo real" },
];

const SLIDE_DURATION = 48; // frames por slide (30fps → 1.6s)

function FeatureSlide({ feature: { icon: Icon, label, desc } }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const opacity = interpolate(frame, [0, 8, SLIDE_DURATION - 10, SLIDE_DURATION], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(enter, [0, 1], [28, 0]);
  const iconScale = interpolate(frame, [0, 14], [0.7, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity,
        background: "linear-gradient(135deg, #0B1426 0%, #122240 55%, #162a4a 100%)",
      }}
    >
      <div style={{ transform: `translateY(${translateY}px)`, textAlign: "center" }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 22px",
            transform: `scale(${iconScale})`,
            boxShadow: "0 20px 60px -10px rgba(249,115,22,0.5)",
          }}
        >
          <Icon size={40} color="white" strokeWidth={1.8} />
        </div>
        <h3 style={{ color: "white", fontSize: 40, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{label}</h3>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 18, marginTop: 8 }}>{desc}</p>
      </div>
    </AbsoluteFill>
  );
}

export function FeatureReel() {
  return (
    <AbsoluteFill style={{ background: "#0B1426" }}>
      {FEATURES.map((feature, i) => (
        <Sequence key={feature.label} from={i * SLIDE_DURATION} durationInFrames={SLIDE_DURATION}>
          <FeatureSlide feature={feature} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

export const FEATURE_REEL_DURATION = FEATURES.length * SLIDE_DURATION;
