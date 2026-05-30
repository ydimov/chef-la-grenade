import Phaser from 'phaser';
import { GameGlobals } from '../systems/GameGlobals.js';
import { TacticalCamera } from '../systems/TacticalCamera.js';
import { Player } from '../entities/Player.js';
import { WeakPoint } from '../entities/WeakPoint.js';
import { ChainRack } from '../entities/ChainRack.js';
import { colorFromRgb, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

const HIT_STOP_FRAMES = 2;

export class KitchenGymScene extends Phaser.Scene {
  constructor() {
    super({ key: 'KitchenGymScene' });
  }

  create() {
    GameGlobals.reset();

    if (!this.textures.exists('pixel')) {
      const gfx = this.make.graphics({ add: false });
      gfx.fillStyle(0xffffff);
      gfx.fillRect(0, 0, 1, 1);
      gfx.generateTexture('pixel', 1, 1);
      gfx.destroy();
    }

    this.spawnPoint = { x: 120, y: 420 };
    this.shakeStrength = 0;
    this.complete = false;
    this.hitStopFrames = 0;

    this.worldPlatforms = this.physics.add.staticGroup();
    this.oneWayPlatforms = this.physics.add.staticGroup();
    this.weakPoints = this.add.group();
    this.chainProps = this.add.group();
    this.throwables = this.add.group();

    this.decorations = this.add.group();

    this._buildLevel();
    this._setupInput();
    this._setupUI();

    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);
    this.player.setDepth(10);

    this.physics.add.collider(this.player, this.worldPlatforms);
    this.physics.add.collider(
      this.player,
      this.oneWayPlatforms,
      null,
      (_player, _platform) => {
        if (this.player._dropThrough) return false;
        return this.player.body.velocity.y >= 0;
      },
    );
    this.physics.add.collider(this.player, this.weakPoints);
    this.physics.add.collider(this.player, this.chainProps);

    this.tacticalCamera = new TacticalCamera(this, this.player);

    this.physics.world.setBounds(-40, 0, 1440, 720);
  }

  update(_time, delta) {
    this._updateInput();

    if (this.inputState.restartJust) {
      this.scene.restart();
      return;
    }

    if (this.hitStopFrames > 0) {
      this.hitStopFrames -= 1;
      this.physics.pause();
      this._clearJustInput();
      return;
    }
    this.physics.resume();

    if (GameGlobals.consumeHitStop()) {
      this.hitStopFrames = HIT_STOP_FRAMES;
      this._clearJustInput();
      return;
    }

    this.tacticalCamera.applyShake(delta);
    this.tacticalCamera.update(delta, this.inputState);
    this.player.updateController(delta, this.inputState);
    this.player.handleActions(this.inputState);

    this.throwables?.getChildren().forEach((b) => b.updateBomb?.(delta));

    const tactical = GameGlobals.tacticalViewActive;
    for (const wp of this.weakPoints.getChildren()) {
      if (wp.isIntact?.()) {
        wp.pulseWeakHint(tactical);
      }
    }

    this._clearJustInput();
  }

  cameraShake(amount) {
    this.tacticalCamera.cameraShake(amount);
  }

  onWeakPointBroken(wp, _source) {
    if (wp === this.weakFloor) {
      this._openFloorGap();
    }
    if (wp === this.weakWall && !this.complete) {
      this.complete = true;
      this._showMessage('Route open! R to restart.');
    }
  }

  raycastPlant(fromX, fromY, toX, toY) {
    const targets = [
      ...this.worldPlatforms.getChildren(),
      ...this.weakPoints.getChildren().filter((wp) => wp.isIntact?.()),
    ];

    let closest = null;
    let closestDist = Infinity;

    for (const target of targets) {
      const bounds = target.getBounds();
      const hit = this._lineRectIntersection(fromX, fromY, toX, toY, bounds);
      if (hit && hit.distance < closestDist) {
        closestDist = hit.distance;
        closest = hit;
      }
    }

    return closest;
  }

  _lineRectIntersection(x1, y1, x2, y2, rect) {
    const lines = [
      [rect.left, rect.top, rect.right, rect.top],
      [rect.right, rect.top, rect.right, rect.bottom],
      [rect.right, rect.bottom, rect.left, rect.bottom],
      [rect.left, rect.bottom, rect.left, rect.top],
    ];

    let best = null;
    for (const [ax, ay, bx, by] of lines) {
      const hit = this._segmentIntersection(x1, y1, x2, y2, ax, ay, bx, by);
      if (!hit) continue;
      const dist = Phaser.Math.Distance.Between(x1, y1, hit.x, hit.y);
      if (!best || dist < best.distance) {
        best = { point: { x: hit.x, y: hit.y }, normal: hit.normal, distance: dist };
      }
    }
    return best;
  }

  _segmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-9) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;

    const ix = x1 + t * (x2 - x1);
    const iy = y1 + t * (y2 - y1);

    const nx = x4 - x3;
    const ny = y4 - y3;
    const len = Math.hypot(nx, ny) || 1;
    const normal = { x: -ny / len, y: nx / len };

    return { x: ix, y: iy, normal };
  }

  _buildLevel() {
    const level = this.add.container(0, 0);

    this._addRect(level, 0, 80, 1400, 560, colorFromRgb(0.93, 0.9, 0.82));
    this._addRect(level, 0, 0, 1400, 90, colorFromRgb(0.55, 0.75, 0.85));

    this._addPlatform(0, 480, 524, 80, colorFromRgb(0.35, 0.32, 0.28));

    this.weakFloor = new WeakPoint(this, 520, 456, 160, 24, 'floor_break', false);

    this._addPlatform(480, 620, 400, 60, colorFromRgb(0.4, 0.36, 0.3));
    this._addOneWay(200, 380, 140, 16);
    this._addPlatform(700, 520, 200, 40, colorFromRgb(0.45, 0.4, 0.35));

    this.floorGap = this._addGapVisual(520, 480, 160, 40, colorFromRgb(0.3, 0.28, 0.25));
    this.floorGap.name = 'FloorGap';

    this.chainRack = new ChainRack(this, 560, 592);
    this.weakWall = new WeakPoint(this, 960, 500, 24, 120, 'wall_exit', true);
    this.chainRack.chainTargets = [this.weakWall];

    this._addPlatform(1000, 560, 360, 80, colorFromRgb(0.5, 0.75, 0.45));
    this._addRect(level, 1040, 480, 80, 80, colorFromRgb(0.2, 0.6, 0.35));

    this._addPlatform(-40, 0, 40, 720, colorFromRgb(0.25, 0.22, 0.2));
    this._addPlatform(1360, 0, 40, 720, colorFromRgb(0.25, 0.22, 0.2));
  }

  _addRect(parent, x, y, w, h, color) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color);
    parent.add(rect);
    this.decorations.add(rect);
    return rect;
  }

  _addStaticPlatform(x, y, w, h, color) {
    const platform = this.add.rectangle(x + w / 2, y + h / 2, w, h, color);
    platform.setRoundPixels(true);
    this.physics.add.existing(platform, true);
    platform.body.setSize(w, h);
    platform.body.setOffset(-w / 2, -h / 2);
    platform.body.updateFromGameObject();
    this.worldPlatforms.add(platform);
    return platform;
  }

  /** Visual-only gap filler — weak floor provides the walk surface above it. */
  _addGapVisual(x, y, w, h, color) {
    const gap = this.add.rectangle(x + w / 2, y + h / 2, w, h, color);
    gap.setRoundPixels(true);
    return gap;
  }

  _addPlatform(x, y, w, h, color) {
    return this._addStaticPlatform(x, y, w, h, color);
  }

  _addOneWay(x, y, w, h) {
    const platform = this.add.rectangle(
      x + w / 2,
      y + h / 2,
      w,
      h,
      colorFromRgb(0.55, 0.5, 0.45),
    );
    this.physics.add.existing(platform, true);
    platform.body.setSize(w, h);
    platform.body.setOffset(-w / 2, -h / 2);
    platform.body.checkCollision.up = true;
    platform.body.checkCollision.down = false;
    platform.body.updateFromGameObject();
    this.oneWayPlatforms.add(platform);
    return platform;
  }

  _openFloorGap() {
    if (!this.floorGap) return;
    this.floorGap.setVisible(false);
  }

  _setupUI() {
    this.hintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, this._defaultHint(), {
        fontSize: '15px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  _defaultHint() {
    return 'Move A/D | Jump Space/Z | Roll Shift/X | Throw J/LMB | Plant K/RMB | Detonate E | Tactical Tab/Q | Drop S+Down | Restart R';
  }

  _showMessage(text) {
    this.hintText.setText(text);
    this.hintText.setColor('#80ff99');
  }

  _setupInput() {
    this.inputState = {
      left: false,
      right: false,
      jumpJust: false,
      rollJust: false,
      throwJust: false,
      plantJust: false,
      detonateJust: false,
      tactical: false,
      dropThrough: false,
      restartJust: false,
    };

    this.keys = this.input.keyboard.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      X: Phaser.Input.Keyboard.KeyCodes.X,
      J: Phaser.Input.Keyboard.KeyCodes.J,
      K: Phaser.Input.Keyboard.KeyCodes.K,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      TAB: Phaser.Input.Keyboard.KeyCodes.TAB,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      R: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) this.inputState.throwJust = true;
      if (pointer.rightButtonDown()) this.inputState.plantJust = true;
    });

    this.input.mouse.disableContextMenu();
  }

  _updateInput() {
    const s = this.inputState;
    s.left = this.keys.A.isDown || this.keys.LEFT.isDown;
    s.right = this.keys.D.isDown || this.keys.RIGHT.isDown;
    s.tactical = this.keys.TAB.isDown || this.keys.Q.isDown;
    s.dropThrough = this.keys.S.isDown || this.keys.DOWN.isDown;

    s.jumpJust = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.Z);
    s.rollJust = Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.X);
    s.throwJust = s.throwJust || Phaser.Input.Keyboard.JustDown(this.keys.J);
    s.plantJust = s.plantJust || Phaser.Input.Keyboard.JustDown(this.keys.K);
    s.detonateJust = Phaser.Input.Keyboard.JustDown(this.keys.E);
    s.restartJust = Phaser.Input.Keyboard.JustDown(this.keys.R);
  }

  _clearJustInput() {
    this.inputState.jumpJust = false;
    this.inputState.rollJust = false;
    this.inputState.throwJust = false;
    this.inputState.plantJust = false;
    this.inputState.detonateJust = false;
    this.inputState.restartJust = false;
  }
}
