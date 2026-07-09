"use client";

import {
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { setLayerBodies } from "./ballRegistry";
import { DEFAULT_BALL_GROUPS } from "./collisionGroups";
import { LayerInfo } from "./layerData";

// Shared across every layer: cuts draw calls from ~200 individual balls down
// to one instanced draw call per layer, and reuses the same geometry/material
// objects everywhere instead of allocating new ones per layer.
const BALL_GEOMETRY = new THREE.SphereGeometry(1, 16, 16);
const BALL_MATERIAL = new THREE.MeshBasicMaterial();

export interface BallLayerProps {
  layer: LayerInfo;
  index: number;
}

export default function BallLayer({ layer, index }: BallLayerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // Must be a plain ref object, not a callback ref: @react-three/rapier's
  // internal useForwardedRef only syncs object refs (its own code notes it
  // doesn't know how to handle a function ref) — a callback here is
  // silently never invoked.
  const bodiesRef = useRef<(RapierRigidBody | null)[]>(null);

  const instances = useMemo<InstancedRigidBodyProps[]>(
    () =>
      layer.balls.map((ball, i) => ({
        key: `${layer.z}-${i}`,
        position: ball.position,
        scale: [ball.scale, ball.scale, ball.scale],
      })),
    [layer],
  );

  // Per-instance color isn't a declarative prop on instancedMesh — it has to
  // be set imperatively via setColorAt after the mesh mounts, or every
  // instance renders black.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    layer.balls.forEach((ball, i) => {
      mesh.setColorAt(i, new THREE.Color(ball.color));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [layer]);

  // Register this layer's live body array by reference — individual
  // RigidBody callback refs fill the same array in place as they mount, so
  // registering once here keeps the registry current without re-running.
  useEffect(() => {
    setLayerBodies(index, bodiesRef.current ?? []);
  }, [index]);

  return (
    <InstancedRigidBodies
      ref={bodiesRef}
      instances={instances}
      colliders="ball"
      type="dynamic"
      linearDamping={2.2}
      restitution={0.15}
      friction={0.3}
      collisionGroups={DEFAULT_BALL_GROUPS}
      enabledRotations={[false, false, false]}
      enabledTranslations={[true, true, false]}
    >
      <instancedMesh
        ref={meshRef}
        args={[BALL_GEOMETRY, BALL_MATERIAL, layer.balls.length]}
        frustumCulled={false}
      />
    </InstancedRigidBodies>
  );
}
