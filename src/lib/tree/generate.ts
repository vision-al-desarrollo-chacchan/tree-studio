import { mulberry32 } from "./rng";
import type {
  Bounds,
  Branch,
  GrassBlade,
  Particle,
  TreeModel,
  TreeParams,
} from "./types";

const MAX_NODES = 2400;

function assignTiming(node: Branch, t: number) {
  node.startT = t;
  node.growDur = 0.18 + node.length * 0.0022;
  const childT = t + node.growDur * 0.58;
  for (const child of node.children) assignTiming(child, childT);
}

function measure(
  node: Branch,
  x: number,
  y: number,
  parentAngle: number,
  bounds: Bounds,
) {
  const angle = parentAngle + node.relAngle;
  const x2 = x + Math.cos(angle) * node.length;
  const y2 = y + Math.sin(angle) * node.length;
  bounds.minX = Math.min(bounds.minX, x, x2);
  bounds.maxX = Math.max(bounds.maxX, x, x2);
  bounds.minY = Math.min(bounds.minY, y, y2);
  bounds.maxY = Math.max(bounds.maxY, y, y2);
  for (const child of node.children) measure(child, x2, y2, angle, bounds);
}

export function generateTree(params: TreeParams): TreeModel {
  const rng = mulberry32(params.seed);
  const maxDepth = params.depth;
  const trunkLen = 100 * params.length;
  const trunkWidth = 13 * Math.sqrt(params.length);
  const spread0 = (params.angleDeg * Math.PI) / 180;
  let count = 0;

  function addLeaves(branch: Branch, n: number, alongMin: number, alongMax: number, size: number) {
    for (let i = 0; i < n; i++) {
      branch.decorations.push({
        along: alongMin + rng() * (alongMax - alongMin),
        side: rng() < 0.5 ? -1 : 1,
        size: size * (0.75 + rng() * 0.5),
        kind: "leaf",
        rot: (rng() - 0.5) * 1.15,
        colorShift: rng(),
        phase: rng() * Math.PI * 2,
      });
    }
  }

  function addFlower(branch: Branch) {
    branch.decorations.push({
      along: 0.88 + rng() * 0.12,
      side: rng() < 0.5 ? -1 : 1,
      size: 4.2 + rng() * 4.4,
      kind: "flower",
      rot: rng() * Math.PI,
      colorShift: rng(),
      phase: rng() * Math.PI * 2,
    });
  }

  function make(
    depth: number,
    length: number,
    width: number,
    relAngle: number,
  ): Branch {
    count += 1;
    const branch: Branch = {
      length,
      relAngle,
      width,
      depth,
      startT: 0,
      growDur: 0,
      windPhase: rng() * Math.PI * 2,
      curve: (rng() - 0.5) * length * 0.24,
      children: [],
      decorations: [],
    };

    const forcedTip = depth >= maxDepth || count >= MAX_NODES;
    const earlyStop = depth > 3 && rng() < 0.055;

    if (forcedTip || earlyStop) {
      addLeaves(branch, 2 + Math.floor(rng() * 4), 0.62, 1, 5.5 + rng() * 3);
      if (rng() < 0.9) addFlower(branch);
      if (rng() < 0.35) addFlower(branch);
      if (forcedTip) return branch;
    }

    let nChildren = 2;
    if (depth < 2 && rng() < 0.32) nChildren = 3;
    else if (depth > 2 && rng() < 0.13) nChildren = 1;
    if (count + nChildren > MAX_NODES) nChildren = Math.max(0, MAX_NODES - count);

    const spread = spread0 * (0.82 + rng() * 0.36);
    const shrink = 0.64 + rng() * 0.16;
    const thin = 0.64 + rng() * 0.08;

    if (nChildren === 1) {
      branch.children.push(
        make(
          depth + 1,
          length * shrink,
          Math.max(0.55, width * thin),
          (rng() - 0.5) * spread * 0.7,
        ),
      );
    } else if (nChildren === 2) {
      const asy = (rng() - 0.5) * 0.4;
      const leftBias = 0.86 + rng() * 0.28;
      const rightBias = 0.86 + rng() * 0.28;
      branch.children.push(
        make(
          depth + 1,
          length * shrink * (0.92 + rng() * 0.14),
          Math.max(0.55, width * thin),
          -spread * leftBias + asy,
        ),
      );
      branch.children.push(
        make(
          depth + 1,
          length * shrink * (0.92 + rng() * 0.14),
          Math.max(0.55, width * thin),
          spread * rightBias + asy,
        ),
      );
    } else if (nChildren === 3) {
      branch.children.push(
        make(
          depth + 1,
          length * shrink * 0.92,
          Math.max(0.55, width * thin * 0.95),
          -spread * 1.08,
        ),
      );
      branch.children.push(
        make(
          depth + 1,
          length * (shrink + 0.06),
          Math.max(0.55, width * (thin + 0.04)),
          (rng() - 0.5) * spread * 0.22,
        ),
      );
      branch.children.push(
        make(
          depth + 1,
          length * shrink * 0.92,
          Math.max(0.55, width * thin * 0.95),
          spread * 1.08,
        ),
      );
    }

    if (depth >= maxDepth - 3) {
      addLeaves(branch, 1 + Math.floor(rng() * 2), 0.3, 0.85, 4.2 + rng() * 2.4);
    }

    return branch;
  }

  const lean = (rng() - 0.5) * 0.12;
  const root = make(0, trunkLen, trunkWidth, -Math.PI / 2 + lean);
  assignTiming(root, 0);

  const bounds: Bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  measure(root, 0, 0, 0, bounds);

  const padX = (bounds.maxX - bounds.minX) * 0.08;
  bounds.minX -= padX;
  bounds.maxX += padX;
  bounds.minY -= (bounds.maxY - bounds.minY) * 0.06;

  const grass: GrassBlade[] = [];
  for (let i = 0; i < 56; i++) {
    grass.push({
      x: (rng() - 0.5) * 220,
      h: 7 + rng() * 16,
      lean: (rng() - 0.5) * 0.4,
      phase: rng() * Math.PI * 2,
      width: 0.7 + rng() * 0.9,
    });
  }

  const treeW = bounds.maxX - bounds.minX;
  const treeH = bounds.maxY - bounds.minY;
  const particles: Particle[] = [];
  for (let i = 0; i < 64; i++) {
    particles.push({
      x: bounds.minX + rng() * treeW,
      y: bounds.minY + rng() * treeH * 0.7,
      vx: (rng() - 0.5) * 8,
      vy: -4 - rng() * 10,
      r: 0.7 + rng() * 1.6,
      life: rng() * 8,
      maxLife: 5 + rng() * 7,
      petal: rng() < 0.35,
      phase: rng() * Math.PI * 2,
    });
  }

  return { root, bounds, trunkWidth, maxDepth, grass, particles };
}

export function maxGrowTime(node: Branch): number {
  let max = node.startT + node.growDur;
  for (const child of node.children) max = Math.max(max, maxGrowTime(child));
  return max;
}
