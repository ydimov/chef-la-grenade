import { GameGlobals } from '../systems/GameGlobals.js';
import { PLAYER, moveToward } from '../config.js';
import { ThrowableBomb } from './ThrowableBomb.js';
import { PlantedBomb } from './PlantedBomb.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'pixel');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setVisible(false);
    this.setRoundPixels(true);
    this.body.setSize(PLAYER.WIDTH, PLAYER.HEIGHT);
    this.body.setOffset(-PLAYER.WIDTH / 2, -PLAYER.HEIGHT);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(PLAYER.SPEED, PLAYER.MAX_FALL);
    this.body.setMaxSpeed(PLAYER.SPEED);

    this.visual = scene.add.rectangle(x, y, PLAYER.WIDTH, PLAYER.HEIGHT, 0xd92633);
    this.visual.setOrigin(0.5, 1);
    this.visual.setDepth(10);
    this.visual.setRoundPixels(true);

    this._coyoteTimer = 0;
    this._jumpBufferTimer = 0;
    this._facing = 1;
    this._rolling = false;
    this._rollTimer = 0;
    this._throwCd = 0;
    this._plantCd = 0;
    this._frozen = false;
    this._dropThrough = false;

    this.bombSpawnOffset = { x: 14, y: -28 };
  }

  setFrozen(frozen) {
    this._frozen = frozen;
  }

  resetTo(spawnX, spawnY) {
    this.setPosition(spawnX, spawnY);
    this.body.setVelocity(0, 0);
    this._rolling = false;
    this._frozen = false;
    this.visual.setFillStyle(0xd92633);
    this._syncVisual();
  }

  updateController(delta, inputState) {
    if (this._frozen) return;

    const dt = delta / 1000;
    this._updateTimers(dt, inputState);

    if (GameGlobals.tacticalViewActive) {
      this.body.velocity.x = moveToward(this.body.velocity.x, 0, PLAYER.FRICTION * dt * 2);
      this.body.velocity.y = Math.min(this.body.velocity.y, PLAYER.MAX_FALL);
      return;
    }

    if (!this.body.blocked.down && !this.body.touching.down) {
      this.body.velocity.y = Math.min(this.body.velocity.y, PLAYER.MAX_FALL);
    }

    if (this._rolling) {
      this._processRoll(dt);
    } else {
      this._processMovement(dt, inputState);
    }

    this._processJump(inputState, dt);
  }

  postUpdate() {
    if (this._frozen) return;
    this._stabilizeGround();
    this._syncVisual();
  }

  _stabilizeGround() {
    const body = this.body;
    if (!body) return;

    const onGround = body.blocked.down || body.touching.down;

    if (onGround && body.velocity.y > 0) {
      body.velocity.y = 0;
    }

    if (this._dropThrough || body.velocity.y < 0) {
      return;
    }

    if (!onGround && body.velocity.y >= 0) {
      this._applyFloorSnap(PLAYER.FLOOR_SNAP);
    } else if (onGround) {
      body.velocity.y = 0;
    }
  }

  _applyFloorSnap(maxDistance) {
    const feetX = this.x;
    const feetY = this.y;
    let nearestGap = Infinity;
    let snapY = null;

    for (const surface of this._getWalkSurfaces()) {
      const bounds = surface.getBounds();
      if (feetX < bounds.left - 4 || feetX > bounds.right + 4) continue;

      const gap = bounds.top - feetY;
      if (gap >= 0 && gap <= maxDistance && gap < nearestGap) {
        nearestGap = gap;
        snapY = bounds.top;
      }
    }

    if (snapY !== null) {
      this.y = snapY;
      this.body.velocity.y = 0;
    }
  }

  _getWalkSurfaces() {
    const scene = this.scene;
    return [
      ...scene.worldPlatforms.getChildren(),
      ...scene.oneWayPlatforms.getChildren(),
      ...scene.weakPoints.getChildren().filter((wp) => wp.isIntact?.()),
      ...scene.chainProps.getChildren().filter((rack) => rack.active && rack.body?.enable),
    ];
  }

  _syncVisual() {
    this.visual.setPosition(this.x, this.y);
    this.visual.setScale(this._facing < 0 ? -1 : 1, 1);
  }

  _updateTimers(dt, inputState) {
    this._throwCd = Math.max(0, this._throwCd - dt);
    this._plantCd = Math.max(0, this._plantCd - dt);

    if (this.body.blocked.down || this.body.touching.down) {
      this._coyoteTimer = PLAYER.COYOTE_TIME;
    } else {
      this._coyoteTimer = Math.max(0, this._coyoteTimer - dt);
    }

    if (inputState.jumpJust) {
      this._jumpBufferTimer = PLAYER.JUMP_BUFFER;
    } else {
      this._jumpBufferTimer = Math.max(0, this._jumpBufferTimer - dt);
    }
  }

  _processMovement(dt, inputState) {
    let direction = 0;
    if (inputState.left) direction -= 1;
    if (inputState.right) direction += 1;

    if (direction !== 0) {
      this._facing = Math.sign(direction);
    }

    if (inputState.rollJust && (this.body.blocked.down || this.body.touching.down)) {
      this._startRoll();
      return;
    }

    this._dropThrough = inputState.dropThrough;

    if (direction !== 0) {
      this.body.velocity.x = moveToward(
        this.body.velocity.x,
        direction * PLAYER.SPEED,
        PLAYER.ACCEL * dt,
      );
    } else {
      this.body.velocity.x = moveToward(this.body.velocity.x, 0, PLAYER.FRICTION * dt);
    }
  }

  _startRoll() {
    this._rolling = true;
    this._rollTimer = PLAYER.ROLL_DURATION;
    this.body.velocity.x = this._facing * PLAYER.ROLL_SPEED;
    this.body.velocity.y = 0;
    this.visual.setFillStyle(0x992633);
  }

  _processRoll(dt) {
    this._rollTimer -= dt;
    this.body.velocity.x = this._facing * PLAYER.ROLL_SPEED;
    if (this._rollTimer <= 0) {
      this._rolling = false;
      this.visual.setFillStyle(0xd92633);
    }
  }

  _processJump(_inputState, _dt) {
    if (this._jumpBufferTimer > 0 && this._coyoteTimer > 0) {
      this.body.velocity.y = PLAYER.JUMP_VELOCITY;
      this._jumpBufferTimer = 0;
      this._coyoteTimer = 0;
    }
  }

  handleActions(inputState) {
    if (inputState.throwJust) this.throwGrenade();
    if (inputState.plantJust) this.plantCharge();
    if (inputState.detonateJust) GameGlobals.detonateAll();
  }

  throwGrenade() {
    if (this._throwCd > 0) return;
    this._throwCd = PLAYER.THROW_COOLDOWN;

    const ox = this.bombSpawnOffset.x * this._facing;
    const originX = this.x + ox;
    const originY = this.y + this.bombSpawnOffset.y;

    const bomb = new ThrowableBomb(this.scene, originX, originY);
    bomb.launch(originX, originY, this._facing);
    this.scene.throwables.add(bomb);
  }

  plantCharge() {
    if (this._plantCd > 0) return;

    const fromX = this.x;
    const fromY = this.y;
    const toX = fromX + this._facing * 28;
    const toY = fromY + 8;

    const hit = this.scene.raycastPlant(fromX, fromY, toX, toY);
    if (!hit) {
      if (this.body.blocked.down || this.body.touching.down) {
        this._spawnPlanted(this.x + this._facing * 16, this.y - 4);
        this._plantCd = PLAYER.PLANT_COOLDOWN;
      }
      return;
    }

    const pos = hit.point;
    const normal = hit.normal;
    this._spawnPlanted(pos.x + normal.x * 6, pos.y + normal.y * 6);
    this._plantCd = PLAYER.PLANT_COOLDOWN;
  }

  _spawnPlanted(x, y) {
    new PlantedBomb(this.scene, x, y);
  }
}
