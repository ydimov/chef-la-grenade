export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PHYSICS = {
  GRAVITY_Y: 1200,
};

/** Godot layer parity for collision filtering */
export const LAYER = {
  PLAYER: 0x1,
  WORLD: 0x2,
  ONE_WAY: 0x4,
  WEAK_POINT: 0x8,
  BOMB: 0x10,
  CHAIN_PROP: 0x20,
};

export const PLAYER = {
  SPEED: 280,
  ACCEL: 2200,
  FRICTION: 1800,
  JUMP_VELOCITY: -420,
  COYOTE_TIME: 0.1,
  JUMP_BUFFER: 0.12,
  ROLL_SPEED: 420,
  ROLL_DURATION: 0.28,
  GRAVITY: 1200,
  MAX_FALL: 700,
  THROW_COOLDOWN: 0.35,
  PLANT_COOLDOWN: 0.4,
  WIDTH: 24,
  HEIGHT: 40,
  FLOOR_SNAP: 8,
};

export const THROWABLE = {
  GRAVITY: 900,
  SPEED: 520,
  LAUNCH_Y: -320,
};

export const PLANTED = {
  BLAST_RADIUS: 56,
};

export const CAMERA = {
  NORMAL_ZOOM: 1.35,
  TACTICAL_ZOOM: 0.72,
  ZOOM_LERP_SPEED: 12,
  FOLLOW_OFFSET_Y: -40,
};

/** Convert Godot 0–1 RGB to Phaser hex color */
export function colorFromRgb(r, g, b) {
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return (ri << 16) | (gi << 8) | bi;
}

export function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}
