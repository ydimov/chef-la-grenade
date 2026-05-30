import { GameGlobals } from '../systems/GameGlobals.js';
import { colorFromRgb, PLANTED } from '../config.js';

export class PlantedBomb extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    this._armed = true;

    const ring = scene.add.rectangle(0, 0, 28, 28, colorFromRgb(1, 0.85, 0.2), 0.35);
    const icon = scene.add.rectangle(0, 0, 20, 20, colorFromRgb(0.9, 0.2, 0.25));
    this.add([ring, icon]);
    this.icon = icon;
    this.ring = ring;

    GameGlobals.registerArmedBomb(this);
    this._startPulse();
  }

  _startPulse() {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 350,
      yoyo: true,
      repeat: -1,
    });
  }

  detonate() {
    if (!this._armed) return;
    this._armed = false;
    this.scene.tweens.killTweensOf(this);
    GameGlobals.unregisterArmedBomb(this);
    this._doBlast();
    this.destroy();
  }

  _doBlast() {
    GameGlobals.requestHitStop();
    const { x, y } = this;
    const radius = PLANTED.BLAST_RADIUS;
    const scene = this.scene;

    const weakPoints = scene.weakPoints?.getChildren() ?? [];
    for (const wp of weakPoints) {
      if (wp.isIntact?.() && this._inRadius(x, y, radius, wp)) {
        wp.breakPoint('blast');
      }
    }

    const chainProps = scene.chainProps?.getChildren() ?? [];
    for (const rack of chainProps) {
      if (rack.active && this._inRadius(x, y, radius, rack)) {
        rack.triggerChain();
      }
    }

    const flash = scene.add.rectangle(x, y, radius * 2, radius * 2, colorFromRgb(1, 0.45, 0.15), 0.85);
    flash.setDepth(100);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    scene.cameraShake?.(4);
  }

  _inRadius(cx, cy, radius, obj) {
    const bounds = obj.getBounds();
    const closestX = Phaser.Math.Clamp(cx, bounds.left, bounds.right);
    const closestY = Phaser.Math.Clamp(cy, bounds.top, bounds.bottom);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  pulseTacticalHighlight(active) {
    if (!this.icon || !this._armed) return;
    const blink = Math.floor(this.scene.time.now / 200) % 2 === 0;
    if (active && blink) {
      this.icon.setFillStyle(colorFromRgb(1, 0.85, 0.35));
    } else {
      this.icon.setFillStyle(colorFromRgb(0.9, 0.2, 0.25));
    }
  }
}
