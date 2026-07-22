"use client";

import { Player } from "@remotion/player";
import { FeatureReel, FEATURE_REEL_DURATION } from "@/remotion/FeatureReel";

// Player do Remotion tocando ao vivo — component React puro, sem vídeo
// pré-renderizado. Loop contínuo, sem controles (é decorativo/institucional).
export function FeatureReelPlayer() {
  return (
    <Player
      component={FeatureReel}
      durationInFrames={FEATURE_REEL_DURATION}
      compositionWidth={960}
      compositionHeight={540}
      fps={30}
      loop
      autoPlay
      muted
      controls={false}
      style={{ width: "100%", height: "100%", borderRadius: "1.5rem", overflow: "hidden" }}
    />
  );
}
