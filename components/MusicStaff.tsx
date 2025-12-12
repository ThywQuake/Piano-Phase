import React, { useMemo, useRef, useState } from 'react';
import { MELODY, GROUP_SIZE, NOTE_COUNT } from '../constants';
import { PlayerColor, Note } from '../types';

interface MusicStaffProps {
  label: string;
  progressP1: number; // 0-1 position
  progressP2: number; // 0-1 position
  mode: 'p1' | 'p2' | 'fusion';
  dividerY?: number; // 0-1 relative to height
  onDividerDrag?: (newY: number) => void;
}

const STAFF_HEIGHT = 100;
const STAFF_WIDTH = 800;
const LINE_SPACING = 8;
const BASE_Y = 70; 
const VISIBLE_WINDOW_SCALE = 1.0; 
const STEM_HEIGHT = 22;

export const MusicStaff: React.FC<MusicStaffProps> = ({ 
  label, 
  progressP1, 
  progressP2,
  mode,
  dividerY,
  onDividerDrag
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Groups logic
  // We need to know which notes belong to which group to draw beams
  // MELODY is 12 notes. GROUP_SIZE = 6.
  // Group 1: 0-5. Group 2: 6-11.
  const groups = useMemo(() => {
    const g = [];
    for (let i = 0; i < NOTE_COUNT; i += GROUP_SIZE) {
      g.push(MELODY.slice(i, i + GROUP_SIZE).map((note, idx) => ({ 
        note, 
        index: i + idx,
        relX: (i + idx) / NOTE_COUNT,
        y: BASE_Y - (note.staffY * (LINE_SPACING / 2))
      })));
    }
    return g;
  }, []);

  const lines = [0, 1, 2, 3, 4].map(i => BASE_Y - i * LINE_SPACING);

  const PLAYHEAD_X = 150;
  const LOOP_PIXEL_WIDTH = 400 * VISIBLE_WINDOW_SCALE; 

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
      // Clamp
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

  // Render a set of beamed notes
  const renderBeamedGroup = (group: {note: Note, index: number, relX: number, y: number}[], progress: number, color: string, loopOffset: number) => {
    
    // We calculate the X position for the first note to see if the group is visible
    // But we need individual Xs
    
    const notesWithPos = group.map(n => {
       const totalRelX = (n.relX + loopOffset) - progress;
       const x = PLAYHEAD_X + totalRelX * LOOP_PIXEL_WIDTH;
       return { ...n, x };
    });

    // Check visibility (loose bound)
    if (notesWithPos[notesWithPos.length-1].x < -50 || notesWithPos[0].x > STAFF_WIDTH + 50) return null;

    // Calculate Beam Y
    // For this melody, notes are mostly high. Let's put beam above.
    // Find min Y (highest point)
    const minY = Math.min(...notesWithPos.map(n => n.y));
    const beamY = minY - STEM_HEIGHT;

    return (
      <g key={`group-${loopOffset}-${group[0].index}`}>
        {/* Beam */}
        <line 
          x1={notesWithPos[0].x} y1={beamY} 
          x2={notesWithPos[notesWithPos.length-1].x} y2={beamY}
          stroke={color} strokeWidth="4"
        />
        
        {/* Notes and Stems */}
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
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 relative overflow-hidden select-none">
      <div className="absolute top-2 left-2 text-xs font-bold text-gray-400 uppercase tracking-widest z-10 bg-white/80 px-2 rounded">
        {label}
      </div>

      <svg 
        ref={svgRef}
        viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`} 
        className={`w-full h-auto block ${onDividerDrag ? 'cursor-row-resize' : ''}`}
        preserveAspectRatio="xMidYMid slice"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Playhead Marker (Fixed) */}
        <line 
            x1={PLAYHEAD_X} y1={0} x2={PLAYHEAD_X} y2={STAFF_HEIGHT} 
            stroke="rgba(255,0,0,0.3)" strokeWidth="2" strokeDasharray="4 2" 
        />

        {/* Staff Lines */}
        <g opacity={0.3}>
            {lines.map((y, i) => (
            <line 
                key={i} 
                x1={0} y1={y} x2={STAFF_WIDTH} y2={y} 
                stroke="#9ca3af" strokeWidth="1" 
            />
            ))}
        </g>
        
        {/* Clef */}
        <text x={10} y={BASE_Y - 10} fontSize="32" fill="#d1d5db" style={{ fontFamily: 'serif' }}>𝄞</text>

        {/* Draggable Divider Line (High/Low) */}
        {dividerY !== undefined && (
             <g transform={`translate(0, ${dividerY * STAFF_HEIGHT})`}
                onPointerDown={handlePointerDown}
                className="cursor-row-resize"
             >
                {/* Hit area for easier grabbing */}
                <rect x="0" y="-10" width={STAFF_WIDTH} height="20" fill="transparent" />
                <line 
                    x1={0} y1={0} x2={STAFF_WIDTH} y2={0} 
                    stroke="#a8a29e" strokeWidth="1.5" strokeDasharray="6 4"
                />
                <text x={STAFF_WIDTH - 60} y={-4} fontSize="10" fill="#a8a29e" fontStyle="italic">Split</text>
             </g>
        )}

        {/* Notes */}
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
  );
};