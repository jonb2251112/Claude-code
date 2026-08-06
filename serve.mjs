#!/usr/bin/env node
/**
 * Local static server with COOP/COEP so Play! (PS2) can use SharedArrayBuffer.
 * Bind on all interfaces so an iPhone on the same Wi‑Fi can open the LAN URL.
 *
 * Usage: node serve.mjs [port]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = Number(process.argv[2] || process.env.PORT || 8765);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".nes": "application/octet-stream",
  ".iso": "application/octet-stream",
  ".bin": "application/octet-stream",
  ".cso": "application/octet-stream",
  ".chd": "application/octet-stream",
  ".elf": "application/octet-stream",
  ".zip": "application/zip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function lanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const n of list) {
      if (n.family === "IPv4" && !n.internal) out.push(n.address);
    }
  }
  return out;
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = path.normalize(path.join(root, pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end(String(err && err.message ? err.message : err));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log("");
  console.log("CART is ready (COOP/COEP enabled for PS2)");
  console.log(`  Local:  http://127.0.0.1:${port}/`);
  for (const ip of lanAddresses()) {
    console.log(`  iPhone: http://${ip}:${port}/   ← open this on Safari (same Wi‑Fi)`);
  }
  console.log("");
  console.log("iPhone tips:");
  console.log("  • Prefer NES mode — PS2 WASM threads are flaky in iOS Safari");
  console.log("  • Safari → Share → Add to Home Screen for fullscreen play");
  console.log("  • Import .nes / .zip from the Files app");
  console.log("");
});
