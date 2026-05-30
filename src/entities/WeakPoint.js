import { GameGlobals } from '../systems/GameGlobals.js';
import { colorFromRgb } from '../config.js';

export class WeakPoint extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, width, height, pointId, requiresChain = false) {
    const fillColor = requiresChain
      ? colorFromRgb(0.75, 0.35, 0.9)
      : colorFromRgb(0.95, 0.55, 0.15);

    super(scene, x + width / 2, y + height / 2, width, height, fillColor);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setRoundPixels(true);
    this.body.updateFromGameObject();

    this.pointId = pointId;
    this.requiresChain = requiresChain;
    this._intact = true;

    this.outline = scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width + 6,
      height + 6,
      colorFromRgb(0.1, 0.1, 0.15),
      0.85,
    );
    this.outline.setDepth(this.depth - 1);

    scene.weakPoints.add(this);
  }

  isIntact() {
    return this._intact;
  }

  canBreakFromDirectHit() {
    return this._intact && !this.requiresChain;
  }

  breakPoint(source = 'bomb') {
    if (!this._intact) return;
    this._intact = false;
    this.body.enable = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 120,
    });
    this.outline.setVisible(false);

    GameGlobals.requestHitStop();
    this.scene.onWeakPointBroken?.(this, source);
  }

  pulseWeakHint(active) {
    if (!this.outline || !this._intact) return;
    if (active) {
      this.outline.setFillStyle(colorFromRgb(0.35, 0.3, 0.12), 0.95);
    } else {
      this.outline.setFillStyle(colorFromRgb(0.1, 0.1, 0.15), 0.85);
    }
  }
}
