import { parseHex, mixRgb, rgba } from "./color";
import { generateTree, maxGrowTime } from "./generate";
import { PALETTES } from "./palettes";
import type {
  Branch,
  Atmosphere,
  OverlayMode,
  Palette,
  PaletteId,
  Rgb,
  Season,
  TreeModel,
  TreeParams,
} from "./types";

const TAU = Math.PI * 2;

function easeOutCubic(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - (1 - x) ** 3;
}

function easeOutBack(t: number) {
  const x = Math.max(0, Math.min(1, t));
  const c = 1.2;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

type PreparedPalette = {
  raw: Palette;
  sky: [Rgb, Rgb, Rgb];
  horizon: Rgb;
  ground: Rgb;
  groundTop: Rgb;
  barkDark: Rgb;
  barkLight: Rgb;
  leaf: [Rgb, Rgb, Rgb];
  flower: [Rgb, Rgb];
  flowerCenter: Rgb;
  particle: Rgb;
  moon: Rgb;
};

function preparePalette(p: Palette): PreparedPalette {
  return {
    raw: p,
    sky: [parseHex(p.sky[0]), parseHex(p.sky[1]), parseHex(p.sky[2])],
    horizon: parseHex(p.horizon),
    ground: parseHex(p.ground),
    groundTop: parseHex(p.groundTop),
    barkDark: parseHex(p.barkDark),
    barkLight: parseHex(p.barkLight),
    leaf: [parseHex(p.leaf[0]), parseHex(p.leaf[1]), parseHex(p.leaf[2])],
    flower: [parseHex(p.flower[0]), parseHex(p.flower[1])],
    flowerCenter: parseHex(p.flowerCenter),
    particle: parseHex(p.particle),
    moon: parseHex(p.moon),
  };
}

export type EngineView = {
  seed: number;
  angle: number;
  depth: number;
  length: number;
  wind: number;
  paletteId: PaletteId;
  overlay: OverlayMode;
  season: Season;
  atmosphere: Atmosphere;
  growNonce: number;
  originX: number;
};

export class TreeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private model: TreeModel;
  private palette: PreparedPalette;
  private params: TreeParams;
  private overlay: OverlayMode = "leaves";
  private season: Season = "summer";
  private atmosphere: Atmosphere = "clear";
  private wind = 0.42;
  private originX = 0.54;
  private growthTime = 0;
  private growCap = 4;
  private time = 0;
  private leafMix = 1;
  private flowerMix = 0;
  private reduceMotion = false;
  private growNonce = -1;
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.params = { seed: 0x51a7e3, angleDeg: 26, depth: 8, length: 1 };
    this.model = generateTree(this.params);
    this.palette = preparePalette(PALETTES.bosque);
    this.growCap = maxGrowTime(this.model.root) + 0.9;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (this.reduceMotion) this.growthTime = this.growCap;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.cssW * this.dpr);
    const h = Math.floor(this.cssH * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  apply(view: EngineView) {
    const next: TreeParams = {
      seed: view.seed,
      angleDeg: view.angle,
      depth: view.depth,
      length: view.length,
    };
    const structureChanged =
      next.seed !== this.params.seed ||
      next.angleDeg !== this.params.angleDeg ||
      next.depth !== this.params.depth ||
      next.length !== this.params.length;

    this.wind = view.wind;
    this.originX = view.originX;
    this.overlay = view.overlay;
    this.season = view.season;
    this.atmosphere = view.atmosphere;
    if (view.paletteId !== this.palette.raw.id) {
      this.palette = preparePalette(PALETTES[view.paletteId]);
    }

    if (structureChanged) {
      this.params = next;
      this.model = generateTree(next);
      this.growCap = maxGrowTime(this.model.root) + 0.9;
    }

    if (view.growNonce !== this.growNonce) {
      this.growNonce = view.growNonce;
      this.growthTime = this.reduceMotion ? this.growCap : 0;
      this.time = 0;
    }
  }

  tick(dt: number) {
    this.time += dt;
    if (this.growthTime < this.growCap) {
      this.growthTime = Math.min(this.growCap, this.growthTime + dt);
    }

    const wantLeaf = this.overlay === "leaves" || this.overlay === "both" ? 1 : 0;
    const wantFlower = this.overlay === "flowers" || this.overlay === "both" ? 1 : 0;
    const k = 1 - Math.exp(-dt * 5);
    this.leafMix += (wantLeaf - this.leafMix) * k;
    this.flowerMix += (wantFlower - this.flowerMix) * k;

    this.stepParticles(dt);
  }

  draw() {
    const { cssW: w, cssH: h } = this;
    this.drawSky(w, h);
    if (this.atmosphere === "stars") this.drawStars(w, h);
    this.drawMoon(w, h);
    this.drawGround(w, h);
    this.drawTree(w, h);
    this.drawParticles(w, h);
    this.drawWeather(w, h);
  }

  private drawStars(w: number, h: number) {
    const { ctx } = this;
    ctx.save();
    for (let i = 0; i < 90; i++) {
      const x = ((i * 83.17 + 19) % 1000) / 1000 * w;
      const y = ((i * 47.73 + 11) % 1000) / 1000 * h * 0.72;
      const pulse = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(this.time * (0.7 + (i % 7) * 0.09) + i));
      const r = i % 13 === 0 ? 1.7 : 0.65 + (i % 4) * 0.18;
      ctx.fillStyle = `rgba(235,242,255,${pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawWeather(w: number, h: number) {
    const { ctx } = this;
    const calm = this.reduceMotion;
    ctx.save();

    if (this.atmosphere === "rain") {
      ctx.strokeStyle = "rgba(185,220,242,0.48)";
      ctx.lineWidth = 1.15;
      for (let i = 0; i < 120; i++) {
        const speed = 460 + (i % 9) * 22;
        const y = calm ? ((i * 61) % h) : (i * 71 + this.time * speed) % (h + 40) - 20;
        const x = (i * 97 + y * 0.17) % (w + 30) - 15;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y + 17);
        ctx.stroke();
      }
    }

    const falling = this.season === "winter" || this.season === "autumn" || this.season === "spring";
    if (falling) {
      const count = this.season === "winter" ? 88 : 58;
      for (let i = 0; i < count; i++) {
        const speed = this.season === "winter" ? 28 + (i % 7) * 5 : 45 + (i % 8) * 7;
        const y = calm ? ((i * 79) % h) : (i * 67 + this.time * speed) % (h + 30) - 15;
        const drift = Math.sin(this.time * 0.8 + i * 1.7) * (10 + (i % 6) * 2);
        const x = ((i * 109.3) % (w + 40)) - 20 + drift;
        const size = 2 + (i % 5) * 0.55;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.time * 0.55 + i);
        if (this.season === "winter") {
          ctx.fillStyle = `rgba(245,250,255,${0.45 + (i % 4) * 0.12})`;
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillStyle =
            this.season === "spring"
              ? i % 3 === 0 ? "rgba(255,220,235,0.82)" : "rgba(244,175,204,0.78)"
              : i % 3 === 0 ? "rgba(222,155,54,0.82)" : i % 2 ? "rgba(177,73,35,0.82)" : "rgba(238,190,74,0.78)";
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 1.6, size * 0.72, 0, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private stepParticles(dt: number) {
    const { bounds, particles } = this.model;
    const treeW = bounds.maxX - bounds.minX;
    const treeH = bounds.maxY - bounds.minY;
    const wind = this.reduceMotion ? 0 : this.wind;
    const gust = Math.sin(this.time * 0.27) * wind;

    for (const p of particles) {
      p.x += (p.vx + gust * 22 + Math.sin(this.time * 0.8 + p.phase) * 4) * dt;
      p.y += (p.vy + Math.cos(this.time * 0.6 + p.phase) * 3) * dt;
      p.life += dt;
      if (
        p.life > p.maxLife ||
        p.x < bounds.minX - 20 ||
        p.x > bounds.maxX + 20 ||
        p.y < bounds.minY - 40
      ) {
        p.x = bounds.minX + Math.random() * treeW;
        p.y = bounds.minY + Math.random() * treeH * 0.55 + treeH * 0.1;
        p.life = 0;
        p.maxLife = 5 + Math.random() * 7;
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = -4 - Math.random() * 10;
      }
    }
  }

  private layout(w: number, h: number) {
    const { bounds } = this.model;
    const treeW = Math.max(1, bounds.maxX - bounds.minX);
    const treeH = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min((w * 0.8) / treeW, (h * 0.7) / treeH);
    const ox = w * this.originX;
    const oy = h * 0.86;
    return { scale, ox, oy };
  }

  private drawSky(w: number, h: number) {
    const { ctx, palette: p } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(p.sky[0]));
    g.addColorStop(0.55, rgba(p.sky[1]));
    g.addColorStop(0.82, rgba(p.sky[2]));
    g.addColorStop(1, rgba(p.horizon));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const haze = ctx.createRadialGradient(w * 0.5, h * 0.78, 20, w * 0.5, h * 0.86, w * 0.7);
    haze.addColorStop(0, rgba(p.horizon, 0.35));
    haze.addColorStop(1, rgba(p.horizon, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
  }

  private drawMoon(w: number, h: number) {
    const kind = this.palette.raw.moonKind;
    if (kind === "none") return;
    const { ctx } = this;
    const x = w * 0.78;
    const y = h * (kind === "sun" ? 0.16 : 0.14);
    const r = kind === "sun" ? Math.min(w, h) * 0.055 : Math.min(w, h) * 0.042;

    ctx.save();
    ctx.fillStyle = rgba(this.palette.moon, kind === "sun" ? 0.16 : 0.1);
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(this.palette.moon, kind === "sun" ? 0.55 : 0.85);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    if (kind === "moon") {
      ctx.fillStyle = rgba(this.palette.sky[1], 0.55);
      ctx.beginPath();
      ctx.arc(x + r * 0.32, y - r * 0.18, r * 0.72, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGround(w: number, h: number) {
    const { ctx, palette: p } = this;
    const { ox, scale } = this.layout(w, h);
    const gy = h * 0.86;

    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, gy + 18);
    ctx.quadraticCurveTo(ox * 0.5, gy - 16, ox, gy);
    ctx.quadraticCurveTo((ox + w) * 0.5, gy + 22, w, gy + 10);
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, gy - 24, 0, h);
    g.addColorStop(0, rgba(p.groundTop));
    g.addColorStop(1, rgba(p.ground));
    ctx.fillStyle = g;
    ctx.fill();

    const shadow = ctx.createRadialGradient(ox, gy, 4, ox, gy, 90 * scale);
    shadow.addColorStop(0, "rgba(0,0,0,0.35)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(ox, gy + 6, 78 * scale, 12, 0, 0, TAU);
    ctx.fill();

    this.drawGrass(ox, gy, scale);
  }

  private drawGrass(ox: number, oy: number, scale: number) {
    const { ctx } = this;
    const wind = this.reduceMotion ? 0 : this.wind;
    const gust = Math.sin(this.time * 0.9) * 0.18 * wind;
    ctx.strokeStyle = rgba(this.palette.groundTop, 0.9);
    ctx.lineCap = "round";
    for (const blade of this.model.grass) {
      const sway = Math.sin(this.time * 1.4 + blade.phase) * 0.25 * wind + gust;
      ctx.lineWidth = blade.width;
      ctx.beginPath();
      ctx.moveTo(ox + blade.x * scale * 0.55, oy);
      ctx.quadraticCurveTo(
        ox + blade.x * scale * 0.55 + (blade.lean + sway) * blade.h * 0.4,
        oy - blade.h * 0.55,
        ox + blade.x * scale * 0.55 + (blade.lean + sway) * blade.h,
        oy - blade.h,
      );
      ctx.stroke();
    }
  }

  private drawTree(w: number, h: number) {
    const { scale, ox, oy } = this.layout(w, h);
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    const windAmp = this.reduceMotion ? 0 : this.wind;
    this.drawBranch(this.model.root, 0, 0, 0, windAmp, "wood");
    if (this.leafMix > 0.01) this.drawBranch(this.model.root, 0, 0, 0, windAmp, "leaf");
    if (this.flowerMix > 0.01) this.drawBranch(this.model.root, 0, 0, 0, windAmp, "flower");
    ctx.restore();
  }

  private branchGrowth(node: Branch) {
    if (this.reduceMotion) return 1;
    return easeOutCubic((this.growthTime - node.startT) / node.growDur);
  }

  private drawBranch(
    node: Branch,
    x: number,
    y: number,
    parentAngle: number,
    windAmp: number,
    pass: "wood" | "leaf" | "flower",
  ) {
    const g = this.branchGrowth(node);
    if (g <= 0) return;

    const heightFactor = 1 - node.width / this.model.trunkWidth;
    const sway =
      Math.sin(this.time * (0.65 + node.windPhase * 0.25) + node.windPhase * 5.1) *
        windAmp *
        0.16 *
        (0.25 + heightFactor) +
      Math.sin(this.time * 0.23) * Math.sin(this.time * 0.11) * windAmp * 0.07;

    const angle = parentAngle + node.relAngle + sway;
    const len = node.length * g;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const curve = (node.curve + Math.sin(this.time * 0.7 + node.windPhase) * windAmp * 4) * g;
    const cx = (x + x2) / 2 + nx * curve;
    const cy = (y + y2) / 2 + ny * curve;

    if (pass === "wood") {
      const t = node.depth / Math.max(1, this.model.maxDepth);
      const bark = mixRgb(this.palette.barkDark, this.palette.barkLight, t);
      const w1 = node.width;
      const w2 = Math.max(0.45, node.width * 0.62);
      const ctx = this.ctx;
      ctx.fillStyle = rgba(bark);
      ctx.beginPath();
      ctx.moveTo(x + nx * (w1 / 2), y + ny * (w1 / 2));
      ctx.quadraticCurveTo(
        cx + nx * (w2 / 2),
        cy + ny * (w2 / 2),
        x2 + nx * (w2 / 2),
        y2 + ny * (w2 / 2),
      );
      ctx.lineTo(x2 - nx * (w2 / 2), y2 - ny * (w2 / 2));
      ctx.quadraticCurveTo(
        cx - nx * (w2 / 2),
        cy - ny * (w2 / 2),
        x - nx * (w1 / 2),
        y - ny * (w1 / 2),
      );
      ctx.closePath();
      ctx.fill();
    }

    for (const child of node.children) {
      this.drawBranch(child, x2, y2, angle, windAmp, pass);
    }

    if (pass === "wood" || g < 0.82) return;

    const bloom = easeOutBack((g - 0.82) / 0.18);
    for (const d of node.decorations) {
      if (pass === "leaf" && d.kind !== "leaf") continue;
      if (pass === "flower" && d.kind !== "flower") continue;
      const mix = d.kind === "leaf" ? this.leafMix : this.flowerMix;
      if (mix < 0.02) continue;

      const along = d.along * g;
      const px =
        (1 - along) * (1 - along) * x + 2 * (1 - along) * along * cx + along * along * x2;
      const py =
        (1 - along) * (1 - along) * y + 2 * (1 - along) * along * cy + along * along * y2;
      const breath = 1 + Math.sin(this.time * 1.3 + d.phase) * 0.05 * windAmp;
      const size = d.size * bloom * mix * breath;
      const rot = angle + d.rot + d.side * 0.45 + Math.sin(this.time * 1.1 + d.phase) * 0.12 * windAmp;

      if (d.kind === "leaf") this.drawLeaf(px, py, rot, size, d.colorShift, mix * bloom);
      else this.drawFlower(px, py, rot, size, d.colorShift, mix * bloom);
    }
  }

  private drawLeaf(
    x: number,
    y: number,
    angle: number,
    size: number,
    shift: number,
    alpha: number,
  ) {
    const ctx = this.ctx;
    const c =
      shift < 0.45
        ? mixRgb(this.palette.leaf[0], this.palette.leaf[1], shift / 0.45)
        : mixRgb(this.palette.leaf[1], this.palette.leaf[2], (shift - 0.45) / 0.55);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = rgba(c, 0.82 * alpha);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.38, -size * 0.34, size, 0);
    ctx.quadraticCurveTo(size * 0.38, size * 0.34, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  private drawFlower(
    x: number,
    y: number,
    angle: number,
    size: number,
    shift: number,
    alpha: number,
  ) {
    const ctx = this.ctx;
    const petal = mixRgb(this.palette.flower[0], this.palette.flower[1], shift);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = rgba(petal, 0.9 * alpha);
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * TAU);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.22, -size * 0.22, size * 0.58, 0);
      ctx.quadraticCurveTo(size * 0.22, size * 0.22, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = rgba(this.palette.flowerCenter, 0.95 * alpha);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.14, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawParticles(w: number, h: number) {
    if (this.growthTime < 0.6) return;
    const { scale, ox, oy } = this.layout(w, h);
    const ctx = this.ctx;
    const appear = easeOutCubic(Math.min(1, (this.growthTime - 0.6) / 1.4));
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    for (const p of this.model.particles) {
      const life = p.life / p.maxLife;
      const a = appear * (life < 0.15 ? life / 0.15 : life > 0.8 ? (1 - life) / 0.2 : 1);
      ctx.fillStyle = rgba(this.palette.particle, a * (p.petal ? 0.7 : 0.45));
      ctx.beginPath();
      if (p.petal) {
        ctx.ellipse(p.x, p.y, p.r * 1.4, p.r * 0.6, this.time + p.phase, 0, TAU);
      } else {
        ctx.arc(p.x, p.y, p.r, 0, TAU);
      }
      ctx.fill();
    }
    ctx.restore();
  }
}
