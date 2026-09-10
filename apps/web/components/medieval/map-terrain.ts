import type { ClanWorld, Point, Terrain } from "@clan-world/shared";
import { drawSprite, type VillageArt } from "../../lib/medieval/sprites";

export const TILE_SIZE = 32;
export const project = (x: number, y: number): Point => ({ x: x * TILE_SIZE, y: y * TILE_SIZE });
export const unproject = (x: number, y: number): Point => ({ x: x / TILE_SIZE, y: y / TILE_SIZE });
export function noise(n: number) {
  const a = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return a - Math.floor(a);
}
export function polygon(c: CanvasRenderingContext2D, points: Point[], color: string) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach((p, i) => i ? c.lineTo(Math.round(p.x), Math.round(p.y)) : c.moveTo(Math.round(p.x), Math.round(p.y)));
  c.closePath();
  c.fill();
}
export function rectangle(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export const TERRAIN_COLORS: Record<Terrain, string> = {
  grass: "#77715a", dirt: "#8a7c67", sand: "#a19274", water: "#3f5558",
  farm: "#746044", bridge: "#8b7053", mountain: "#77736b", snow: "#a1a294",
};

/** Terrain texture uses world coordinates so neighboring tiles have no visible seams. */
export function terrainCache(world: ClanWorld, _art?: VillageArt) {
  const canvas = document.createElement("canvas");
  canvas.width = world.width * TILE_SIZE;
  canvas.height = world.height * TILE_SIZE;
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const origin = { x: 0, y: 0 };
  const glints: Point[] = [];
  const terrain = (x: number, y: number) => world.tiles[y]?.[x]?.terrain;
  const pixel = (x: number, y: number, w: number, h: number, color: string) => rectangle(c, x, y, w, h, color);
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const tile = world.tiles[y]![x]!, n = x * 719 + y * 197;
    const p = project(x, y);
    pixel(p.x, p.y, TILE_SIZE, TILE_SIZE, TERRAIN_COLORS[tile.terrain]);
    if (tile.terrain === "grass") {
      for (let yy = 0; yy < TILE_SIZE; yy += 4) for (let xx = 0; xx < TILE_SIZE; xx += 4) {
        const wx = p.x + xx, wy = p.y + yy;
        const patch = Math.sin(wx * 0.016) * Math.cos(wy * 0.014) + Math.sin(wx * 0.029 + wy * 0.008) * 0.45;
        const grain = noise(wx * 7 + wy * 37);
        const shade = patch > 0.15 ? ["#7d765d", "#81785f", "#756f57"] : ["#70705a", "#75735c", "#7b7560"];
        pixel(wx, wy, 4, 4, shade[Math.floor(grain * 3)]!);
      }
      for (let i = 0; i < 12; i++) {
        const xx = p.x + Math.floor(noise(n + i * 71) * 15) * 2;
        const yy = p.y + Math.floor(noise(n + i * 93) * 15) * 2;
        const leaf = noise(n + i * 23);
        pixel(xx, yy, leaf > 0.8 ? 4 : 2, 2, leaf > 0.8 ? "#9b8560" : leaf > 0.4 ? "#969074" : "#595d47");
        if (leaf < 0.18) pixel(xx + 2, yy - 2, 2, 3, "#676b50");
      }
    } else if (tile.terrain === "dirt") {
      // Small uneven flagstones share the same two-pixel detail scale as the sprites.
      pixel(p.x, p.y, 32, 32, "#7a705d");
      for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
        const xx = col * 16 + (row % 2 ? 8 : 0), yy = row * 8;
        const left = Math.max(0, xx + 1), right = Math.min(32, xx + 15);
        if (right <= left) continue;
        const v = noise((x * 3 + col) * 163 + (y * 4 + row) * 353);
        const colors = ["#8d816e", "#847c69", "#918570", "#817864", "#9a8b74"];
        pixel(p.x + left, p.y + yy + 1, right - left, 7, colors[Math.floor(v * 5)]!);
        if (v < 0.45) pixel(p.x + left, p.y + yy + 6, 2, 2, "#7a705d");
        if (v > 0.7) pixel(p.x + right - 2, p.y + yy + 1, 2, 2, "#7a705d");
        if (v > 0.4) pixel(p.x + left + 1, p.y + yy + 1, Math.max(1, right - left - 3), 1, "#a4947855");
        if (v < 0.27 && right - left > 7) pixel(p.x + left + 6, p.y + yy + 4, 2, 2, "#6a6555");
      }
    } else if (tile.terrain === "water") {
      const shallow = [terrain(x - 1, y), terrain(x + 1, y), terrain(x, y - 1), terrain(x, y + 1)].some(v => v && v !== "water" && v !== "bridge");
      pixel(p.x, p.y, 32, 32, shallow ? "#546665" : "#40585b");
      for (let i = 0; i < 9; i++) {
        const xx = p.x + Math.floor(noise(n + i * 37) * 25), yy = p.y + Math.floor(noise(n + i * 63) * 30);
        pixel(xx, yy, 3 + Math.floor(noise(n + i) * 5), 1, i % 3 ? "#6c85804b" : "#263f484d");
      }
      if (noise(n) > 0.89) glints.push(project(x + 0.5, y + 0.5));
    } else if (tile.terrain === "bridge") {
      const vertical = terrain(x - 1, y) === "water" || terrain(x + 1, y) === "water";
      for (let i = 0; i < 4; i++) {
        if (vertical) {
          pixel(p.x, p.y + i * 8, 32, 2, "#493e30");
          pixel(p.x + 2, p.y + i * 8 + 2, 28, 1, "#b09872");
          pixel(p.x + 5 + i % 2 * 7, p.y + i * 8 + 5, 12, 1, "#624e38");
        } else {
          pixel(p.x + i * 8, p.y, 2, 32, "#493e30");
          pixel(p.x + i * 8 + 2, p.y + 2, 1, 28, "#b09872");
          pixel(p.x + i * 8 + 5, p.y + 4 + i % 2 * 9, 1, 13, "#624e38");
        }
      }
    } else if (tile.terrain === "farm") {
      for (let i = 0; i < 4; i++) {
        pixel(p.x, p.y + i * 8 + 5, 32, 3, "#504833");
        for (let j = 0; j < 6; j++) {
          const xx = p.x + j * 5 + (i % 2 ? 2 : 0), yy = p.y + i * 8;
          pixel(xx, yy + 2, 2, 5, "#a89558");
          pixel(xx - 1, yy + 1, 4, 2, "#c0ab67");
        }
      }
    } else {
      for (let i = 0; i < 26; i++) {
        const xx = p.x + Math.floor(noise(n + i * 71) * 15) * 2, yy = p.y + Math.floor(noise(n + i * 93) * 15) * 2;
        pixel(xx, yy, 2 + (i % 3 === 0 ? 2 : 0), 2, tile.terrain === "snow" ? i % 2 ? "#b5b4a2" : "#8f9284" : tile.terrain === "mountain" ? i % 2 ? "#8f8a7d" : "#63635d" : i % 2 ? "#b3a385" : "#8b8068");
      }
    }
  }
  for (const object of world.objects) {
    if (!["tree", "oak", "pine"].includes(object.kind)) continue;
    const center = project(object.x, object.y), seed = object.x * 541 + object.y * 313;
    for (let i = 0; i < 35; i++) {
      const angle = noise(seed + i * 19) * Math.PI * 2, radius = noise(seed + i * 41) * 35;
      const xx = Math.floor((center.x + Math.cos(angle) * radius) / 2) * 2;
      const yy = Math.floor((center.y + Math.sin(angle) * radius * 0.65) / 2) * 2;
      if (terrain(Math.floor(xx / TILE_SIZE), Math.floor(yy / TILE_SIZE)) !== "grass") continue;
      pixel(xx, yy, i % 3 ? 2 : 4, 2, object.kind === "pine" ? i % 2 ? "#66644b" : "#908567" : i % 3 ? "#a18a604f" : "#b28c5866");
    }
  }
  // Stipple the shoreline and road shoulders after the ground pass, keeping the collision boundary legible.
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const material = terrain(x, y), p = project(x, y), n = x * 719 + y * 197;
    if (material === "water") continue;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const neighbor = terrain(x + dx!, y + dy!);
      if (neighbor === "water" && material !== "bridge") {
        for (let i = 0; i < 16; i++) {
          const d = 2 + Math.floor(noise(n + i * 41) * 2) * 2;
          const xx = dx === 1 ? 32 - d : dx === -1 ? 0 : i * 2;
          const yy = dy === 1 ? 32 - d : dy === -1 ? 0 : i * 2;
          pixel(p.x + xx, p.y + yy, dx ? d : 2, dy ? d : 2, "#464d41");
          const hx = dx === 1 ? xx - 2 : dx === -1 ? d : xx;
          const hy = dy === 1 ? yy - 2 : dy === -1 ? d : yy;
          pixel(p.x + hx, p.y + hy, 2, 2, material === "sand" ? "#b7aa8b" : "#9b9578");
        }
      }
      if (material === "bridge" && neighbor === "water") {
        if (dx) {
          pixel(p.x + (dx > 0 ? 28 : 1), p.y, 3, 32, "#453a2a");
          pixel(p.x + (dx > 0 ? 28 : 1), p.y, 1, 32, "#c0a277");
          pixel(p.x + (dx > 0 ? 26 : 0), p.y + 5, 6, 5, "#a78a60");
        } else {
          pixel(p.x, p.y + (dy! > 0 ? 28 : 1), 32, 3, "#453a2a");
          pixel(p.x, p.y + (dy! > 0 ? 28 : 1), 32, 1, "#c0a277");
        }
      }
      if ((material === "mountain" || material === "snow") && neighbor && neighbor !== material && neighbor !== "water") {
        for (let i = 0; i < 20; i++) {
          const d = Math.floor(noise(n + i * 37) * 4) * 2;
          const xx = dx === 1 ? 30 - d : dx === -1 ? d : (i * 2) % 32;
          const yy = dy === 1 ? 30 - d : dy === -1 ? d : (i * 2) % 32;
          pixel(p.x + xx, p.y + yy, 2, 2, TERRAIN_COLORS[neighbor]);
        }
      }
      if ((material === "dirt" || material === "sand") && neighbor === "grass") {
        for (let i = 0; i < 15; i++) {
          const d = Math.floor(noise(n + i * 23) * 3) * 2;
          const xx = dx === 1 ? 30 - d : dx === -1 ? d : i * 2;
          const yy = dy === 1 ? 30 - d : dy === -1 ? d : i * 2;
          pixel(p.x + xx, p.y + yy, 2, 2, i % 2 ? "#77715a" : "#a08b69");
        }
      }
    }
  }
  return { canvas, origin, glints };
}

