"use client";

import { useState } from "react";

/** Jauge de carburant 0-100 % (100 % = plein), pour l'état des lieux convoyage. */
export function FuelGauge({ name, defaultValue }: { name: string; defaultValue: number }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-ink-soft">Niveau de carburant</span>
        <span className="text-sm font-semibold text-ink tnum">{value} %</span>
      </div>
      <input
        type="range"
        name={name}
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-[10px] text-ink-faint mt-1">
        <span>Réserve</span>
        <span>Plein</span>
      </div>
    </div>
  );
}
