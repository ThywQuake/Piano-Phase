import React, { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { MELODY, NOTE_COUNT } from '../constants';
import { PlayerColor } from '../types';

interface GeometricVisualizerProps {
  p1Progress: number;
  p2Progress: number;
  bpm: number;             // Added prop
  phaseCycles: number;     // Added prop
  resetTrigger: number;    // Added prop
  isVisible: boolean;      // New prop to control visibility
}

export const GeometricVisualizer: React.FC<GeometricVisualizerProps> = ({ 
  p1Progress, 
  p2Progress,
  bpm,
  phaseCycles,
  resetTrigger,
  isVisible
}) => {
  const [history, setHistory] = useState<{x: number, y: number}[]>([]);
  const [showInfo, setShowInfo] = useState(false);
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

  // ADDED: Effect to clear history when reset or settings change
  useEffect(() => {
    setHistory([]);
  }, [bpm, phaseCycles, resetTrigger]);

  // New: Effect to trigger MathJax typesetting when component becomes visible
  useEffect(() => {
    if (isVisible && window.MathJax) {
      // Delay to ensure modal is rendered and visible
      setTimeout(() => {
        window.MathJax.typesetPromise && window.MathJax.typesetPromise();
      }, 50);
    }
  }, [isVisible]);

  // Ensure MathJax renders when info modal opens
  useEffect(() => {
    if (showInfo && window.MathJax) {
      setTimeout(() => {
        window.MathJax.typesetPromise && window.MathJax.typesetPromise();
      }, 50);
    }
  }, [showInfo]);

  const renderMelodyClock = () => {
    // Increased size
    const radius = 120;
    const size = 340;
    const centerX = size / 2;
    const centerY = size / 2 - 10;

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6">
          {"Melody Cycle ($S^1$)"}
        </h3>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
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
                  x={centerX + Math.cos(angle) * (radius + 24)} 
                  y={centerY + Math.sin(angle) * (radius + 24)} 
                  fontSize="10" textAnchor="middle" alignmentBaseline="middle" fill="#64748b" className="font-mono font-bold"
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
            stroke={PlayerColor.P1} strokeWidth="3" strokeLinecap="round"
          />
          {/* Player 2 Hand (Phasing) */}
          <line 
            x1={centerX} y1={centerY} 
            x2={centerX + Math.cos(p2Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            y2={centerY + Math.sin(p2Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            stroke={PlayerColor.P2} strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  const renderPhaseTorus = () => {
    // Increased size
    const size = 300;
    const gridCount = 12;
    const step = size / gridCount;

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6">
          {"Phase State Space ($\\mathbb{T}^2$)"}
        </h3>
        
        {/* Container with margins to accommodate outer labels */}
        <div className="relative mt-2 ml-6 mb-8">
            {/* Y Axis Title */}
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-stone-500 whitespace-nowrap">
                Player 2
            </div>

            {/* Y Axis Ticks (0 at bottom, 360 at top) */}
            <div className="absolute -left-1 top-0 text-[10px] text-stone-400 font-mono -translate-x-full -translate-y-1/2">360°</div>
            <div className="absolute -left-1 top-1/2 text-[10px] text-stone-400 font-mono -translate-x-full -translate-y-1/2">180°</div>
            <div className="absolute -left-1 bottom-0 text-[10px] text-stone-400 font-mono -translate-x-full translate-y-1/2">0°</div>

            {/* Main Graph Box */}
            <div className="relative border border-stone-200 bg-white shadow-inner" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="overflow-visible">
                {/* Grid */}
                {[...Array(gridCount + 1)].map((_, i) => (
                <React.Fragment key={i}>
                    <line x1={i * step} y1={0} x2={i * step} y2={size} stroke="#f1f5f9" strokeWidth="1" />
                    <line x1={0} y1={i * step} x2={size} y2={i * step} stroke="#f1f5f9" strokeWidth="1" />
                </React.Fragment>
                ))}

                {/* Trajectory - Changed color to Black */}
                <polyline 
                fill="none" stroke="black" strokeWidth="2" strokeOpacity="0.6"
                points={history.map(p => `${p.x * size},${(1 - p.y) * size}`).join(' ')}
                />

                {/* Current State Point */}
                <circle 
                cx={p1Progress * size} 
                cy={(1 - p2Progress) * size} 
                r="6" fill={PlayerColor.Fusion} className="shadow-md"
                />
            </svg>
            
            {/* Boundary Labels (kept inside relative to box) */}
            <div className="absolute -right-5 top-1/2 -rotate-90 text-[8px] text-stone-300 font-bold uppercase tracking-widest pointer-events-none opacity-50">Glue</div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-stone-300 font-bold uppercase tracking-widest pointer-events-none opacity-50">Glue</div>
            </div>

            {/* X Axis Ticks */}
            <div className="absolute left-0 -bottom-5 text-[10px] text-stone-400 font-mono -translate-x-1/2">0°</div>
            <div className="absolute left-1/2 -bottom-5 text-[10px] text-stone-400 font-mono -translate-x-1/2">180°</div>
            <div className="absolute right-0 -bottom-5 text-[10px] text-stone-400 font-mono translate-x-1/2">360°</div>

            {/* X Axis Title */}
            <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 text-xs font-bold text-stone-500">
                Player 1
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative p-10 bg-white/50 rounded-3xl border border-stone-200 backdrop-blur-sm">
      
      {/* Legend (Left Bottom) */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-stone-100 shadow-sm z-10">
         <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-[#2563eb] rounded-full"></div> {/* PlayerColor.P1 */}
            <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Player 1 (Steady)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-[#dc2626]"></div> {/* PlayerColor.P2 */}
            <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Player 2 (Phasing)</span>
         </div>
      </div>

      {/* Info Button */}
      <button 
        onClick={() => setShowInfo(true)}
        className="absolute top-6 right-6 p-2 text-stone-400 hover:text-blue-500 transition-colors bg-white rounded-full shadow-sm border border-stone-100"
      >
        <Info size={20} />
      </button>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-stone-200/50 max-w-lg w-full p-8 relative">
                <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 bg-stone-100 rounded-full p-1">
                    <X size={18}/>
                </button>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Info size={20} className="text-blue-500"/>
                    Geometric Interpretation
                </h2>
                <div className="prose prose-stone text-sm text-stone-600 leading-relaxed">
                     <ul className="list-disc pl-5 mb-4">
                        <li>The left diagram visualizes the 12-note sequence as a 1D sphere ({"$S^1$"}).</li>
                        <li>The right diagram maps the system's state space onto a 2D torus ({"$\\mathbb{T}^2$"}).</li>
                        <li>As the two voices drift in phase, the trajectory deviates from the diagonal, forming closed loops in the state space.</li>
                     </ul>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center justify-items-center">
        {renderMelodyClock()}
        {renderPhaseTorus()}
      </div>
    </div>
  );
};