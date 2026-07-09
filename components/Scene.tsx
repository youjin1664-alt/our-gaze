"use client";

import { Physics } from "@react-three/rapier";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import BallLayer from "./BallLayer";
import { BASE_PATH } from "./basePath";
import { BACKGROUND_COLOR } from "./constants";
import CursorPusher from "./CursorPusher";
import { ExplorationProvider } from "./CameraRig";
import { LAYERS } from "./layerData";
import PressReveal from "./PressReveal";
import RevealedBalls from "./RevealedBalls";

const IMAGE_SRC = `${BASE_PATH}/images/glimpse.png`;

export default function Scene() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const revealedContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas flat gl={{ antialias: true }} style={{ width: "100%", height: "100%" }}>
        <color attach="background" args={[BACKGROUND_COLOR]} />
        <fog attach="fog" args={[BACKGROUND_COLOR, 1200, 3200]} />
        <ExplorationProvider>
          <Suspense fallback={null}>
            <Physics gravity={[0, 0, 0]} colliders={false}>
              {LAYERS.map((layer, i) => (
                <BallLayer key={i} layer={layer} index={i} />
              ))}
              <CursorPusher />
              <PressReveal overlayRef={overlayRef} />
              <RevealedBalls containerRef={revealedContainerRef} />
            </Physics>
          </Suspense>
        </ExplorationProvider>
      </Canvas>
      {/* Positioned/sized/faded every frame by PressReveal — lives outside
          the Canvas so it's plain CSS, not drei's Html transform mode. */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "none",
          borderRadius: "50%",
          overflow: "hidden",
          pointerEvents: "none",
          backgroundImage: `url(${IMAGE_SRC})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Permanent reveal circles (RevealedBalls.tsx) get appended in here,
          one plain div per ball that's ever finished a press. */}
      <div
        ref={revealedContainerRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
    </div>
  );
}
