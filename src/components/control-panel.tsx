import type { ReactNode } from "react";
import { Flower2, Leaf, RefreshCw, Spline, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PALETTE_LIST } from "@/lib/tree/palettes";
import type { OverlayMode } from "@/lib/tree/types";
import { cn } from "@/lib/utils";
import { useTreeStore } from "@/store/tree-store";

const OVERLAYS: { id: OverlayMode; label: string; icon: typeof Leaf }[] = [
  { id: "none", label: "Ramas", icon: Spline },
  { id: "leaves", label: "Hojas", icon: Leaf },
  { id: "flowers", label: "Flores", icon: Flower2 },
  { id: "both", label: "Ambas", icon: Trees },
];

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium tracking-wide text-muted">{label}</span>
        <span className="font-mono text-xs tabular-nums text-fg">{value}</span>
      </div>
      {children}
    </div>
  );
}

export function ControlFields() {
  const angle = useTreeStore((s) => s.angle);
  const depth = useTreeStore((s) => s.depth);
  const length = useTreeStore((s) => s.length);
  const wind = useTreeStore((s) => s.wind);
  const paletteId = useTreeStore((s) => s.paletteId);
  const overlay = useTreeStore((s) => s.overlay);
  const setAngle = useTreeStore((s) => s.setAngle);
  const setDepth = useTreeStore((s) => s.setDepth);
  const setLength = useTreeStore((s) => s.setLength);
  const setWind = useTreeStore((s) => s.setWind);
  const setPaletteId = useTreeStore((s) => s.setPaletteId);
  const setOverlay = useTreeStore((s) => s.setOverlay);

  return (
    <div className="flex flex-col gap-5">
      <Field label="Ángulo" value={`${Math.round(angle)}°`}>
        <Slider
          aria-label="Ángulo de ramificación"
          min={12}
          max={42}
          step={1}
          value={angle}
          onValueChange={setAngle}
        />
      </Field>
      <Field label="Profundidad" value={`${depth}`}>
        <Slider
          aria-label="Profundidad del árbol"
          min={5}
          max={11}
          step={1}
          value={depth}
          onValueChange={setDepth}
        />
      </Field>
      <Field label="Longitud" value={length.toFixed(2)}>
        <Slider
          aria-label="Longitud de las ramas"
          min={0.7}
          max={1.35}
          step={0.01}
          value={length}
          onValueChange={setLength}
        />
      </Field>
      <Field label="Viento" value={`${Math.round(wind * 100)}%`}>
        <Slider
          aria-label="Fuerza del viento"
          min={0}
          max={1}
          step={0.01}
          value={wind}
          onValueChange={setWind}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted">Paleta</span>
        <div className="grid grid-cols-5 gap-2">
          {PALETTE_LIST.map((p) => {
            const selected = p.id === paletteId;
            return (
              <button
                key={p.id}
                type="button"
                title={p.name}
                aria-label={p.name}
                aria-pressed={selected}
                onClick={() => setPaletteId(p.id)}
                className={cn(
                  "flex h-11 flex-col items-center justify-center gap-1 rounded-md px-1",
                  "transition-[box-shadow,opacity] duration-150 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-accent/50 outline-none",
                  selected ? "shadow-border-hover" : "shadow-border opacity-80 hover:opacity-100",
                )}
              >
                <span className="flex h-3.5 w-full overflow-hidden rounded-sm">
                  {p.swatch.map((c) => (
                    <span
                      key={c}
                      className="h-full flex-1"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="text-2xs leading-none text-muted">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted">Superposición</span>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1">
          {OVERLAYS.map(({ id, label, icon: Icon }) => {
            const selected = overlay === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setOverlay(id)}
                className={cn(
                  "flex h-10 flex-col items-center justify-center gap-0.5 rounded-md text-2xs leading-none",
                  "transition-[background-color,color] duration-150 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-accent/50 outline-none",
                  selected ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RegenerateButton({ className }: { className?: string }) {
  const regenerate = useTreeStore((s) => s.regenerate);
  return (
    <Button className={cn("w-full", className)} onClick={regenerate}>
      <RefreshCw />
      Regenerar
    </Button>
  );
}

export function SeedLabel() {
  const seed = useTreeStore((s) => s.seed);
  return (
    <p className="font-mono text-xs tabular-nums text-subtle">
      Semilla {seed.toString(16).toUpperCase().padStart(6, "0")}
    </p>
  );
}
