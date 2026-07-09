"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LAYER_Z } from "./layerData";

const CAMERA_START_Z = 900;
// The camera looks down -Z, so an object is only visible while its Z is
// less than the camera's Z (in front of it). Clamping the camera past the
// last layer's Z would push that layer behind the camera (near-plane
// clipped) with nothing beyond it — an empty frame. Keep the camera at
// least one full layer-spacing in front of the last layer instead, which
// also keeps it at a comfortable viewing distance (too close and a single
// large ball fills the whole frame at fov 50).
const Z_MIN = LAYER_Z[LAYER_Z.length - 1] + 500;
const Z_MAX = CAMERA_START_Z + 200;
const WHEEL_SENSITIVITY = 1.2;
const PARALLAX_STRENGTH = 20;
const DAMP_Z = 4;
const DAMP_XY = 6;
// If the camera is allowed to coast to a stop with its Z almost exactly at
// a layer's Z, the nearest ball on that layer is only a few units away and
// perspective blows its on-screen size up toward the whole viewport (a
// giant flat-colored blob). Layers are 500 apart, so up to 250 keeps
// adjacent layers' exclusion zones from overlapping and creating a dead
// zone with no valid resting position between them.
const MIN_LAYER_APPROACH_DIST = 220;

function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

// Pushes a candidate camera Z out of the "too close to some layer" zone,
// preserving which side (in front of / already passed) it was heading for.
function clampAwayFromLayers(z: number): number {
  for (const layerZ of LAYER_Z) {
    const offset = z - layerZ;
    if (Math.abs(offset) < MIN_LAYER_APPROACH_DIST) {
      return offset >= 0 ? layerZ + MIN_LAYER_APPROACH_DIST : layerZ - MIN_LAYER_APPROACH_DIST;
    }
  }
  return z;
}

// Nearest layer the camera hasn't passed through yet — the only one that's
// interactive (see CursorPusher, which only ever exists at this layer's Z).
function getActiveLayerIndex(cameraZ: number): number {
  const idx = LAYER_Z.findIndex((z) => cameraZ >= z);
  return idx === -1 ? LAYER_Z.length - 1 : idx;
}

const ExplorationContext = createContext<{ activeLayerIndex: number }>({ activeLayerIndex: 0 });

export function useActiveLayer(): number {
  return useContext(ExplorationContext).activeLayerIndex;
}

export function ExplorationProvider({ children }: { children: ReactNode }) {
  const { gl, camera, pointer } = useThree();
  const targetZ = useRef(CAMERA_START_Z);
  const activeLayerRef = useRef(0);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const raw = THREE.MathUtils.clamp(targetZ.current - e.deltaY * WHEEL_SENSITIVITY, Z_MIN, Z_MAX);
      targetZ.current = clampAwayFromLayers(raw);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  // Camera rotation is never touched anywhere in this rig — it stays at
  // identity, facing -Z. That's what makes this "travel through layers"
  // rather than "orbit the scene" (no OrbitControls used at all).
  useFrame((_, delta) => {
    camera.position.z = damp(camera.position.z, targetZ.current, DAMP_Z, delta);
    camera.position.x = damp(camera.position.x, pointer.x * PARALLAX_STRENGTH, DAMP_XY, delta);
    camera.position.y = damp(camera.position.y, pointer.y * PARALLAX_STRENGTH, DAMP_XY, delta);

    const idx = getActiveLayerIndex(camera.position.z);
    if (idx !== activeLayerRef.current) {
      activeLayerRef.current = idx;
      setActiveLayerIndex(idx);
    }
  });

  return (
    <ExplorationContext.Provider value={{ activeLayerIndex }}>
      <PerspectiveCamera
        makeDefault
        fov={50}
        near={1}
        far={5000}
        position={[0, 0, CAMERA_START_Z]}
      />
      {children}
    </ExplorationContext.Provider>
  );
}
