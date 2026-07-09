"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { RefObject, useEffect, useRef, useState } from "react";
import { getLayerBodies } from "./ballRegistry";
import { BASE_PATH } from "./basePath";
import { LAYERS } from "./layerData";
import { BallKey, getRevealedKeys, subscribeRevealed } from "./revealStore";
import { projectBallToScreen } from "./screenProjection";

const IMAGE_SRC = `${BASE_PATH}/images/glimpse.png`;

function parseKey(key: BallKey): { layerIndex: number; ballIndex: number } {
  const [layerIndex, ballIndex] = key.split("-").map(Number);
  return { layerIndex, ballIndex };
}

export interface RevealedBallsProps {
  /** Container (rendered outside the Canvas, see Scene.tsx) that permanent
   * reveal circles get appended into as plain DOM nodes — same reasoning as
   * PressReveal's overlay: avoids drei's Html transform-mode scaling. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Renders one persistent, fully-sharp photo circle per ball that has ever
 * completed a press-reveal (see PressReveal.tsx, which calls markRevealed
 * once a hold finishes). Each circle follows its ball's live position/size
 * every frame — a revealed ball is still a normal physics body and can
 * still be nudged by the cursor pusher.
 */
export default function RevealedBalls({ containerRef }: RevealedBallsProps) {
  const { camera, size } = useThree();
  const [keys, setKeys] = useState<BallKey[]>(() => getRevealedKeys());
  const elementsRef = useRef<Map<BallKey, HTMLDivElement>>(new Map());

  useEffect(() => subscribeRevealed(() => setKeys(getRevealedKeys())), []);

  // Sync one DOM element per revealed key into the outside container.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const elements = elementsRef.current;

    for (const key of keys) {
      if (elements.has(key)) continue;
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.top = "0";
      el.style.left = "0";
      el.style.borderRadius = "50%";
      el.style.overflow = "hidden";
      el.style.pointerEvents = "none";
      el.style.backgroundImage = `url(${IMAGE_SRC})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      container.appendChild(el);
      elements.set(key, el);
    }
  }, [keys, containerRef]);

  useFrame(() => {
    const elements = elementsRef.current;
    elements.forEach((el, key) => {
      const { layerIndex, ballIndex } = parseKey(key);
      const body = getLayerBodies(layerIndex)?.[ballIndex];
      const ball = LAYERS[layerIndex]?.balls[ballIndex];
      if (!body || !ball) return;

      const t = body.translation();
      const { x, y, diameter } = projectBallToScreen(camera, size, t.x, t.y, t.z, ball.scale);

      el.style.width = `${diameter}px`;
      el.style.height = `${diameter}px`;
      el.style.left = `${x - diameter / 2}px`;
      el.style.top = `${y - diameter / 2}px`;
    });
  });

  return null;
}
