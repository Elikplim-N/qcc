"use client";

import { useState } from "react";

type Row = { type: "Sprinter" | "Urvan" | "Car"; leaderCount: number };

export function VehiclesInput({ initial }: { initial?: Row[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial?.length ? initial : [{ type: "Sprinter", leaderCount: 0 }],
  );

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2">
      <span className="label">Vehicles used</span>
      <input type="hidden" name="vehicles" value={JSON.stringify(rows)} />
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            className="input max-w-36"
            value={row.type}
            onChange={(e) => update(i, { type: e.target.value as Row["type"] })}
          >
            <option>Sprinter</option>
            <option>Urvan</option>
            <option>Car</option>
          </select>
          <input
            type="number"
            min={0}
            className="input max-w-28"
            placeholder="count"
            value={row.leaderCount || ""}
            onChange={(e) => update(i, { leaderCount: Number(e.target.value) || 0 })}
          />
          <span className="text-xs text-zinc-500">people</span>
          {rows.length > 1 ? (
            <button
              type="button"
              className="text-xs text-red-400 underline"
              onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
            >
              remove
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setRows((r) => [...r, { type: "Urvan", leaderCount: 0 }])}
      >
        + Add vehicle
      </button>
    </div>
  );
}