export type Mountain = Point & { depth: number; size: number; snow: boolean; seed: number; };
export function mountainPeaks(world: ClanWorld): Mountain[] {
  const result: Mountain[] = [];
  for (let y = 2; y < world.height - 2; y += 3) for (let x = 2 + Math.floor(y / 3) % 2; x < world.width - 2; x += 3) {
    const tile = world.tiles[y]![x]!;
    if (tile.terrain !== "mountain" && tile.terrain !== "snow") continue;
    if ([[x - 2, y], [x + 2, y], [x, y - 2], [x, y + 2]].some(([xx, yy]) => !["mountain", "snow"].includes(world.tiles[yy!]![xx!]!.terrain))) continue;
    const seed = x * 173 + y * 311;
    const px = x + 0.5 + (noise(seed + 5) - 0.5) * 0.6;
    const py = y + 0.5 + (noise(seed + 7) - 0.5) * 0.5;
    result.push({ x: px, y: py, depth: py + 0.9, size: 0.84 + noise(seed) * 0.36, snow: tile.terrain === "snow", seed });
  }
  return result;
}
export function drawMountain(c: CanvasRenderingContext2D, x: number, y: number, mountain: Mountain, art: VillageArt) {
  const size = mountain.size;
  const flip = noise(mountain.seed + 13) > 0.5;
  if (art.landmarks) {
    drawSprite(c, art.landmarks, mountain.snow ? 1 : 0, x, y + 24 * size, 160 * size, 1, flip);
    return;
  }
  drawSprite(c, art.props, 4, x - 20 * size, y - 35 * size, 132 * size, 1, flip);
  drawSprite(c, art.props, 4, x + 34 * size, y - 6 * size, 104 * size, 1, !flip);
  drawSprite(c, art.props, 4, x - 18 * size, y + 18 * size, 113 * size, 1, !flip);
}

