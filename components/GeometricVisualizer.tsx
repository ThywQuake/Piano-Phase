import React, { useEffect, useRef, useState } from 'react';
import { MELODY, NOTE_COUNT } from '../constants';
import { PlayerColor } from '../types';

interface GeometricVisualizerProps {
  p1Progress: number;
  p2Progress: number;
}

export const GeometricVisualizer: React.FC<GeometricVisualizerProps> = ({ p1Progress, p2Progress }) => {
  const [history, setHistory] = useState<{x: number, y: number}[]>([]);
  const lastUpdateRef = useRef(0);

  // Track trajectory for the Phase Torus
  useEffect(() => {
    const now = Date.now();
    // Cap update rate to avoid performance issues while keeping it smooth
    if (now - lastUpdateRef.current > 40) {
      setHistory(prev => {
        const next = [...prev, { x: p1Progress, y: p2Progress }];
        return next.slice(-250); // Keep last 250 points
      });
      lastUpdateRef.current = now;
    }
  }, [p1Progress, p2Progress]);

  const renderMelodyClock = () => {
    const radius = 75;
    const centerX = 100;
    const centerY = 100;

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6">
          {"Melody Cycle ($S^1$)"}
        </h3>
        <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-sm">
          {/* Background Ring */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 2" />
          
          {/* Notes and Internal Structure */}
          {MELODY.map((note, i) => {
            const angle = (i / NOTE_COUNT) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Highlight the alternating structure (E-B-D vs F#-C#)
            const isGroupA = i % 2 === 0; 

            return (
              <g key={i}>
                {/* Connecting lines for structure visualization */}
                {i < NOTE_COUNT && (
                   <line 
                     x1={x} y1={y} 
                     x2={centerX + Math.cos(((i+2)%NOTE_COUNT / NOTE_COUNT) * Math.PI * 2 - Math.PI / 2) * radius}
                     y2={centerY + Math.sin(((i+2)%NOTE_COUNT / NOTE_COUNT) * Math.PI * 2 - Math.PI / 2) * radius}
                     stroke={isGroupA ? "rgba(37, 99, 235, 0.05)" : "rgba(220, 38, 38, 0.05)"}
                     strokeWidth="1"
                   />
                )}
                <circle cx={x} cy={y} r={isGroupA ? 4 : 3} fill={isGroupA ? "#94a3b8" : "#cbd5e1"} />
                <text 
                  x={centerX + Math.cos(angle) * (radius + 18)} 
                  y={centerY + Math.sin(angle) * (radius + 18)} 
                  fontSize="8" textAnchor="middle" alignmentBaseline="middle" fill="#64748b" className="font-mono font-bold"
                >
                  {note.pitch}
                </text>
              </g>
            );
          })}

          {/* Player 1 Hand (Steady) */}
          <line 
            x1={centerX} y1={centerY} 
            x2={centerX + Math.cos(p1Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            y2={centerY + Math.sin(p1Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            stroke={PlayerColor.P1} strokeWidth="2.5" strokeLinecap="round"
          />
          {/* Player 2 Hand (Phasing) */}
          <line 
            x1={centerX} y1={centerY} 
            x2={centerX + Math.cos(p2Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            y2={centerY + Math.sin(p2Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            stroke={PlayerColor.P2} strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  const renderPhaseTorus = () => {
    const size = 200;
    const gridCount = 12;
    const step = size / gridCount;

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6">
          {"Phase State Space ($\\mathbb{T}^2$)"}
        </h3>
        <div className="relative border border-stone-200 bg-white shadow-inner" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="overflow-visible">
            {/* Grid */}
            {[...Array(gridCount + 1)].map((_, i) => (
              <React.Fragment key={i}>
                <line x1={i * step} y1={0} x2={i * step} y2={size} stroke="#f1f5f9" strokeWidth="1" />
                <line x1={0} y1={i * step} x2={size} y2={i * step} stroke="#f1f5f9" strokeWidth="1" />
              </React.Fragment>
            ))}

            {/* Trajectory */}
            <polyline 
              fill="none" stroke={PlayerColor.Fusion} strokeWidth="1.5" strokeOpacity="0.3"
              points={history.map(p => `${p.x * size},${(1 - p.y) * size}`).join(' ')}
            />

            {/* Current State Point */}
            <circle 
              cx={p1Progress * size} 
              cy={(1 - p2Progress) * size} 
              r="5" fill={PlayerColor.Fusion} className="shadow-md"
            />
          </svg>
          
          {/* Boundary Labels */}
          <div className="absolute -left-7 top-1/2 -rotate-90 text-[7px] text-stone-300 font-bold uppercase tracking-widest">Glue to Right</div>
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[7px] text-stone-300 font-bold uppercase tracking-widest">Glue to Top</div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-10 bg-white/50 rounded-3xl border border-stone-200 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
      {renderMelodyClock()}
      {renderPhaseTorus()}
    </div>
  );
};