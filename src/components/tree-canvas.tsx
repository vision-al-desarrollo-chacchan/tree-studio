import { useEffect, useRef } from "react";
import { TreeEngine } from "@/lib/tree/engine";
import { useTreeStore } from "@/store/tree-store";

export function TreeCanvas({ originX }: { originX: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TreeEngine | null>(null);
  const originRef = useRef(originX);
  originRef.current = originX;

  const seed = useTreeStore((s) => s.seed);
  const angle = useTreeStore((s) => s.angle);
  const depth = useTreeStore((s) => s.depth);
  const length = useTreeStore((s) => s.length);
  const wind = useTreeStore((s) => s.wind);
  const paletteId = useTreeStore((s) => s.paletteId);
  const overlay = useTreeStore((s) => s.overlay);
  const growNonce = useTreeStore((s) => s.growNonce);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new TreeEngine(canvas);
    engineRef.current = engine;
    engine.resize();
    engine.apply({
      seed,
      angle,
      depth,
      length,
      wind,
      paletteId,
      overlay,
      growNonce,
      originX: originRef.current,
    });

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      engine.tick(dt);
      engine.draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      engineRef.current = null;
    };
    // Mount-only: live params stream in via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.apply({
      seed,
      angle,
      depth,
      length,
      wind,
      paletteId,
      overlay,
      growNonce,
      originX,
    });
  }, [seed, angle, depth, length, wind, paletteId, overlay, growNonce, originX]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full touch-none"
      aria-hidden="true"
    />
  );
}
