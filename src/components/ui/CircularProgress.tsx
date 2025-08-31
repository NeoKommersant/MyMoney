"use client";
import React from "react";

type Props = {
  size?: number;
  stroke?: number;
  value: number; // 0..1
  label?: string;
  mintToRose?: boolean; // градиентная дуга
};

export default function CircularProgress({ size = 112, stroke = 10, value, label, mintToRose }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = c * (1 - clamped);

  const id = React.useId();

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--mint)" />
          <stop offset="100%" stopColor="var(--rose)" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(148, 163, 184, .25)" strokeWidth={stroke} />
      <circle
        cx={size/2}
        cy={size/2}
        r={r}
        fill="none"
        stroke={mintToRose ? `url(#grad-${id})` : "var(--mint)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
      {label ? (
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size*0.18} fill="var(--text)" style={{fontWeight:600}}>
          {label}
        </text>
      ) : null}
    </svg>
  );
}

