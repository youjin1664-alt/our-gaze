import * as THREE from "three";

const projected = new THREE.Vector3();
const worldPos = new THREE.Vector3();

export interface ScreenCircle {
  x: number;
  y: number;
  diameter: number;
}

/**
 * Projects a world-space ball (position + radius) to its on-screen circle
 * (center + diameter in px) for the given camera/viewport. Shared by
 * PressReveal (in-progress reveal) and RevealedBalls (permanent reveals) so
 * both size photo overlays identically to how the ball itself renders.
 */
export function projectBallToScreen(
  camera: THREE.Camera,
  size: { width: number; height: number },
  worldX: number,
  worldY: number,
  worldZ: number,
  radius: number,
): ScreenCircle {
  worldPos.set(worldX, worldY, worldZ);
  projected.copy(worldPos).project(camera);

  const x = (projected.x * 0.5 + 0.5) * size.width;
  const y = (-projected.y * 0.5 + 0.5) * size.height;

  const distance = camera.position.distanceTo(worldPos);
  const perspCamera = camera as THREE.PerspectiveCamera;
  const vFov = (perspCamera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
  const pxPerUnit = size.height / visibleHeight;
  const diameter = radius * 2 * pxPerUnit;

  return { x, y, diameter };
}
