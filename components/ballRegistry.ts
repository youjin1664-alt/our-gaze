import { RapierRigidBody } from "@react-three/rapier";

// Each BallLayer registers its live physics bodies here, keyed by layer
// index, so other components (PressReveal) can hit-test against balls'
// *current* positions — which drift from the original layout data once the
// cursor pusher has nudged them — without threading refs through props.
const registry = new Map<number, (RapierRigidBody | null)[]>();

export function setLayerBodies(layerIndex: number, bodies: (RapierRigidBody | null)[]): void {
  registry.set(layerIndex, bodies);
}

export function getLayerBodies(layerIndex: number): (RapierRigidBody | null)[] | undefined {
  return registry.get(layerIndex);
}
