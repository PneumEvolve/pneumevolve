import Phaser from 'phaser';
import { GAME, loadSave, resetShared } from './state';
import { DungeonScene } from './scenes/DungeonScene';
import { RaidScene } from './scenes/RaidScene';
import { TownScene } from './scenes/TownScene';
import { UIScene } from './scenes/UIScene';

/**
 * DUNGEON TOWN
 * Creates the game inside `parent` (a DOM element). Returns the Phaser.Game.
 * Call game.destroy(true) to clean up. Works with Phaser 3.80+ and 4.x.
 *
 * Where things live:
 *   tuning.js   numbers and stats (enemies, creatures, buildings, items)
 *   maps.js     dungeon rooms, bandit camps, town layout
 *   state.js    save file, HUD, controls
 *   textures.js pixel art
 *   combat.js   shared fight code;  scenes/  Town, Dungeon, Raid, UI
 */
export function createDungeonTownGame(parent, { onExit } = {}) {
  GAME.onExit = onExit || null;
  loadSave();
  resetShared();
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0e1013',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || window.innerWidth, height: parent.clientHeight || window.innerHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 5 },
    scene: [TownScene, DungeonScene, RaidScene, UIScene],
  });
}