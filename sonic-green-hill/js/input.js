/** Keyboard + on-screen touch controls */
export class Input {
  constructor() {
    this.keys = Object.create(null);
    this._bind();
  }

  _bind() {
    const set = (code, down) => {
      const map = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        KeyA: "left",
        KeyD: "right",
        KeyW: "up",
        KeyS: "down",
        KeyZ: "jump",
        KeyX: "spin",
        Space: "spin",
        KeyJ: "jump",
        KeyK: "spin",
        Escape: "pause",
        KeyP: "pause",
      };
      const k = map[code];
      if (k) this.keys[k] = down;
    };

    window.addEventListener("keydown", (e) => {
      set(e.code, true);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => set(e.code, false));

    const bindBtn = (el) => {
      const key = el.dataset.key;
      const on = (e) => {
        e.preventDefault();
        this.keys[key] = true;
        el.classList.add("pressed");
      };
      const off = (e) => {
        e.preventDefault();
        this.keys[key] = false;
        el.classList.remove("pressed");
      };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("pointercancel", off);
    };

    document.querySelectorAll(".ctrl").forEach(bindBtn);
  }

  down(k) {
    return !!this.keys[k];
  }

  consume(k) {
    if (!this.keys[k]) return false;
    this.keys[k] = false;
    return true;
  }
}
