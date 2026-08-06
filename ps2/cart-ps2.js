/**
 * Play! (PS2) loader for CART.
 * Expects #outputCanvas in the DOM and Play.js / Play.wasm beside this file.
 */
import Play from "./Play.js";

class DiscImageDevice {
  constructor(module) {
    this.module = module;
    this.doneFlag = false;
    this.file = null;
  }

  read(dstPtr, offset, size) {
    if (!this.file) throw new Error("No disc image set.");
    this.doneFlag = false;
    const subsection = this.file.slice(offset, offset + size);
    subsection.arrayBuffer().then((value) => {
      this.module.HEAPU8.set(new Uint8Array(value), dstPtr);
      this.doneFlag = true;
    });
  }

  getFileSize() {
    if (!this.file) throw new Error("No disc image set.");
    return this.file.size;
  }

  isDone() {
    return this.doneFlag;
  }

  setFile(file) {
    this.file = file;
  }
}

let PlayModule = null;
let initPromise = null;

function locateFile(pathName) {
  const base = new URL(".", import.meta.url).href;
  return base + pathName;
}

export function isPs2Ready() {
  return !!PlayModule;
}

export function hasSharedArrayBuffer() {
  return typeof SharedArrayBuffer !== "undefined";
}

export async function initPs2() {
  if (PlayModule) return PlayModule;
  if (initPromise) return initPromise;
  if (!hasSharedArrayBuffer()) {
    throw new Error(
      "SharedArrayBuffer unavailable. Open CART via node serve.mjs (COOP/COEP headers required for PS2)."
    );
  }

  initPromise = (async () => {
    const canvas = document.getElementById("outputCanvas");
    if (!canvas) throw new Error("Missing #outputCanvas");

    PlayModule = await Play({
      locateFile,
      mainScriptUrlOrBlob: locateFile("Play.js"),
      canvas,
    });
    PlayModule.FS.mkdir("/work");
    PlayModule.discImageDevice = new DiscImageDevice(PlayModule);
    PlayModule.ccall("initVm", "", [], []);
    try {
      canvas.focus();
    } catch (_) {}
    return PlayModule;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    PlayModule = null;
    throw err;
  }
}

export async function bootDiscFile(file) {
  const mod = await initPs2();
  const name = file.name || "game.iso";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";

  if (ext === ".elf") {
    const data = new Uint8Array(await file.arrayBuffer());
    const stream = mod.FS.open(name, "w+");
    mod.FS.write(stream, data, 0, data.length, 0);
    mod.FS.close(stream);
    mod.bootElf(name);
  } else {
    mod.discImageDevice.setFile(file);
    mod.bootDiscImage(name);
  }

  const canvas = document.getElementById("outputCanvas");
  if (canvas) canvas.focus();
}

/** Touch pad → Play! keyboard bindings (KeyboardEvent.code). */
export const PS2_KEY = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  START: "Enter",
  SELECT: "Backspace",
  SQUARE: "KeyA",
  CROSS: "KeyZ",
  TRIANGLE: "KeyS",
  CIRCLE: "KeyX",
  L1: "Key1",
  L2: "Key2",
  L3: "Key3",
  R1: "Key8",
  R2: "Key9",
  R3: "Key0",
  LX_LEFT: "KeyF",
  LX_RIGHT: "KeyH",
  LY_UP: "KeyT",
  LY_DOWN: "KeyG",
  RX_LEFT: "KeyJ",
  RX_RIGHT: "KeyL",
  RY_UP: "KeyI",
  RY_DOWN: "KeyK",
};

export function sendPs2Key(code, isDown) {
  const canvas = document.getElementById("outputCanvas");
  if (!canvas) return;
  const type = isDown ? "keydown" : "keyup";
  canvas.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: code,
      bubbles: true,
      cancelable: true,
    })
  );
}

export function getFps() {
  if (!PlayModule) return 0;
  try {
    const frames = PlayModule.getFrames();
    PlayModule.clearStats();
    return frames;
  } catch (_) {
    return 0;
  }
}

export default {
  initPs2,
  bootDiscFile,
  sendPs2Key,
  hasSharedArrayBuffer,
  isPs2Ready,
  getFps,
  PS2_KEY,
};
