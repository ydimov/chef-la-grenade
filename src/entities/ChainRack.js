import { GameGlobals } from '../systems/GameGlobals.js';
import { colorFromRgb } from '../config.js';

export class ChainRack extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x + 24, y + 20, 48, 40, colorFromRgb(0.7, 0.25, 0.15));
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this._triggered = false;
    this.chainTargets = [];

    this.label = scene.add.text(x + 8, y + 12, 'Rack', {
      fontSize: '12px',
      color: '#ffffff',
    });

    scene.chainProps.add(this);
  }

  triggerChain() {
    if (this._triggered) return;
    this._triggered = true;
    GameGlobals.requestHitStop();

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      delay: 80,
      onStart: () => {
        this.setFillStyle(colorFromRgb(1, 0.4, 0.2));
      },
    });

    for (const target of this.chainTargets) {
      target?.breakPoint?.('chain');
    }

    this.scene.time.delayedCall(80, () => {
      this.setVisible(false);
      this.label.setVisible(false);
      this.body.enable = false;
    });
  }
}