function stoneStep(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rise: number) {
  rectangle(c, x - w / 2 - 2, y - h, w + 4, h + rise + 2, "#393d38");
  rectangle(c, x - w / 2, y, w, rise, "#64675b");
  rectangle(c, x - w / 2, y - h, w, h, "#8c8b76");
  rectangle(c, x - w / 2 + 2, y - h + 2, w - 4, 2, "#b8b098");
  rectangle(c, x - w / 2 + 4, y - h + 7, w - 8, h - 12, "#797e6d");
  for (let i = 0; i < Math.floor(w * h / 90); i++) {
    const xx = x - w / 2 + 5 + noise(i * 163 + w) * (w - 10), yy = y - h + 5 + noise(i * 271 + h) * (h - 10);
    rectangle(c, xx, yy, 2 + i % 3, 1, i % 2 ? "#b4ab8c55" : "#414b4055");
  }
  for (let xx = -w / 2 + 13; xx < w / 2; xx += 19) rectangle(c, x + xx, y + 2, 1, rise - 2, "#474d43");
}
export function drawMonument(c: CanvasRenderingContext2D, x: number, y: number, time: number, art: VillageArt) {
  if (art.landmarks) {
    drawSprite(c, art.landmarks, 2, x, y + 3, 158);
    c.save();
    c.globalAlpha = 0.35 + Math.sin(time * 7) * 0.15;
    for (const dx of [-66, 66]) rectangle(c, x + dx, y - 43, 2, 3, "#e3bd6b");
    c.restore();
    return;
  }
  c.save();
  rectangle(c, x - 79, y - 118, 164, 125, "#3c403743");
  stoneStep(c, x, y, 154, 120, 7);
  stoneStep(c, x, y - 13, 134, 102, 7);
  stoneStep(c, x, y - 26, 114, 84, 7);
  stoneStep(c, x, y - 36, 56, 46, 8);
  drawSprite(c, art.props, 11, x, y - 58, 52);
  for (const dx of [-56, 56]) {
    stoneStep(c, x + dx, y - 22, 20, 20, 4);
    rectangle(c, x + dx - 5, y - 61, 11, 34, "#6c705d");
    rectangle(c, x + dx - 5, y - 61, 3, 33, "#a89e7b");
    rectangle(c, x + dx - 8, y - 64, 17, 5, "#3d4236");
    polygon(c, [{ x: x + dx - 5, y: y - 64 }, { x: x + dx - 4, y: y - 74 }, { x: x + dx + Math.sin(time * 4) * 2, y: y - 82 }, { x: x + dx + 5, y: y - 71 }, { x: x + dx + 4, y: y - 64 }], "#c78741");
    rectangle(c, x + dx - 1, y - 74, 3, 9, "#e5c67c");
  }
  c.restore();
}
