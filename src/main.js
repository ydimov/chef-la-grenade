import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './config.js';
import { KitchenGymScene } from './scenes/KitchenGymScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#2a2a30',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: PHYSICS.GRAVITY_Y },
      fps: 60,
      fixedStep: true,
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [KitchenGymScene],
};

const game = new Phaser.Game(config);
