"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { RefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getLayerBodies } from "./ballRegistry";
import { useActiveLayer } from "./CameraRig";
import { BALL_ONLY_GROUPS, DEFAULT_BALL_GROUPS } from "./collisionGroups";
import { LAYER_Z, LAYERS } from "./layerData";
import { isRevealed, keyFor, markRevealed } from "./revealStore";
import { projectBallToScreen } from "./screenProjection";

const PRESS_DURATION = 3; // seconds held to fully reveal
const RELEASE_DURATION = 0.5; // seconds to fade back out after an incomplete release
const MAX_BLUR = 40;
// Precise on purpose — kept small so a press can't accidentally land on a
// neighboring ball (layers average roughly 200+ units between ball centers,
// so anything much bigger than this starts grabbing the wrong ball).
const HIT_MARGIN = 45;
// The cursor pusher (CursorPusher.tsx) shoves balls away from the pointer in
// real time, so the exact ball under the cursor can drift outside the tight
// HIT_MARGIN between "the cursor visibly arrived" and "the button went
// down". Rather than widening the margin (which causes the neighbor-ball
// mis-targeting above), we remember the last ball that *did* match within
// this window and keep treating it as the target for a bit even if a given
// frame's tight check comes up just short. This grace period is bounded by
// BOTH time and cursor movement — time alone would let a target from
// seconds ago and a screen-width away keep winning over whatever's actually
// under the cursor now.
const STICKY_GRACE_MS = 2000;
const STICKY_ABANDON_DIST = 150;

const plane = new THREE.Plane();
const intersection = new THREE.Vector3();

interface BallRef {
  layerIndex: number;
  ballIndex: number;
}

// Guarded with numColliders() because calling .collider(0) on a body whose
// collider hasn't attached yet (e.g. the very first frame or two after
// mount) trips a WASM-level panic, not a catchable JS error.
function setBallGroups(ref: BallRef, groups: number): void {
  const body = getLayerBodies(ref.layerIndex)?.[ref.ballIndex];
  if (body && body.numColliders() > 0) {
    body.collider(0).setCollisionGroups(groups);
  }
}

function sameBall(a: BallRef | null, b: BallRef | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.layerIndex === b.layerIndex && a.ballIndex === b.ballIndex;
}

interface PressedBall extends BallRef {
  radius: number;
}

export interface PressRevealProps {
  /** DOM node (rendered outside the Canvas, see Scene.tsx) that this
   * component positions/sizes/fades every frame — avoids drei's Html
   * transform-mode scaling, which doesn't play nicely with distanceFactor
   * defaults at this scene's scale. */
  overlayRef: RefObject<HTMLDivElement | null>;
}

/**
 * Press-and-hold reveal: pressing a ball on the active layer gradually
 * un-blurs and fades in a photo over it, for as long as the pointer stays
 * down (~3s to fully reveal). Releasing early fades it back out. Once a
 * hold completes, the ball is permanently marked revealed (RevealedBalls.tsx
 * takes over rendering it from then on) and no longer needs pressing. Only
 * the active layer is hit-tested, matching the rest of the scene's "nearest
 * layer only" interactivity rule.
 */
