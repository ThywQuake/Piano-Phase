import React, { useEffect, useRef, useState } from 'react';
import { Info, X, Box } from 'lucide-react';
import { MELODY, NOTE_COUNT } from '../constants';
import { PlayerColor } from '../types';
import { PhaseTorus3D } from './PhaseTorus3D';

interface GeometricVisualizerProps {
  p1Progress: number;
  p2Progress: number;
  bpm: number;
  phaseCycles: number;
  resetTrigger: number;
  isVisible: boolean;
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
    if (now - lastUpdateRef.current > 40) {
      setHistory(prev => {
        const next = [...prev, { x: p1Progress, y: p2Progress }];
        return next.slice(-250); // Keep last 250 points
      });
      lastUpdateRef.current = now;
    }
  }, [p1Progress, p2Progress]);

  // Effect to clear history when reset or settings change
  useEffect(() => {
    setHistory([]);
  }, [bpm, phaseCycles, resetTrigger]);

  // MathJax handling
  useEffect(() => {
    if ((isVisible || showInfo) && window.MathJax) {
      setTimeout(() => {
        window.MathJax.typesetPromise && window.MathJax.typesetPromise();
      }, 50);
    }
  }, [isVisible, showInfo]);

  // Logic for highlight effect (Green Flash on Integer Phase)
  const isIntegerPhase = React.useMemo(() => {
    let rawDiff = p2Progress - p1Progress;
    if (rawDiff < 0) rawDiff += 1;
    const notesDiff = rawDiff * NOTE_COUNT;
    const doubled = notesDiff * 2;
    const nearestHalf = Math.round(doubled) / 2;
    const distToHalf = Math.abs(notesDiff - nearestHalf);
    
    // Check if close enough to a "step"
    const isClose = distToHalf < 0.05;
    // Check if that step is an integer (unison/canon point)
    return isClose && (Math.abs(nearestHalf % 1) < 0.01);
  }, [p1Progress, p2Progress]);

  const renderMelodyClock = () => {
    const radius = 120;
    const size = 340;
    const centerX = size / 2;
    const centerY = size / 2 - 10;

    return (
      <div className="flex flex-col items-center relative">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6">
          {"Melody Cycle ($S^1$)"}
        </h3>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 2" />
          
          {MELODY.map((note, i) => {
            const angle = (i / NOTE_COUNT) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            const isGroupA = i % 2 === 0; 

            return (
              <g key={i}>
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

          {/* Player 1 Hand */}
          <line 
            x1={centerX} y1={centerY} 
            x2={centerX + Math.cos(p1Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            y2={centerY + Math.sin(p1Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            stroke={PlayerColor.P1} strokeWidth="3" strokeLinecap="round"
          />
          {/* Player 2 Hand */}
          <line 
            x1={centerX} y1={centerY} 
            x2={centerX + Math.cos(p2Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            y2={centerY + Math.sin(p2Progress * Math.PI * 2 - Math.PI / 2) * radius} 
            stroke={PlayerColor.P2} strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round"
          />
        </svg>

        {/* Legend Position Adjustment: 
        Moved inside the relative container to better control positioning
        */}
        <div className="absolute -bottom-6 -left-6 flex flex-col gap-2 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-stone-100 shadow-sm z-10 scale-90 origin-bottom-left">
           <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[#2563eb] rounded-full"></div>
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Player 1</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-[#dc2626]"></div>
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Player 2</span>
           </div>
        </div>
      </div>
    );
  };

  const renderPhaseTorus2D = () => {
    const size = 300;
    const gridCount = 12;
    const step = size / gridCount;

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6">
          {"Phase State Space ($\\mathbb{T}^2$ Map)"}
        </h3>
        
        <div className="relative mt-2 ml-6 mb-8">
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-stone-500 whitespace-nowrap">Player 2</div>
            <div className="absolute -left-1 top-0 text-[10px] text-stone-400 font-mono -translate-x-full -translate-y-1/2">360°</div>
            <div className="absolute -left-1 bottom-0 text-[10px] text-stone-400 font-mono -translate-x-full translate-y-1/2">0°</div>

            <div 
              className={`relative border transition-all duration-500 ease-in-out ${
                isIntegerPhase 
                  ? 'bg-emerald-50 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'bg-white border-stone-200 shadow-inner'
              }`}
              style={{ width: size, height: size }}
            >
            <svg width={size} height={size} className="overflow-visible">
                {[...Array(gridCount + 1)].map((_, i) => (
                <React.Fragment key={i}>
                    <line x1={i * step} y1={0} x2={i * step} y2={size} stroke={isIntegerPhase ? "rgba(16, 185, 129, 0.1)" : "#f1f5f9"} strokeWidth="1" />
                    <line x1={0} y1={i * step} x2={size} y2={i * step} stroke={isIntegerPhase ? "rgba(16, 185, 129, 0.1)" : "#f1f5f9"} strokeWidth="1" />
                </React.Fragment>
                ))}

                <polyline 
                fill="none" stroke="black" strokeWidth="2" strokeOpacity="0.6"
                points={history.map(p => `${p.x * size},${(1 - p.y) * size}`).join(' ')}
                />

                <circle 
                cx={p1Progress * size} 
                cy={(1 - p2Progress) * size} 
                r="6" fill={PlayerColor.Fusion} className="shadow-md"
                />
            </svg>
            </div>

            <div className="absolute left-0 -bottom-5 text-[10px] text-stone-400 font-mono -translate-x-1/2">0°</div>
            <div className="absolute right-0 -bottom-5 text-[10px] text-stone-400 font-mono translate-x-1/2">360°</div>
            <div className="absolute left-1/2 -bottom-9 -translate-x-1/2 text-xs font-bold text-stone-500">Player 1</div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative p-2 bg-white/50 rounded-3xl border border-stone-200 backdrop-blur-sm space-y-8">
      
      {/* Info Button - Position adjusted slightly to match new padding if needed, but keeping absolute is fine */}
      <button 
        onClick={() => setShowInfo(true)}
        className="absolute top-6 right-6 p-2 text-stone-400 hover:text-blue-500 transition-colors bg-white rounded-full shadow-sm border border-stone-100 z-20"
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
                        <li>The melody cycle is a 1D sphere ({"$S^1$"}).</li>
                        <li>The system state lives on a 2D torus ({"$\\mathbb{T}^2$"}), product of two circles.</li>
                        <li>When phases align (unison/canon), the manifold glows green.</li>
                     </ul>
                </div>
            </div>
        </div>
      )}

      {/* 2D Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-items-center">
        {renderMelodyClock()}
        {renderPhaseTorus2D()}
      </div>

      {/* 3D View */}
      {/* Reduced top padding: pt-8 -> pt-6 */}
      <div className="flex flex-col items-center border-t border-stone-200 pt-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
           <Box size={14} /> 3D Phase Manifold
        </h3>
        
        <PhaseTorus3D 
            p1Progress={p1Progress} 
            p2Progress={p2Progress} 
            history={history} 
            isIntegerPhase={isIntegerPhase}
        />
        
        <p className="mt-4 text-xs text-stone-400 text-center max-w-lg italic">
          Visualization of the configuration space {"$\\mathbb{T}^2 = S^1 \\times S^1$"}.
        </p>
      </div>
    </div>
  );
};