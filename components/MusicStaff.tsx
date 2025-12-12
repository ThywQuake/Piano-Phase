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
  // 新增：用于可视化计算窗口
  chaosWindow?: number; // 窗口总时长 (秒)
  futureWindow?: number; // 未来预测时长 (秒)
  bpm?: number;         // 当前 BPM
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
  onDividerDrag,
  chaosWindow,
  futureWindow,
  bpm
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Groups logic
  // We need to know which notes belong to which group to draw beams
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

  // 指示线位于黄金分割点 (左侧 0.382)
  const PLAYHEAD_X = 306;
  
  const LOOP_PIXEL_WIDTH = 400 * VISIBLE_WINDOW_SCALE; 

  // Mask 计算逻辑更新：接收 futureWindow
  const maskGeometry = useMemo(() => {
    if (!chaosWindow || !bpm || futureWindow === undefined) return null;
    
    // 1. 计算一拍多少秒
    const secondsPerBeat = 60.0 / bpm;
    // 2. 计算整个循环（12个音符）多少秒
    const loopDuration = secondsPerBeat * NOTE_COUNT;
    // 3. 计算每秒对应多少像素
    const pixelsPerSecond = LOOP_PIXEL_WIDTH / loopDuration;
    
    // 使用传入的 futureWindow，默认为 0.5 以防万一
    const fut = futureWindow;
    const past = Math.max(0, chaosWindow - fut);

    const futurePixels = fut * pixelsPerSecond;
    const pastPixels = past * pixelsPerSecond;
    const totalWidth = futurePixels + pastPixels;

    // x 是矩形左边缘位置。
    // Playhead 在 PLAYHEAD_X。
    // 左边缘应该在 PLAYHEAD_X - pastPixels
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

  const renderBeamedGroup = (group: {note: Note, index: number, relX: number, y: number}[], progress: number, color: string, loopOffset: number) => {
    const notesWithPos = group.map(n => {
       const totalRelX = (n.relX + loopOffset) - progress;
       const x = PLAYHEAD_X + totalRelX * LOOP_PIXEL_WIDTH;
       return { ...n, x };
    });

    if (notesWithPos[notesWithPos.length-1].x < -50 || notesWithPos[0].x > STAFF_WIDTH + 50) return null;

    const minY = Math.min(...notesWithPos.map(n => n.y));
    const beamY = minY - STEM_HEIGHT;

    return (
      <g key={`group-${loopOffset}-${group[0].index}`}>
        <line 
          x1={notesWithPos[0].x} y1={beamY} 
          x2={notesWithPos[notesWithPos.length-1].x} y2={beamY}
          stroke={color} strokeWidth="4"
        />
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
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 relative overflow-hidden select-none">
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`} 
          className={`w-full h-auto block ${onDividerDrag ? 'cursor-row-resize' : ''}`}
          preserveAspectRatio="xMidYMid slice"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Mask: 非对称区域 */}
          {maskGeometry && (
            <rect 
                x={maskGeometry.x}
                y={0}
                width={maskGeometry.width}
                height={STAFF_HEIGHT}
                fill="rgba(250, 204, 21, 0.2)" // Yellow-400, 20% opacity
            />
          )}

          {/* Playhead Marker (黄金分割位) */}
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