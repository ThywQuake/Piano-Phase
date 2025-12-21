import React, { useMemo, useRef, useState } from 'react';
import { MELODY, NOTE_COUNT } from '../constants';
import { PlayerColor, Note } from '../types';

interface MusicStaffProps {
  label: string;
  progressP1: number; // 0-1 position
  progressP2: number; // 0-1 position
  mode: 'p1' | 'p2' | 'fusion';
  dividerY?: number; // 0-1 relative to height
  onDividerDrag?: (newY: number) => void;
  chaosWindow?: number; 
  futureWindow?: number; 
  bpm?: number;
  highlight?: boolean;       
}

const STAFF_HEIGHT = 100;
const STAFF_WIDTH = 800;
const LINE_SPACING = 8;
const BASE_Y = 70; 
const VISIBLE_WINDOW_SCALE = 1.0; 
const STEM_HEIGHT = 22;

// Defined a NoteGroup type for better structure
interface NoteGroup {
  direction: 'up' | 'down';
  notes: {
    note: Note;
    index: number;
    relX: number;
    y: number;
  }[];
}

export const MusicStaff: React.FC<MusicStaffProps> = ({ 
  label, 
  progressP1, 
  progressP2,
  mode,
  dividerY,
  onDividerDrag,
  chaosWindow,
  futureWindow,
  bpm,
  highlight
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Groups logic
  // Each group contains notes that are beamed together
  const groups: NoteGroup[] = useMemo(() => {
    const definitions = [
      { indices: [0, 2, 4], direction: 'down' as const },
      { indices: [1, 3], direction: 'up' as const },
      { indices: [6, 8, 10], direction: 'down' as const },
      { indices: [5, 7], direction: 'up' as const },
      { indices: [9, 11], direction: 'up' as const },
    ]

    return definitions.map(def => ({
      direction: def.direction,
      notes: def.indices.map(i => {
        const note = MELODY[i];
        return {
          note,
          index: i,
          relX: i / NOTE_COUNT,
          y: BASE_Y - (note.staffY * (LINE_SPACING / 2))
        };
      })
    }));
  }, []);

  const lines = [0, 1, 2, 3, 4].map(i => BASE_Y - i * LINE_SPACING);
  const PLAYHEAD_X = 306;
  const LOOP_PIXEL_WIDTH = 400 * VISIBLE_WINDOW_SCALE; 

  const maskGeometry = useMemo(() => {
    if (!chaosWindow || !bpm || futureWindow === undefined) return null;
    const secondsPerBeat = 60.0 / bpm;
    const loopDuration = secondsPerBeat * NOTE_COUNT;
    const pixelsPerSecond = LOOP_PIXEL_WIDTH / loopDuration;
    
    const fut = futureWindow;
    const past = Math.max(0, chaosWindow - fut);

    const futurePixels = fut * pixelsPerSecond;
    const pastPixels = past * pixelsPerSecond;
    const totalWidth = futurePixels + pastPixels;

    return {
        x: PLAYHEAD_X - pastPixels,
        width: totalWidth
    };
  }, [chaosWindow, futureWindow, bpm, LOOP_PIXEL_WIDTH]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (onDividerDrag) {
      setIsDragging(true);
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && onDividerDrag && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const clampedY = Math.max(0, Math.min(STAFF_HEIGHT, y));
      onDividerDrag(clampedY / STAFF_HEIGHT);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  const renderBeamedGroup = (
    group: NoteGroup, 
    progress: number, 
    color: string, 
    loopOffset: number
  ) => {
    const { notes, direction } = group;

    const notesWithPos = notes.map(n => {
       const totalRelX = (n.relX + loopOffset) - progress;
       const x = PLAYHEAD_X + totalRelX * LOOP_PIXEL_WIDTH;
       return { ...n, x };
    });

    if (notesWithPos[notesWithPos.length-1].x < -50 || notesWithPos[0].x > STAFF_WIDTH + 50) return null;

    let beamY;
    if (direction === 'up') {
        const minY = Math.min(...notesWithPos.map(n => n.y));
        beamY = minY - STEM_HEIGHT;
    } else {
        const maxY = Math.max(...notesWithPos.map(n => n.y));
        beamY = maxY + STEM_HEIGHT;
    }

    return (
      <g key={`group-${loopOffset}-${notes[0].index}`}>
        {/* Beam */}
        <line 
          x1={notesWithPos[0].x} y1={beamY} 
          x2={notesWithPos[notesWithPos.length-1].x} y2={beamY}
          stroke={color} strokeWidth="4"
        />
        {/* Stems & Noteheads */}
        {notesWithPos.map(n => (
          <g key={n.index}>
             <line 
               x1={n.x} y1={n.y} 
               x2={n.x} y2={beamY}
               stroke={color} strokeWidth="1.5"
             />
             <ellipse 
               cx={n.x} cy={n.y} rx={4.5} ry={3.5} 
               transform={`rotate(-20, ${n.x}, ${n.y})`}
               fill={color} 
             />
          </g>
        ))}
      </g>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-1 text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
        {label}
      </div>
      <div className={`w-full rounded-lg shadow-sm border border-gray-200 relative overflow-hidden select-none transition-all duration-500 ease-in-out ${
        highlight 
          ? 'bg-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.2)] border-emerald-300' 
          : 'bg-white'
      }`}>
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`} 
          className={`w-full h-auto block ${onDividerDrag ? 'cursor-row-resize' : ''}`}
          preserveAspectRatio="xMidYMid slice"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {maskGeometry && (
            <rect 
                x={maskGeometry.x}
                y={0}
                width={maskGeometry.width}
                height={STAFF_HEIGHT}
                fill="rgba(250, 204, 21, 0.2)"
            />
          )}

          <line 
              x1={PLAYHEAD_X} y1={0} x2={PLAYHEAD_X} y2={STAFF_HEIGHT} 
              stroke="rgba(255,0,0,0.3)" strokeWidth="2" strokeDasharray="4 2" 
          />

          <g opacity={0.3}>
              {lines.map((y, i) => (
              <line 
                  key={i} 
                  x1={0} y1={y} x2={STAFF_WIDTH} y2={y} 
                  stroke="#9ca3af" strokeWidth="1" 
              />
              ))}
          </g>
          
          <text x={10} y={BASE_Y - 10} fontSize="32" fill="#d1d5db" style={{ fontFamily: 'serif' }}>𝄞</text>

          {dividerY !== undefined && (
              <g transform={`translate(0, ${dividerY * STAFF_HEIGHT})`}
                  onPointerDown={handlePointerDown}
                  className="cursor-row-resize"
              >
                  <rect x="0" y="-10" width={STAFF_WIDTH} height="20" fill="transparent" />
                  <line 
                      x1={0} y1={0} x2={STAFF_WIDTH} y2={0} 
                      stroke="#a8a29e" strokeWidth="1.5" strokeDasharray="6 4"
                  />
                  <text x={STAFF_WIDTH - 60} y={-4} fontSize="10" fill="#a8a29e" fontStyle="italic">Split</text>
              </g>
          )}

          {[-1, 0, 1, 2].map(loopOffset => (
              <g key={loopOffset}>
                  {mode === 'p1' && groups.map(g => renderBeamedGroup(g, progressP1, PlayerColor.P1, loopOffset))}
                  {mode === 'p2' && groups.map(g => renderBeamedGroup(g, progressP2, PlayerColor.P2, loopOffset))}
                  {mode === 'fusion' && (
                      <>
                          {groups.map(g => renderBeamedGroup(g, progressP1, '#1f2937', loopOffset))}
                          {groups.map(g => renderBeamedGroup(g, progressP2, '#1f2937', loopOffset))}
                      </>
                  )}
              </g>
          ))}

        </svg>
      </div>
    </div>
  );
};