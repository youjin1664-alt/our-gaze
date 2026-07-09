import { interactionGroups } from "@react-three/rapier";

// Two Rapier collision groups: balls and the invisible cursor pusher.
// Normally every ball collides with other balls AND the pusher. A ball
// currently being press-held, or one that's already been fully revealed, is
// switched to BALL_ONLY so the pusher physically passes through it — it
// stops getting shoved around mid-press (which used to drag the reveal
// photo far from where the user actually clicked by the time a 3s hold
// finished) and stays put once revealed, instead of drifting off over time.
//
// This is toggled at most twice per ball (press-start, press-end) or once
// permanently (on reveal) — never every frame — since per-frame toggling
// previously caused solver flicker and, in one observed case, a WASM panic.
const BALL_GROUP = 0;
const PUSHER_GROUP = 1;

export const DEFAULT_BALL_GROUPS = interactionGroups([BALL_GROUP], [BALL_GROUP, PUSHER_GROUP]);
export const BALL_ONLY_GROUPS = interactionGroups([BALL_GROUP], [BALL_GROUP]);
export const PUSHER_GROUPS = interactionGroups([PUSHER_GROUP], [BALL_GROUP]);
