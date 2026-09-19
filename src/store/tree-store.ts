import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OverlayMode, PaletteId } from "@/lib/tree/types";

export type TreeState = {
  seed: number;
  angle: number;
  depth: number;
  length: number;
  wind: number;
  paletteId: PaletteId;
  overlay: OverlayMode;
  growNonce: number;
  regenerate: () => void;
  setAngle: (angle: number) => void;
  setDepth: (depth: number) => void;
  setLength: (length: number) => void;
  setWind: (wind: number) => void;
  setPaletteId: (paletteId: PaletteId) => void;
  setOverlay: (overlay: OverlayMode) => void;
};

const DEFAULT_SEED = 0x51a7e3;

export const useTreeStore = create<TreeState>()(
  persist(
    (set) => ({
      seed: DEFAULT_SEED,
      angle: 26,
      depth: 8,
      length: 1,
      wind: 0.42,
      paletteId: "bosque",
      overlay: "leaves",
      growNonce: 0,
      regenerate: () =>
        set({
          seed: (Math.random() * 0xffffffff) >>> 0,
          growNonce: Date.now(),
        }),
      setAngle: (angle) => set({ angle }),
      setDepth: (depth) => set({ depth }),
      setLength: (length) => set({ length }),
      setWind: (wind) => set({ wind }),
      setPaletteId: (paletteId) => set({ paletteId }),
      setOverlay: (overlay) => set({ overlay }),
    }),
    {
      name: "ramaje-v1",
      partialize: (s) => ({
        seed: s.seed,
        angle: s.angle,
        depth: s.depth,
        length: s.length,
        wind: s.wind,
        paletteId: s.paletteId,
        overlay: s.overlay,
      }),
    },
  ),
);
