"use client";
import { useEffect, useRef } from "react";

export type MapSite = {
  id: string;
  name: string;
  x: number;
  y: number;
  owner?: string;
  stock?: number;
  kind?: string;
};
export type MapActor = {
  id: string;
  x: number;
  y: number;
  role?: string;
  team?: string;
  working?: boolean;
  remaining?: number;
};
export type WorldView = {
  hero: {
    x: number;
    y: number;
    moving?: boolean;
    facing?: string;
    targetSiteId?: string | null;
  };
  feedback?: { id: number; siteId: string; amount: number; resource: string }[];
  actors: MapActor[];
  sites: MapSite[];
  selected?: string;
  active: boolean;
  target?: { x: number; y: number };
};
type Props = {
  view: WorldView;
  onPoint: (x: number, y: number) => void;
  onSite: (id: string) => void;
  zoom: number;
  ambient?: boolean;
};
const W = 1200,
  H = 760;
function hash(n: number) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function poly(c: CanvasRenderingContext2D, points: number[][], fill: string) {
  c.fillStyle = fill;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.closePath();
  c.fill();
}
function rect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  col: string,
) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function tree(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  variant: number,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(s, s);
  ellipse(c, 8, 4, 29, 10, "#081e1b55");
  rect(c, -4, -28, 9, 31, "#3c3325");
  rect(c, 0, -28, 3, 31, "#866640");
  rect(c, -9, -9, 5, 6, "#443d2c");
  const palette =
    variant === 1
      ? ["#3e5424", "#697435", "#92904a", "#b3a15b"]
      : variant === 2
        ? ["#693f26", "#a55a2c", "#c8833c", "#e2aa53"]
        : ["#103c2c", "#1b5435", "#2f7143", "#49874e"];
  poly(
    c,
    [
      [-30, -26],
      [-35, -38],
      [-28, -46],
      [-30, -54],
      [-22, -54],
      [-24, -64],
      [-12, -66],
      [-8, -78],
      [6, -80],
      [12, -72],
      [22, -70],
      [24, -59],
      [31, -55],
      [29, -42],
      [36, -36],
      [28, -26],
      [11, -19],
      [-14, -19],
    ],
    palette[0]!,
  );
  poly(
    c,
    [
      [-28, -43],
      [-24, -54],
      [-15, -57],
      [-13, -68],
      [-3, -73],
      [9, -68],
      [11, -60],
      [21, -58],
      [22, -48],
      [28, -42],
      [17, -32],
      [-10, -30],
    ],
    palette[1]!,
  );
  poly(
    c,
    [
      [-20, -53],
      [-14, -60],
      [-8, -62],
      [-7, -70],
      [3, -71],
      [7, -64],
      [15, -61],
      [13, -55],
      [22, -51],
      [12, -42],
      [-3, -40],
      [-7, -47],
      [-20, -46],
    ],
    palette[2]!,
  );
  for (let i = 0; i < 16; i++) {
    const px = (hash(i + variant * 19) - 0.5) * 41,
      py = -38 - hash(i + 60) * 30;
    rect(c, px, py, 4 + Math.floor(hash(i + 5) * 5), 3, palette[i % 4]!);
  }
  rect(c, -7, -67, 6, 3, palette[3]!);
  rect(c, -18, -54, 5, 3, palette[3]!);
  c.restore();
}
function rock(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  crystal = false,
) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  ellipse(c, 3, 3, 25, 9, "#0c28284d");
  poly(
    c,
    [
      [-23, 0],
      [-20, -20],
      [-6, -32],
      [13, -27],
      [25, -8],
      [15, 4],
      [-12, 5],
    ],
    "#384746",
  );
  poly(
    c,
    [
      [-20, -20],
      [-6, -32],
      [13, -27],
      [6, -13],
      [-7, -10],
    ],
    "#768579",
  );
  poly(
    c,
    [
      [6, -13],
      [13, -27],
      [25, -8],
      [15, 4],
      [5, 0],
    ],
    "#4c6260",
  );
  rect(c, -15, -17, 8, 3, "#a2a58b");
  if (crystal) {
    poly(
      c,
      [
        [-6, -7],
        [-9, -38],
        [-2, -47],
        [4, -34],
        [3, -9],
      ],
      "#73f4ce",
    );
    poly(
      c,
      [
        [4, -7],
        [9, -31],
        [16, -34],
        [19, -21],
        [11, 0],
      ],
      "#26bdb0",
    );
    rect(c, -3, -40, 3, 24, "#c7ffe0");
  }
  c.restore();
}
function house(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  red = false,
) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  ellipse(c, 5, 10, 58, 17, "#0a241b66");
  poly(
    c,
    [
      [-40, -37],
      [12, -48],
      [48, -26],
      [48, 11],
      [0, 25],
      [-40, 4],
    ],
    "#5c4930",
  );
  poly(
    c,
    [
      [0, -25],
      [48, -26],
      [48, 11],
      [0, 25],
    ],
    "#433b2a",
  );
  for (let i = 0; i < 4; i++) {
    rect(c, -37, -27 + i * 9, 36, 3, "#967448");
    poly(
      c,
      [
        [1, -16 + i * 9],
        [46, -29 + i * 9],
        [46, -26 + i * 9],
        [1, -13 + i * 9],
      ],
      "#6c5838",
    );
  }
  poly(
    c,
    [
      [-54, -36],
      [-10, -81],
      [12, -76],
      [59, -29],
      [2, -11],
    ],
    red ? "#643b30" : "#385447",
  );
  poly(
    c,
    [
      [-54, -36],
      [-10, -81],
      [1, -32],
    ],
    red ? "#af653a" : "#738260",
  );
  poly(
    c,
    [
      [-10, -81],
      [12, -76],
      [59, -29],
      [1, -32],
    ],
    red ? "#8b4a31" : "#4c6550",
  );
  for (let i = 0; i < 5; i++) {
    const yy = -68 + i * 9;
    poly(
      c,
      [
        [-10 + i * 2, yy],
        [16 + i * 7, yy + 2],
        [20 + i * 7, yy + 6],
        [-7 + i * 2, yy + 4],
      ],
      red ? "#b17441" : "#708365",
    );
  }
  rect(c, -22, -12, 14, 26, "#1b2721");
  rect(c, -21, -11, 11, 4, "#b19960");
  rect(c, 18, -8, 14, 13, "#d7943d");
  rect(c, 24, -8, 2, 13, "#705536");
  rect(c, 18, -2, 14, 2, "#705536");
  rect(c, 25, -64, 9, 22, "#777765");
  rect(c, 23, -65, 13, 5, "#aaa88e");
  rect(c, -38, 4, 7, 11, "#98825a");
  rect(c, -30, 8, 7, 11, "#ad9260");
  c.restore();
}
function shrine(c: CanvasRenderingContext2D, x: number, y: number) {
  ellipse(c, x, y + 10, 69, 27, "#1d4d424d");
  for (let i = 3; i >= 0; i--)
    poly(
      c,
      [
        [x - 58 + i * 7, y + 4 - i * 7],
        [x, y - 23 - i * 7],
        [x + 58 - i * 7, y + 4 - i * 7],
        [x, y + 30 - i * 7],
      ],
      i % 2 ? "#879382" : "#5e7268",
    );
  for (const dx of [-40, 40]) {
    rect(c, x + dx - 7, y - 67, 14, 64, "#4d675d");
    rect(c, x + dx - 8, y - 68, 16, 8, "#98a08a");
    rect(c, x + dx - 3, y - 54, 3, 30, "#a0bb91");
  }
  poly(
    c,
    [
      [x - 12, y - 23],
      [x - 15, y - 69],
      [x, y - 89],
      [x + 15, y - 69],
      [x + 12, y - 23],
    ],
    "#245f59",
  );
  poly(
    c,
    [
      [x, y - 87],
      [x + 12, y - 68],
      [x, y - 19],
      [x - 12, y - 68],
    ],
    "#6cffcf",
  );
  poly(
    c,
    [
      [x, y - 80],
      [x + 6, y - 68],
      [x, y - 35],
      [x - 6, y - 68],
    ],
    "#d2ffe0",
  );
  rect(c, x - 2, y - 59, 4, 20, "#297d66");
  rect(c, x - 6, y - 55, 12, 3, "#297d66");
}
function baseMap(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  rect(c, 0, 0, W, H, "#102e2c");
  for (let y = 0; y < H; y += 10)
    for (let x = 0; x < W; x += 14) {
      const n = hash(x * 3 + y * 7);
      if (n > 0.63) rect(c, x, y, 8, 2, n > 0.87 ? "#28504a" : "#1b403b");
    }
  const shore = [
    [10, 70],
    [140, 28],
    [350, 66],
    [492, 28],
    [650, 70],
    [785, 27],
    [930, 37],
    [1137, 98],
    [1193, 261],
    [1115, 352],
    [1153, 450],
    [1057, 541],
    [1082, 647],
    [918, 708],
    [756, 687],
    [615, 730],
    [464, 686],
    [271, 705],
    [106, 615],
    [151, 531],
    [26, 425],
    [67, 305],
    [12, 213],
  ];
  poly(
    c,
    shore.map(([x, y]) => [x!, y! + 18]),
    "#1a4940",
  );
  poly(
    c,
    shore.map(([x, y]) => [x!, y! + 8]),
    "#627553",
  );
  poly(c, shore, "#344e35");
  c.save();
  c.beginPath();
  shore.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.closePath();
  c.clip();
  for (let y = 0; y < H; y += 5)
    for (let x = 0; x < W; x += 6) {
      const n = hash(x * 2.17 + y * 13.14);
      if (n > 0.75)
        rect(
          c,
          x,
          y,
          3,
          2,
          n > 0.96 ? "#718351" : n > 0.9 ? "#586d42" : "#3b5938",
        );
      if (n < 0.015) {
        rect(c, x, y, 2, 4, "#274b31");
        rect(c, x + 3, y + 1, 2, 3, "#526c43");
      }
    }
  const path = (pts: number[][], width: number) => {
    c.strokeStyle = "#5f6441";
    c.lineWidth = width + 9;
    c.lineJoin = "round";
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
    c.stroke();
    c.strokeStyle = "#8a8051";
    c.lineWidth = width;
    c.stroke();
    c.strokeStyle = "#9b8a58";
    c.lineWidth = width - 7;
    c.stroke();
  };
  path(
    [
      [255, 567],
      [341, 506],
      [444, 489],
      [515, 418],
      [600, 390],
      [699, 421],
      [791, 523],
      [891, 583],
    ],
    28,
  );
  path(
    [
      [443, 489],
      [377, 415],
      [297, 363],
      [260, 300],
      [182, 265],
    ],
    21,
  );
  path(
    [
      [600, 390],
      [640, 315],
      [610, 250],
      [715, 201],
      [811, 220],
      [880, 275],
    ],
    23,
  );
  path(
    [
      [880, 275],
      [957, 224],
      [980, 150],
      [1039, 103],
    ],
    20,
  );
  for (let i = 0; i < 150; i++) {
    const x = hash(i * 7) * W,
      y = hash(i * 9 + 11) * H;
    if (x > 200 && x < 1000) rect(c, x, y, 2, 2, "#adb17b");
  }
  const river = [
    [1040, -20],
    [1000, 43],
    [895, 83],
    [894, 138],
    [819, 169],
    [791, 216],
    [803, 277],
    [756, 327],
    [790, 375],
    [873, 398],
    [932, 447],
    [949, 526],
    [1018, 583],
    [998, 685],
    [1044, 790],
  ];
  c.strokeStyle = "#839c76";
  c.lineWidth = 62;
  c.lineJoin = "round";
  c.beginPath();
  river.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.stroke();
  c.strokeStyle = "#2a6960";
  c.lineWidth = 52;
  c.stroke();
  c.strokeStyle = "#2c7a6d";
  c.lineWidth = 35;
  c.stroke();
  for (let i = 0; i < 120; i++) {
    const x = 780 + hash(i * 71) * 230,
      y = hash(i * 73) * H;
    rect(c, x, y, 5, 1, "#477b5f33");
  }
  // Bridges connect both river crossings.
  for (const [x, y] of [
    [803, 242],
    [936, 461],
  ]) {
    c.save();
    c.translate(x!, y!);
    c.rotate(0.3);
    rect(c, -39, -16, 78, 36, "#4b422d");
    for (let i = 0; i < 11; i++) {
      rect(c, -38 + i * 7, -15, 5, 32, i % 2 ? "#ac8d57" : "#8d744a");
    }
    rect(c, -42, -21, 84, 4, "#c2a66b");
    rect(c, -42, 20, 84, 4, "#605239");
    for (const dx of [-41, 37]) {
      rect(c, dx, -26, 5, 14, "#c1a36c");
      rect(c, dx, 16, 5, 14, "#a18653");
    }
    c.restore();
  }
  c.restore();
  // Depth-sorted scenery leaves the gathering sites and paths readable.
  const trees: { x: number; y: number; s: number; v: number }[] = [];
  for (let i = 0; i < 240; i++) {
    const x = 40 + hash(i * 5 + 9) * 1090,
      y = 105 + hash(i * 11 + 3) * 535;
    const clear = [
      [270, 530, 95],
      [260, 300, 72],
      [780, 520, 92],
      [880, 275, 85],
      [610, 250, 92],
      [600, 390, 130],
      [980, 150, 75],
      [450, 485, 80],
      [350, 425, 55],
      [685, 445, 60],
      [730, 205, 60],
    ];
    if (
      clear.some(([a, b, r]) => Math.hypot(x - a!, y - b!) < r!) ||
      (x > 755 && x < 970 && y < 460)
    )
      continue;
    trees.push({
      x,
      y,
      s: 0.65 + hash(i + 98) * 0.6,
      v: hash(i + 44) > 0.91 ? 2 : hash(i + 14) > 0.73 ? 1 : 0,
    });
  }
  trees.sort((a, b) => a.y - b.y).forEach((t) => tree(c, t.x, t.y, t.s, t.v));
  // Home encampment.
  house(c, 245, 519, 1.03);
  house(c, 326, 552, 0.63);
  house(c, 205, 585, 0.56);
  for (let i = 0; i < 4; i++) {
    rect(c, 310 + i * 12, 498, 9, 12, "#7c673f");
    rect(c, 311 + i * 12, 500, 7, 2, "#b6945a");
  }
  house(c, 982, 142, 0.76, true);
  house(c, 1050, 174, 0.52, true);
  // Resource landmarks.
  for (let i = 0; i < 5; i++)
    tree(
      c,
      239 + (i % 3) * 27,
      286 + Math.floor(i / 3) * 29,
      0.8 + (i % 2) * 0.1,
      i === 4 ? 2 : 1,
    );
  for (let i = 0; i < 6; i++)
    rock(
      c,
      750 + (i % 3) * 29,
      494 + Math.floor(i / 3) * 25,
      0.6 + hash(i) * 0.5,
      i === 2,
    );
  ellipse(c, 880, 279, 48, 24, "#5a8b72");
  ellipse(c, 880, 277, 39, 19, "#2f7970");
  ellipse(c, 880, 274, 29, 13, "#60bca2");
  rock(c, 882, 269, 0.9, true);
  for (let i = 0; i < 4; i++) {
    const x = 575 + i * 23,
      y = 250 + (i % 2) * 12;
    rect(c, x, y - 38, 12, 42, "#697464");
    rect(c, x - 3, y - 41, 18, 8, "#9a9d7e");
    rect(c, x + 3, y - 31, 4, 27, "#8d977d");
  }
  poly(
    c,
    [
      [568, 220],
      [645, 220],
      [645, 229],
      [568, 229],
    ],
    "#919b7c",
  );
  rock(c, 602, 277, 0.65);
  shrine(c, 600, 390);
  for (let i = 0; i < 35; i++) {
    const x = 100 + hash(i * 47) * 1000,
      y = 130 + hash(i * 61) * 510;
    if (i % 3 === 0) {
      rect(c, x, y, 5, 3, "#d99a5e");
      rect(c, x + 2, y + 3, 2, 4, "#b6ad7d");
    } else {
      rect(c, x, y, 2, 2, i % 2 ? "#ded29a" : "#c3b278");
    }
  }
  return canvas;
}
function creature(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  walking: boolean,
  role: string,
  facing: number,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(facing * 1.5, 1.5);
  const gait = walking ? Math.sin(t * 12) * 3 : 0,
    bob = walking ? Math.abs(Math.sin(t * 12)) : Math.sin(t * 2) * 0.5;
  ellipse(c, 0, 1, role === "treant" ? 15 : 14, 4, "#09291d70");
  if (role === "fox") {
    for (let i = 0; i < 4; i++) {
      rect(c, -10 + i * 6, -6 + (i % 2 ? gait : -gait), 3, 8, "#623d27");
      rect(c, -10 + i * 6, 1 + (i % 2 ? gait : -gait), 4, 2, "#d3c597");
    }
    poly(
      c,
      [
        [-10, -5 + bob],
        [-15, -13 + bob],
        [-11, -19 + bob],
        [4, -20 + bob],
        [12, -12 + bob],
        [10, -5 + bob],
      ],
      "#db8a3d",
    );
    rect(c, -10, -17 + bob, 18, 7, "#f1af55");
    rect(c, -10, -8 + bob, 19, 4, "#f0dbaa");
    poly(
      c,
      [
        [6, -11 + bob],
        [5, -23 + bob],
        [9, -31 + bob],
        [13, -24 + bob],
        [18, -27 + bob],
        [21, -19 + bob],
        [26, -15 + bob],
        [20, -10 + bob],
      ],
      "#e59c46",
    );
    rect(c, 10, -25 + bob, 2, 4, "#6b4432");
    rect(c, 18, -23 + bob, 2, 4, "#6b4432");
    rect(c, 16, -19 + bob, 3, 3, "#18392b");
    rect(c, 23, -16 + bob, 3, 2, "#193027");
    rect(c, 16, -12 + bob, 7, 3, "#f8e5b6");
    c.save();
    c.translate(-12, -12);
    c.rotate(Math.sin(t * 6) * 0.2);
    poly(
      c,
      [
        [2, 4],
        [-7, 0],
        [-14, -10],
        [-16, -21],
        [-8, -18],
        [-5, -9],
        [3, -4],
      ],
      "#e89440",
    );
    poly(
      c,
      [
        [-14, -10],
        [-16, -21],
        [-8, -18],
        [-6, -12],
      ],
      "#f5e1b7",
    );
    c.restore();
  } else if (role === "stag") {
    for (let i = 0; i < 4; i++) {
      rect(c, -12 + i * 7, -7 + (i % 2 ? gait : -gait), 3, 14, "#b9cab9");
      rect(c, -12 + i * 7, 5 + (i % 2 ? gait : -gait), 4, 3, "#4b6b66");
    }
    poly(
      c,
      [
        [-16, -10 + bob],
        [-15, -24 + bob],
        [-8, -28 + bob],
        [9, -25 + bob],
        [14, -9 + bob],
      ],
      "#c8dacc",
    );
    rect(c, -11, -25 + bob, 17, 12, "#f0ecd6");
    poly(
      c,
      [
        [8, -14 + bob],
        [7, -32 + bob],
        [12, -41 + bob],
        [18, -39 + bob],
        [22, -30 + bob],
        [16, -29 + bob],
        [15, -10 + bob],
      ],
      "#e0e6d3",
    );
    rect(c, 17, -36 + bob, 2, 2, "#429e96");
    rect(c, 20, -32 + bob, 4, 2, "#496c62");
    const antler = "#c1f4dd";
    rect(c, 9, -53 + bob, 2, 15, antler);
    rect(c, 5, -54 + bob, 2, 10, antler);
    rect(c, 4, -46 + bob, 7, 2, antler);
    rect(c, 15, -54 + bob, 2, 16, antler);
    rect(c, 20, -52 + bob, 2, 9, antler);
    rect(c, 15, -45 + bob, 7, 2, antler);
    rect(c, 7, -58 + bob, 2, 7, antler);
    rect(c, 13, -59 + bob, 2, 8, antler);
  } else {
    rect(c, -12, -11 + gait, 8, 13, "#5b5532");
    rect(c, 6, -11 - gait, 8, 13, "#746c3d");
    poly(
      c,
      [
        [-13, -8],
        [-18, -26],
        [-12, -43],
        [-4, -48],
        [11, -44],
        [18, -23],
        [12, -7],
      ],
      "#645b35",
    );
    rect(c, -6, -40, 4, 28, "#97804c");
    rect(c, 5, -40, 3, 29, "#9e9153");
    rect(c, -9, -37, 4, 3, "#a4f6ae");
    rect(c, 6, -37, 4, 3, "#a4f6ae");
    rect(c, -4, -29, 10, 2, "#253c27");
    rect(c, -23, -31 - gait, 7, 23, "#747444");
    rect(c, 18, -31 + gait, 7, 23, "#77733d");
    poly(
      c,
      [
        [-16, -44],
        [-23, -50],
        [-19, -60],
        [-9, -61],
        [-7, -68],
        [5, -70],
        [10, -63],
        [20, -62],
        [24, -51],
        [14, -44],
      ],
      "#457046",
    );
    rect(c, -10, -61, 16, 7, "#6c9659");
    rect(c, -18, -52, 9, 5, "#6c9659");
  }
  c.restore();
}
function person(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  walking: boolean,
  role: string,
  team: string,
  working: boolean,
  facing = 1,
) {
  if (role === "fox" || role === "stag" || role === "treant") {
    creature(c, x, y, t, walking, role, facing);
    return;
  }
  const phase = Math.floor(t * 10) % 8,
    step = walking ? [0, 2, 3, 2, 0, -2, -3, -2][phase]! : 0,
    bob = walking ? (phase % 4 === 1 ? -1 : 0) : Math.sin(t * 2) > 0.7 ? -1 : 0;
  const skin = "#d7ae75",
    dark = "#192c2a",
    cloth =
      team === "rival"
        ? "#b96341"
        : role === "hero"
          ? "#84c9a0"
          : role === "guardian"
            ? "#8096a1"
            : role === "mage"
              ? "#9290c1"
              : "#b8a866";
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(1.5 * facing, 1.5);
  ellipse(c, 0, 1, 9, 3, "#102e2677");
  rect(c, -5, -6 + step * 0.5, 4, 7, dark);
  rect(c, 2, -6 - step * 0.5, 4, 7, dark);
  rect(c, -6, step * 0.5, 5, 2, "#a58c60");
  rect(c, 2, -step * 0.5, 5, 2, "#a58c60");
  rect(c, -7, -17 + bob, 14, 13, dark);
  rect(c, -5, -18 + bob, 10, 12, cloth);
  rect(c, -5, -7 + bob, 10, 2, "#7d633b");
  rect(c, -1, -7 + bob, 2, 2, "#e4c572");
  rect(c, -4, -27 + bob, 9, 10, dark);
  rect(c, -3, -25 + bob, 7, 7, skin);
  rect(c, 2, -22 + bob, 2, 2, "#222f28");
  if (role === "mage") {
    poly(
      c,
      [
        [-8, -26 + bob],
        [0, -39 + bob],
        [7, -25 + bob],
      ],
      cloth,
    );
    rect(c, 9, -31, 2, 26, "#b18f56");
    rect(c, 7, -33, 6, 5, "#aef6dc");
  } else {
    rect(c, -5, -28 + bob, 10, 4, cloth);
    rect(c, -7, -25 + bob, 5, 8, cloth);
    rect(c, -2, -29 + bob, 6, 2, team === "rival" ? "#e59a57" : "#d1db9b");
  }
  rect(c, -9, -16 - step * 0.35 + bob, 4, 9, cloth);
  rect(c, -9, -8 - step * 0.35 + bob, 3, 3, skin);
  const swing = working ? Math.sin(t * 9) * 0.7 : walking ? step * 0.07 : 0;
  c.save();
  c.translate(8, -14 + bob);
  c.rotate(swing);
  rect(c, -1, 0, 4, 7, cloth);
  rect(c, 0, 6, 3, 3, skin);
  if (role === "guardian" || (role === "hero" && !working)) {
    rect(c, 4, -9, 2, 19, "#b8c4ad");
    rect(c, 3, -11, 4, 13, "#e8e5bd");
    rect(c, 1, 3, 7, 2, "#b09054");
  } else if (role !== "mage") {
    rect(c, 3, -8, 2, 19, "#a1854d");
    rect(c, 1, -9, 9, 5, "#b6c2af");
    rect(c, 7, -8, 5, 7, "#7e958c");
  }
  c.restore();
  if (role === "guardian") {
    rect(c, -12, -14, 7, 11, "#b4bc98");
    rect(c, -11, -13, 5, 8, "#477867");
  }
  c.restore();
}

