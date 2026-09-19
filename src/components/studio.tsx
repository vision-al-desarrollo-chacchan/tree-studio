import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { TreeCanvas } from "@/components/tree-canvas";
import {
  ControlFields,
  RegenerateButton,
  SeedLabel,
} from "@/components/control-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTreeStore } from "@/store/tree-store";

export function Studio() {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        useTreeStore.getState().regenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden bg-bg text-fg">
      <TreeCanvas originX={wide ? 0.56 : 0.5} />
      <div className="grain pointer-events-none absolute inset-0" />

      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4",
          "px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-6",
        )}
      >
        <div className="pointer-events-auto">
          <p className="font-display text-2xl leading-tight tracking-display text-fg text-balance">
            Ramaje
          </p>
          <p className="mt-1 text-sm text-muted">Un árbol fractal vivo</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2 md:hidden">
          <RegenerateButton className="w-auto px-4" />
          <Button
            variant="quiet"
            size="icon"
            aria-label={open ? "Cerrar controles" : "Abrir controles"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <SlidersHorizontal />}
          </Button>
        </div>
      </header>

      <aside
        className={cn(
          "absolute z-20 flex max-h-[min(100dvh-5.5rem,36rem)] w-[min(20.5rem,calc(100vw-2rem))] flex-col",
          "rounded-xl bg-surface p-5 shadow-border",
          "transition-[opacity,transform] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]",
          "max-md:inset-x-4 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))]",
          "md:top-6 md:bottom-6 md:left-6 md:max-h-[calc(100dvh-3rem)] md:w-80",
          open
            ? "max-md:translate-y-0 max-md:opacity-100"
            : "max-md:pointer-events-none max-md:translate-y-3 max-md:opacity-0",
          "md:translate-y-0 md:opacity-100",
        )}
      >
        <div className="mb-5 hidden md:block">
          <RegenerateButton />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ControlFields />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <SeedLabel />
          <p className="hidden text-xs text-subtle md:block">R regenera</p>
        </div>
      </aside>
    </div>
  );
}