export default function PressReveal({ overlayRef }: PressRevealProps) {
  const { camera, gl, raycaster, pointer, size } = useThree();
  const activeLayerIndex = useActiveLayer();
  const activeLayerRef = useRef(activeLayerIndex);
  useEffect(() => {
    activeLayerRef.current = activeLayerIndex;
  }, [activeLayerIndex]);

  const [pressedBall, setPressedBall] = useState<PressedBall | null>(null);
  const pressedBallRef = useRef<PressedBall | null>(null);
  useEffect(() => {
    pressedBallRef.current = pressedBall;
  }, [pressedBall]);
  // If this ever unmounts mid-hold, give the ball back to the pusher rather
  // than leaving it stuck exempt forever.
  useEffect(() => {
    return () => {
      if (pressedBallRef.current) setBallGroups(pressedBallRef.current, DEFAULT_BALL_GROUPS);
    };
  }, []);

  const progress = useRef(0);
  const isDown = useRef(false);
  const sticky = useRef<{ ball: PressedBall; anchorX: number; anchorY: number; lastSeen: number } | null>(
    null,
  );

  const findCandidate = (): PressedBall | null => {
    const layerIndex = activeLayerRef.current;
    const z = LAYER_Z[layerIndex];
    plane.set(new THREE.Vector3(0, 0, 1), -z);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(plane, intersection);
    if (!hit) return null;

    const bodies = getLayerBodies(layerIndex);
    const balls = LAYERS[layerIndex].balls;
    if (!bodies) return null;

    let closestIndex = -1;
    let closestDist = Infinity;
    bodies.forEach((body, i) => {
      if (!body) return;
      if (isRevealed(keyFor(layerIndex, i))) return; // already permanent, nothing to press
      const t = body.translation();
      const dist = Math.hypot(t.x - intersection.x, t.y - intersection.y);
      const radius = balls[i]?.scale ?? 0;
      if (dist <= radius + HIT_MARGIN && dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });

    if (closestIndex === -1) return null;
    return { layerIndex, ballIndex: closestIndex, radius: balls[closestIndex].scale };
  };

  useEffect(() => {
    const el = gl.domElement;

    // preventDefault + setPointerCapture keep this pointer's down/up cycle
    // reliably paired with this element even if the pointer drifts off the
    // canvas while held.
    const onPointerDown = (e: PointerEvent) => {
      // Always trust a fresh check over memory first — sticky is a fallback
      // for the rare frame where the live check just misses, not something
      // that should out-rank whatever's actually under the cursor right now.
      const hit = findCandidate() ?? sticky.current?.ball ?? null;
      if (!hit) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore — capture is best-effort, not required for correctness
      }
      isDown.current = true;
      setPressedBall(hit);
      // Stop the pusher from dragging this ball around for the rest of the
      // hold — otherwise a 3s press ends with the photo far from where the
      // user actually clicked, since the pusher never stops shoving it.
      setBallGroups(hit, BALL_ONLY_GROUPS);
    };

    const onPointerUp = () => {
      isDown.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, raycaster, pointer]);

  useFrame((_, delta) => {
    // Keep a short memory of the last ball the (tight) hit-test actually
    // matched, so a brief push-drift between "cursor arrives" and "button
    // down" doesn't make the press miss. Exemption is applied right when a
    // ball is *acquired* here (not just at pointerdown) — otherwise it can
    // sit unexempted, getting pushed to its full equilibrium distance from
    // the cursor, for the entire time the user is hovering before deciding
    // to click. Toggling only happens on an actual identity change (not
    // every frame), which is what keeps this from re-triggering the solver
    // flicker/crash a naive per-frame version of this hit.
    if (!isDown.current) {
      const fresh = findCandidate();
      if (fresh) {
        if (!sticky.current || !sameBall(sticky.current.ball, fresh)) {
          if (sticky.current) setBallGroups(sticky.current.ball, DEFAULT_BALL_GROUPS);
          setBallGroups(fresh, BALL_ONLY_GROUPS);
        }
        sticky.current = {
          ball: fresh,
          anchorX: intersection.x,
          anchorY: intersection.y,
          lastSeen: performance.now(),
        };
      } else if (sticky.current) {
        // findCandidate() still updates `intersection` to the current
        // pointer ray even when it finds no ball there, so this reflects
        // where the cursor actually is right now.
        const driftedAway =
          Math.hypot(intersection.x - sticky.current.anchorX, intersection.y - sticky.current.anchorY) >
          STICKY_ABANDON_DIST;
        const timedOut = performance.now() - sticky.current.lastSeen > STICKY_GRACE_MS;
        if (driftedAway || timedOut) {
          setBallGroups(sticky.current.ball, DEFAULT_BALL_GROUPS);
          sticky.current = null;
        }
      }
    }

    const el = overlayRef.current;
    if (!pressedBall) {
      if (el) el.style.display = "none";
      return;
    }

    const target = isDown.current ? 1 : 0;
    const rate = isDown.current ? 1 / PRESS_DURATION : 1 / RELEASE_DURATION;
    progress.current = THREE.MathUtils.clamp(
      progress.current + Math.sign(target - progress.current) * rate * delta,
      0,
      1,
    );

    const bodies = getLayerBodies(pressedBall.layerIndex);
    const body = bodies?.[pressedBall.ballIndex];
    if (body && el) {
      const t = body.translation();
      const { x, y, diameter } = projectBallToScreen(
        camera,
        size,
        t.x,
        t.y,
        t.z,
        pressedBall.radius,
      );

      el.style.display = "block";
      el.style.width = `${diameter}px`;
      el.style.height = `${diameter}px`;
      el.style.left = `${x - diameter / 2}px`;
      el.style.top = `${y - diameter / 2}px`;

      const p = progress.current;
      el.style.opacity = String(p);
      el.style.filter = `blur(${(1 - p) * MAX_BLUR}px)`;
    }

    if (progress.current >= 1) {
      // Fully seen once — hand this ball off to RevealedBalls permanently
      // and stop tracking it here. It stays in BALL_ONLY_GROUPS forever
      // (set on press-start above) so it doesn't keep getting shoved around
      // after becoming a permanent photo.
      markRevealed(keyFor(pressedBall.layerIndex, pressedBall.ballIndex));
      sticky.current = null;
      setPressedBall(null);
      progress.current = 0;
    } else if (!isDown.current && progress.current <= 0.001) {
      // Released before finishing — give the pusher back. Clearing sticky
      // too (not just restoring groups) so next frame's acquisition check
      // doesn't think this ball is still exempted and skip re-exempting it.
      setBallGroups(pressedBall, DEFAULT_BALL_GROUPS);
      sticky.current = null;
      setPressedBall(null);
      progress.current = 0;
    }
  });

  return null;
}