export function WorldCanvas({
  view,
  onPoint,
  onSite,
  zoom,
  ambient = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null),
    live = useRef({ view, onPoint, onSite, zoom, ambient }),
    transform = useRef({ s: 1, x: 0, y: 0 });
  live.current = { view, onPoint, onSite, zoom, ambient };
  useEffect(() => {
    const canvas = ref.current!;
    const c = canvas.getContext("2d")!;
    const base = baseMap();
    let raf = 0,
      last = 0;
    const positions = new Map<
      string,
      { x: number; y: number; facing: number }
    >();
    let lastFeedback = 0;
    let cameraX = 600,
      cameraY = 380;
    const feedback = new Map<
      number,
      { at: number; siteId: string; amount: number; resource: string }
    >();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 25) return;
      last = now;
      const t = now / 1000;
      const { view: v, zoom: z, ambient: a } = live.current;
      const box = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
      if (
        canvas.width !== Math.floor(box.width * dpr) ||
        canvas.height !== Math.floor(box.height * dpr)
      ) {
        canvas.width = Math.floor(box.width * dpr);
        canvas.height = Math.floor(box.height * dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, box.width, box.height);
      c.imageSmoothingEnabled = false;
      const mobile = box.width < 700;
      const scale =
        (mobile
          ? Math.max(box.width / 850, box.height / 790)
          : Math.max(box.width / W, box.height / H)) * z;
      const center =
        mobile && !a
          ? {
              x: Math.max(300, Math.min(900, v.hero.x * 0.85 + 600 * 0.15)),
              y: Math.max(285, Math.min(475, v.hero.y * 0.6 + 380 * 0.4)),
            }
          : { x: 600, y: 380 };
      cameraX += (center.x - cameraX) * 0.18;
      cameraY += (center.y - cameraY) * 0.18;
      const ox = box.width / 2 - cameraX * scale,
        oy = box.height / 2 - cameraY * scale;
      transform.current = { s: scale, x: ox, y: oy };
      c.translate(ox, oy);
      c.scale(scale, scale);
      c.drawImage(base, 0, 0);
      // Water, smoke, fire, pollen, and rune pulse remain independent of simulation ticks.
      for (let i = 0; i < 24; i++) {
        const yy = (i * 35 + t * 7) % H,
          xx = 1000 + Math.sin(yy / 83) * 30;
        rect(c, xx, yy, 8 + (i % 3) * 4, 1, "#76b59b70");
      }
      for (let i = 0; i < 8; i++) {
        const y = 470 - ((t * 13 + i * 8) % 65),
          x = 272 + Math.sin(t + i) * 7;
        c.globalAlpha = (y - 405) / 100;
        rect(c, x, y, 7 + (i % 4), 5, "#bdc9b1");
      }
      c.globalAlpha = 1;
      ellipse(c, 304, 566, 15, 7, "#dc9a2b25");
      for (let i = 0; i < 5; i++) {
        rect(
          c,
          298 + i * 3,
          559 - ((t * 17 + i * 13) % 12),
          3,
          7,
          i % 2 ? "#f5c867" : "#d78338",
        );
      }
      const glow = c.createRadialGradient(600, 331, 3, 600, 341, 70);
      glow.addColorStop(0, `rgba(90,255,203,${0.1 + Math.sin(t * 2) * 0.04})`);
      glow.addColorStop(1, "rgba(50,200,170,0)");
      c.fillStyle = glow;
      c.fillRect(530, 265, 140, 140);
      for (const site of v.sites) {
        const selected = site.id === v.selected;
        const own = site.owner === "player" || site.owner === "you";
        const rival = site.owner === "rival";
        if (selected || own || rival) {
          c.strokeStyle = selected ? "#f2d391" : rival ? "#da8361" : "#a8e3ad";
          c.lineWidth = selected ? 2 : 1;
          c.setLineDash(selected ? [5, 5] : []);
          c.beginPath();
          c.ellipse(
            site.x,
            site.y + 12,
            51 + Math.sin(t * 2) * 2,
            22,
            0,
            0,
            Math.PI * 2,
          );
          c.stroke();
          c.setLineDash([]);
        }
        if (own || rival) {
          rect(c, site.x + 38, site.y - 38, 2, 49, "#cbb888");
          poly(
            c,
            [
              [site.x + 40, site.y - 37],
              [site.x + 60, site.y - 34 + Math.sin(t * 3) * 2],
              [site.x + 59, site.y - 21],
              [site.x + 40, site.y - 23],
            ],
            rival ? "#bc6044" : "#85b886",
          );
        }
      }
      const walk = !!v.hero.moving;
      const actors: MapActor[] = a
        ? Array.from({ length: 8 }, (_, i) => ({
            id: `ambient-${i}`,
            x: 300 + i * 83 + Math.sin(t * 0.3 + i) * 20,
            y: 440 + Math.sin(t * 0.35 + i) * 72,
            role: i % 3 === 0 ? "guardian" : "worker",
            team: i > 5 ? "rival" : "player",
          }))
        : v.actors;
      [
        ...actors,
        {
          id: "hero",
          ...v.hero,
          role: "hero",
          team: "player",
          working:
            !v.hero.moving &&
            !!v.hero.targetSiteId &&
            v.hero.targetSiteId !== "home",
        },
      ]
        .sort((u, b) => u.y - b.y)
        .forEach((actor) => {
          const prev = positions.get(actor.id) ?? {
            x: actor.x,
            y: actor.y,
            facing: 1,
          };
          const dx = actor.x - prev.x,
            dy = actor.y - prev.y;
          const facing = Math.abs(dx) > 0.3 ? (dx > 0 ? 1 : -1) : prev.facing;
          const p = { x: prev.x + dx * 0.48, y: prev.y + dy * 0.48, facing };
          positions.set(actor.id, p);
          const moving =
            actor.id === "hero"
              ? walk || Math.hypot(dx, dy) > 1
              : Math.hypot(dx, dy) > 0.5;
          const phase =
            actor.id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) *
            0.17;
          person(
            c,
            p.x,
            p.y,
            t + phase,
            a || moving,
            actor.role ?? "worker",
            actor.team ?? "player",
            !!actor.working && !moving,
            facing,
          );
          if (actor.id === "hero" && !a) {
            poly(
              c,
              [
                [p.x - 4, p.y - 55],
                [p.x + 4, p.y - 55],
                [p.x, p.y - 50],
              ],
              "#f1d28b",
            );
            if (moving && Math.floor(t * 10) % 3 === 0)
              rect(c, p.x - 5, p.y + 5, 3, 2, "#c6bf8866");
          }
          if ("remaining" in actor && typeof actor.remaining === "number") {
            rect(c, p.x - 13, p.y + 5, 26, 3, "#0c251d");
            rect(
              c,
              p.x - 13,
              p.y + 5,
              26 * Math.min(1, actor.remaining / 30),
              3,
              "#bad494",
            );
          }
        });
      for (const f of v.feedback ?? []) {
        if (f.id > lastFeedback) {
          feedback.set(f.id, { ...f, at: t });
          lastFeedback = f.id;
        }
      }
      for (const [id, f] of feedback) {
        const age = t - f.at;
        if (age > 1.7) {
          feedback.delete(id);
          continue;
        }
        const site = v.sites.find((s) => s.id === f.siteId);
        if (!site) continue;
        c.globalAlpha = Math.min(1, (1.7 - age) * 2);
        c.font = "bold 17px monospace";
        c.textAlign = "center";
        c.fillStyle = "#123324";
        c.fillText("+" + f.amount, site.x + 22, site.y - 40 - age * 26 + 2);
        c.fillStyle =
          f.resource === "wood"
            ? "#f2d88b"
            : f.resource === "stone"
              ? "#e5e9ce"
              : "#8ff5cc";
        c.fillText("+" + f.amount, site.x + 22, site.y - 40 - age * 26);
        for (let i = 0; i < 5; i++) {
          rect(
            c,
            site.x + Math.cos(i * 1.2) * age * 23,
            site.y - 25 + Math.sin(i * 1.2) * age * 17 - age * 16,
            2,
            2,
            f.resource === "essence" ? "#98ffcb" : "#e3d79c",
          );
        }
        c.globalAlpha = 1;
      }
      if (v.target && !a) {
        c.strokeStyle = "#e6ce9277";
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(v.target.x, v.target.y, 9, 4, 0, 0, Math.PI * 2);
        c.stroke();
      }
      for (let i = 0; i < 28; i++) {
        const x = hash(i + 131) * W + Math.sin(t * 0.3 + i) * 18,
          y = (hash(i + 190) * H - t * 3 + H * 10) % H;
        const alpha = Math.max(0, Math.sin(t * 1.2 + i)) * 0.7;
        rect(c, x, y, 2, 2, `rgba(227,220,144,${alpha})`);
      }
      if (!a) {
        c.textAlign = "center";
        c.font = '10px "Fragment Mono", monospace';
        for (const site of v.sites) {
          const selected = site.id === v.selected;
          const name = site.name.toUpperCase();
          const tw = c.measureText(name).width;
          c.fillStyle = selected ? "#172b25ee" : "#12271fb3";
          c.fillRect(site.x - tw / 2 - 8, site.y + 32, tw + 16, 21);
          c.fillStyle = selected ? "#f2d391" : "#d0d4b9";
          c.fillText(name, site.x, site.y + 46);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  function click(e: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = e.currentTarget.getBoundingClientRect(),
      tr = transform.current;
    const x = (e.clientX - bounds.left - tr.x) / tr.s,
      y = (e.clientY - bounds.top - tr.y) / tr.s;
    const site = live.current.view.sites.find(
      (s) => Math.hypot(s.x - x, s.y - y) < 65,
    );
    if (site) live.current.onSite(site.id);
    else
      live.current.onPoint(
        Math.max(50, Math.min(1140, x)),
        Math.max(90, Math.min(665, y)),
      );
  }
  return (
    <canvas
      ref={ref}
      className="world-canvas"
      onPointerDown={ambient ? undefined : click}
      aria-label="Wildwood expedition map. Use the site buttons to select a destination."
    />
  );
}
