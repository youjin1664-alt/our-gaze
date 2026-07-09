"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { BallCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { useActiveLayer } from "./CameraRig";
import { PUSHER_GROUPS } from "./collisionGroups";
import { LAYER_Z } from "./layerData";

const PUSHER_RADIUS = 90;
const DAMP_XY = 14;
const DAMP_Z = 6;

function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

const plane = new THREE.Plane();
const intersection = new THREE.Vector3();
const smoothed = new THREE.Vector3();

/**
 * Invisible sphere that follows the mouse cursor, projected onto the active
 * layer's Z-plane, and physically pushes nearby balls via normal (non-sensor)
 * kinematic-vs-dynamic collision. Because it only ever exists at the active
 * layer's Z and layers are 500 units apart (far more than any ball radius),
 * it can never reach balls on other layers — interactivity is scoped to the
 * nearest layer for free, no collision groups needed for that part.
 *
 * It's also given its own collision group (PUSHER_GROUPS) so PressReveal can
 * exempt individual balls from it (see collisionGroups.ts) while they're
 * being pressed or once they've been permanently revealed.
 */
export default function CursorPusher() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const { camera, raycaster, pointer } = useThree();
  const activeLayerIndex = useActiveLayer();
  const initialized = useRef(false);

  useFrame((_, delta) => {
    const z = LAYER_Z[activeLayerIndex];
    plane.set(new THREE.Vector3(0, 0, 1), -z);

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(plane, intersection);

    if (!initialized.current) {
      // Snap once on the very first frame so the pusher doesn't animate in
      // from the origin; every frame after this is fully damped.
      if (hit) smoothed.copy(intersection);
      smoothed.z = z;
      initialized.current = true;
    } else {
      if (hit) {
        smoothed.x = damp(smoothed.x, intersection.x, DAMP_XY, delta);
        smoothed.y = damp(smoothed.y, intersection.y, DAMP_XY, delta);
      }
      // Damping the Z transition too (not just X/Y) matters: without it, a
      // fast scroll that crosses several layers in one frame would snap the
      // pusher's Z instantly, and with CCD enabled it would sweep through
      // every layer in between and blast their balls away.
      smoothed.z = damp(smoothed.z, z, DAMP_Z, delta);
    }

    bodyRef.current?.setNextKinematicTranslation(smoothed);
  });

  return (
    // colliders={false} means the RigidBody's own restitution/friction props
    // (which only apply to auto-generated "colliders" shorthand colliders)
    // are ignored here — they have to be set directly on the manual
    // BallCollider instead.
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} ccd>
      <BallCollider
        args={[PUSHER_RADIUS]}
        restitution={0.1}
        friction={0.1}
        collisionGroups={PUSHER_GROUPS}
      />
    </RigidBody>
  );
}
