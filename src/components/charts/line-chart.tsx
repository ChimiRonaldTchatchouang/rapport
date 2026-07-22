"use client";

import { useId, useState } from "react";

export type LinePoint = { label: string; value: number };

/**
 * Courbe lisse avec remplissage dégradé et tooltip au survol.
 * SVG pur (aucune dépendance), responsive via viewBox.
 */
export function LineChart({
  data,
  height = 220,
  color = "#4f46e5",
  suffix = "",
}: {
  data: LinePoint[];
  height?: number;
  color?: string;
  suffix?: string;
}) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const width = 640;
  const padX = 8;
  const padY = 20;

  if (data.length === 0) {
    return (
      <div className="muted flex h-40 items-center justify-center text-sm">
        Pas encore de données.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) =>
    padX + (i * (width - 2 * padX)) / Math.max(data.length - 1, 1);
  const y = (v: number) =>
    padY + (1 - (v - min) / span) * (height - 2 * padY);

  // Courbe lissée (Catmull-Rom -> Bézier)
  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  let path = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  const area = `${path} L ${pts[pts.length - 1][0]},${height} L ${pts[0][0]},${height} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" />

        {hover !== null && (
          <line
            x1={x(hover)}
            y1={padY}
            x2={x(hover)}
            y2={height - padY}
            stroke={color}
            strokeOpacity="0.3"
            strokeDasharray="4 4"
          />
        )}

        {data.map((d, i) => (
          <g key={i}>
            {/* zone de survol invisible */}
            <rect
              x={x(i) - (width / data.length) / 2}
              y={0}
              width={width / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {hover === i && (
              <circle cx={x(i)} cy={y(d.value)} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
            )}
          </g>
        ))}
      </svg>

      <div className="mt-2 flex justify-between px-1 text-xs muted">
        {data.map((d, i) => (
          <span key={i} className={hover === i ? "font-semibold text-brand-600" : ""}>
            {d.label}
          </span>
        ))}
      </div>

      {hover !== null && (
        <div className="mt-1 text-sm">
          <span className="muted">{data[hover].label} : </span>
          <span className="font-semibold">
            {data[hover].value}
            {suffix}
          </span>
        </div>
      )}
    </div>
  );
}
