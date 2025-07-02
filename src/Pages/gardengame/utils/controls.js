// src/Pages/gardengame/utils/controls.js
export const handleKeyDownFactory = ({
  shiftPressed,
  setShiftPressed,
  handleMovement,
  shootProjectile,
  handlePlantSeed,
  setSeedType,
}) => {
  return (e) => {
    const key = e.key.toLowerCase();

    if (e.key === "Shift") {
      setShiftPressed(true);
      return;
    }

    let dx = 0, dy = 0;

    if (key === "arrowup" || key === "w") dy = -1;
    else if (key === "arrowdown" || key === "s") dy = 1;
    else if (key === "arrowleft" || key === "a") dx = -1;
    else if (key === "arrowright" || key === "d") dx = 1;
    else if (key === " " || key === "spacebar") {
      e.preventDefault();
      handlePlantSeed();
      return;
    } else if (key === "q") {
      setSeedType((prev) => (prev === 1 ? 2 : 1));
      return;
    } else if (key === "e") {
      setSeedType((prev) => (prev === 2 ? 1 : 2));
      return;
    }

    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      if (shiftPressed) {
        shootProjectile(dx, dy);
      } else {
        handleMovement(dx, dy);
      }
    }
  };
};

export function handleKeyUpFactory(setShiftPressed) {
  return function handleKeyUp(e) {
    if (e.key === "Shift") {
      setShiftPressed(false);
    }
  };
}