import { GameGlobals } from '../systems/GameGlobals.js';
import { colorFromRgb, THROWABLE } from '../config.js';

export class ThrowableBomb extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x, y, 14, 14, colorFromRgb(0.95, 0.7, 0.15));
    scene.add.existing(this);
    this.setDepth(20);

    this._armed = true;
    this._velocity = new Phaser.Math.Vector2(0, 0);
  }

  launch(fromX, fromY, direction) {
    this.setPosition(fromX, fromY);
    this._velocity.set(direction * THROWABLE.SPEED, THROWABLE.LAUNCH_Y);
    this.rotation = 0;
  }

  updateBomb(delta) {
    if (!this._armed || !this.active) return;

    const dt = delta / 1000;
    this._velocity.y += THROWABLE.GRAVITY * dt;
    this.x += this._velocity.x * dt;
    this.y += this._velocity.y * dt;
    this.rotation += dt * 8;

    this._checkCollisions();
  }

  _checkCollisions() {
    const scene = this.scene;
    const bounds = this.getBounds();

    for (const wp of scene.weakPoints.getChildren()) {
      if (!wp.isIntact?.()) continue;
      if (Phaser.Geom.Rectangle.Overlaps(bounds, wp.getBounds())) {
        if (wp.canBreakFromDirectHit()) {
          wp.breakPoint('throw');
          this._explodeVisual();
        }
        return;
      }
    }

    const solids = scene.worldPlatforms.getChildren();
    for (const solid of solids) {
      if (!solid.active) continue;
      if (Phaser.Geom.Rectangle.Overlaps(bounds, solid.getBounds())) {
        this._explodeVisual();
        return;
      }
    }
  }

  _explodeVisual() {
    if (!this._armed) return;
    this._armed = false;
    GameGlobals.requestHitStop();

    const flash = this.scene.add.rectangle(
      this.x,
      this.y,
      32,
      32,
      colorFromRgb(1, 0.7, 0.2),
      0.9,
    );
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });

    this.destroy();
  }
}
