export type OverlayMode = "none" | "leaves" | "flowers" | "both";

export type PaletteId = "bosque" | "otono" | "cerezo" | "niebla" | "luna";

export type TreeParams = {
  seed: number;
  angleDeg: number;
  depth: number;
  length: number;
};

export type Decoration = {
  along: number;
  side: number;
  size: number;
  kind: "leaf" | "flower";
  rot: number;
  colorShift: number;
  phase: number;
};

export type Branch = {
  length: number;
  relAngle: number;
  width: number;
  depth: number;
  startT: number;
  growDur: number;
  windPhase: number;
  curve: number;
  children: Branch[];
  decorations: Decoration[];
};

export type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type GrassBlade = {
  x: number;
  h: number;
  lean: number;
  phase: number;
  width: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  petal: boolean;
  phase: number;
};

export type TreeModel = {
  root: Branch;
  bounds: Bounds;
  trunkWidth: number;
  maxDepth: number;
  grass: GrassBlade[];
  particles: Particle[];
};

export type Rgb = { r: number; g: number; b: number };

export type Palette = {
  id: PaletteId;
  name: string;
  sky: [string, string, string];
  horizon: string;
  ground: string;
  groundTop: string;
  barkDark: string;
  barkLight: string;
  leaf: [string, string, string];
  flower: [string, string];
  flowerCenter: string;
  particle: string;
  moon: string;
  swatch: [string, string, string];
  moonKind: "moon" | "sun" | "none";
};
