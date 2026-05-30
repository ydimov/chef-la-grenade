import { GameGlobals } from './GameGlobals.js';
import { CAMERA, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class TacticalCamera {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.cam = scene.cameras.main;

    this.cam.setZoom(CAMERA.NORMAL_ZOOM);
    this._targetZoom = CAMERA.NORMAL_ZOOM;
    this._shakeStrength = 0;
    this._shakeOffset = { x: 0, y: 0 };

    this._buildOverlay();
    GameGlobals.on('armedBombsChanged', (count) => this._onArmedChanged(count));
  }

  _buildOverlay() {
    const scene = this.scene;
    this.overlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(900).setVisible(false);

    const panel = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x0d141f,
      0.35,
    );
    panel.setScrollFactor(0);

    this.hintLabel = scene.add
      .text(24, 16, 'TACTICAL — E to detonate all', {
        fontSize: '20px',
        color: '#ffe699',
      })
      .setScrollFactor(0);

    this.armedLabel = scene.add
      .text(24, 48, 'Armed charges: 0', {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setScrollFactor(0);

    this.overlay.add([panel, this.hintLabel, this.armedLabel]);
  }

  _onArmedChanged(count) {
    if (this.armedLabel) {
      this.armedLabel.setText(`Armed charges: ${count}`);
    }
  }

  update(delta, inputState) {
    const dt = delta / 1000;
    const tactical = inputState.tactical && !this._isPlayerDead();
    GameGlobals.setTacticalView(tactical);

    this._targetZoom = tactical ? CAMERA.TACTICAL_ZOOM : CAMERA.NORMAL_ZOOM;
    const currentZoom = this.cam.zoom;
    this.cam.setZoom(
      Phaser.Math.Linear(currentZoom, this._targetZoom, CAMERA.ZOOM_LERP_SPEED * dt),
    );

    this.overlay.setVisible(tactical);

    if (this.player?.active) {
      const px = this.player.x + this._shakeOffset.x;
      const py = this.player.y + CAMERA.FOLLOW_OFFSET_Y + this._shakeOffset.y;
      this.cam.centerOn(px, py);
    }

    if (tactical) {
      this._pulseArmedBombs();
    }
  }

  applyShake(delta) {
    if (this._shakeStrength > 0) {
      this._shakeStrength = Phaser.Math.Linear(this._shakeStrength, 0, (delta / 1000) * 24);
      this._shakeOffset.x = Phaser.Math.FloatBetween(-1, 1) * this._shakeStrength;
      this._shakeOffset.y = Phaser.Math.FloatBetween(-1, 1) * this._shakeStrength;
    } else {
      this._shakeOffset.x = 0;
      this._shakeOffset.y = 0;
    }
  }

  cameraShake(amount) {
    this._shakeStrength = Math.max(this._shakeStrength, amount);
  }

  _isPlayerDead() {
    return false;
  }

  _pulseArmedBombs() {
    for (const bomb of GameGlobals.armedBombs) {
      bomb.pulseTacticalHighlight?.(true);
    }
  }
}
