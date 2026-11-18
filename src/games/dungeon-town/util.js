// Small helpers shared everywhere.
import Phaser from 'phaser';

export const V = Phaser.Math.Vector2;

// Tint helpers for Phaser 3 (setTintFill) and Phaser 4 (tint modes)
export const V4 = !!(Phaser.TintModes && Phaser.TintModes.FILL !== undefined);

export const flash = (obj, color) => {
  if (V4 && typeof obj.setTintMode === 'function') obj.setTint(color).setTintMode(Phaser.TintModes.FILL);
  else if (typeof obj.setTintFill === 'function') obj.setTintFill(color);
  else obj.setTint(color);
};

export const untint = (obj) => {
  obj.clearTint();
  if (V4 && typeof obj.setTintMode === 'function') obj.setTintMode(Phaser.TintModes.MULTIPLY);
  return obj;
};

export const kids = (group) => group.getChildren().slice();

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const FONT = 'system-ui,-apple-system,"Segoe UI",sans-serif';