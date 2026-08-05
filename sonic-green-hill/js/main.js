import { Game } from "./game.js";

const canvas = document.getElementById("game");
const game = new Game(canvas);

function fitCanvas() {
  // Keep internal resolution fixed for crisp pixels; CSS scales it.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // Stay at design resolution — CSS handles display size
  void dpr;
}

fitCanvas();
window.addEventListener("resize", fitCanvas);

document.getElementById("btn-start")?.addEventListener("click", () => {
  game.start();
  game._syncUI();
});

document.getElementById("btn-resume")?.addEventListener("click", () => {
  game.state = "playing";
  game._syncUI();
});

document.getElementById("btn-restart")?.addEventListener("click", () => {
  game.fullRestart();
  game._syncUI();
});

document.getElementById("btn-again")?.addEventListener("click", () => {
  game.checkpoint = null;
  game.fullRestart();
  game._syncUI();
});

document.getElementById("btn-pause")?.addEventListener("click", () => {
  game.togglePause();
  game._syncUI();
});

// Prevent page scroll while playing on mobile
document.body.addEventListener(
  "touchmove",
  (e) => {
    if (game.state === "playing") e.preventDefault();
  },
  { passive: false }
);

game.showTitle();
