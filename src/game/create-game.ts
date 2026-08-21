import Phaser from "./phaser";
import { H, W } from "./constants";
import { PlayScene } from "./scenes/play-scene";
import type { CreateGameOptions } from "./types";

export function createGame(parent: HTMLElement, options: CreateGameOptions): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#10080c",
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    banner: false,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: W,
      height: H,
    },
    audio: { disableWebAudio: true },
    input: { keyboard: true, gamepad: true },
    scene: [PlayScene],
  });
  game.registry.set("options", options);
  return game;
}
