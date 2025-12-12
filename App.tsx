import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Info, Settings2, X } from 'lucide-react';
import { MusicStaff } from './components/MusicStaff';
import { soundEngine } from './services/SoundEngine';
import { MELODY, NOTE_COUNT } from './constants';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phaseCycles, setPhaseCycles] = useState(40);
  const [bpm, setBpm] = useState(280);
  const [p1Progress, setP1Progress] = useState(0);
  const [p2Progress, setP2Progress] = useState(0);
  
  // Visual states
  const [dividerY, setDividerY] = useState(0.45); // Relative position of split line
  
  // Chaos Meter State
  const [chaosScore, setChaosScore] = useState(0);
  const [chaosWindow, setChaosWindow] = useState(2.0); // Seconds
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const rafRef = useRef<number | null>(null);

  // --- Chaos Calculation Logic ---
  const calculateChaos = (p1: number, p2: number, windowSeconds: number) => {
    const loopDur = soundEngine.getLoopDuration();
    const p1Pos = p1 * loopDur; 
    const p2Pos = p2 * loopDur; 
    const timestamps: number[] = [];

    const addNotes = (currentPos: number) => {
      [-1, 0].forEach(loopOffset => {
        for (let i = 0; i < NOTE_COUNT; i++) {
            const noteTime = (i / NOTE_COUNT) * loopDur + (loopOffset * loopDur);
            const relativeTime = noteTime - currentPos;
            if (relativeTime > -windowSeconds && relativeTime <= 0.05) {
                timestamps.push(relativeTime);
            }
        }
      });
    };

    addNotes(p1Pos);
    addNotes(p2Pos);

    if (timestamps.length === 0) return 0;
    timestamps.sort((a, b) => a - b);

    let events = 0;
    let lastTime = -9999;
    const CHORD_THRESHOLD = 0.06;

    for (const t of timestamps) {
        if (t - lastTime > CHORD_THRESHOLD) {
            events++;
            lastTime = t;
        }
    }
    return events;
  };

  const updateLoop = useCallback(() => {
    const { p1, p2 } = soundEngine.getCurrentState();
    setP1Progress(p1);
    setP2Progress(p2);

    const score = calculateChaos(p1, p2, chaosWindow);
    setChaosScore(score);
    
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateLoop);
    }
  }, [isPlaying, chaosWindow]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, updateLoop]);

  const togglePlay = async () => {
    if (!isPlaying) {
      await soundEngine.start();
      setIsPlaying(true);
    } else {
      soundEngine.pause();
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    soundEngine.reset();
    setIsPlaying(false);
    setP1Progress(0);
    setP2Progress(0);
    setChaosScore(0);
  };

  const handlePhaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPhaseCycles(val);
    soundEngine.setCyclesToPhase(val);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBpm(val);
    soundEngine.setBpm(val);
  };

  // Phase Calculation in Notes
  let rawDiff = p2Progress - p1Progress;
  if (rawDiff < 0) rawDiff += 1; // 0..1
  
  // Convert to Notes (Total 12)
  const notesDiff = rawDiff * NOTE_COUNT;
  
  // Highlight logic
  // 6.00 is exactly 0.5 phase (anti-phase)
  // 0.00 / 12.00 is locked
  const isLocked = notesDiff < 0.1 || notesDiff > 11.9;
  const isAnti = Math.abs(notesDiff - 6.0) < 0.1;
  const isSubPhase = Math.abs(notesDiff % 1) < 0.1; // Hits an exact note shift?
  
  let phaseColorClass = "text-stone-500";
  if (isLocked) phaseColorClass = "text-blue-600 font-bold scale-110";
  else if (isAnti) phaseColorClass = "text-purple-600 font-bold scale-110";
  else if (isSubPhase) phaseColorClass = "text-stone-800 font-bold";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200 flex flex-col" onClick={() => setIsSettingsOpen(false)}>
      
      {/* Modal for Info */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                <button onClick={() => setIsInfoOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800">
                    <X size={20}/>
                </button>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Info size={20} className="text-blue-500"/>
                    Auditory Density Calculation
                </h2>
                <div className="text-sm text-stone-600 space-y-3">
                    <p>The <strong>Auditory Density</strong> meter visualizes the perceived "chaos" or complexity of the combined musical pattern.</p>
                    <div className="bg-stone-50 p-3 rounded border border-stone-200 font-mono text-xs">
                        Density = Unique Sound Events / Time Window
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                        <li>It looks back at the last <strong>{chaosWindow} seconds</strong> of the music.</li>
                        <li>It counts how many distinct attacks occur.</li>
                        <li>If two notes from different voices occur within <strong>60ms</strong> of each other, they are perceived as a single "chord" event (less chaotic).</li>
                        <li>If they drift apart, they become two separate events (more chaotic).</li>
                    </ul>
                </div>
            </div>
        </div>
      )}

      <div className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full flex gap-6">
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6 flex justify-between items-end border-b border-stone-200 pb-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-800">Piano Phase</h1>
                    <p className="text-stone-500 text-sm italic mt-1">Steve Reich (1967)</p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">Phase Offset (Notes)</div>
                    <div className="flex items-baseline gap-2">
                        <div className={`text-3xl font-mono transition-all duration-300 ${phaseColorClass}`}>
                            {notesDiff.toFixed(2)}
                        </div>
                        <div className="text-sm text-stone-400 font-mono">/ 12</div>
                    </div>
                </div>
            </div>

            {/* Staves */}
            <div className="space-y-4">
                <MusicStaff 
                    label="Player 1 (Steady)" 
                    progressP1={p1Progress} 
                    progressP2={p2Progress}
                    mode="p1"
                />
                <MusicStaff 
                    label="Player 2 (Phasing)" 
                    progressP1={p1Progress} 
                    progressP2={p2Progress}
                    mode="p2"
                />
                <div className="relative pt-6">
                     <div className="absolute top-0 left-10 right-10 h-6 border-l border-r border-t border-dashed border-stone-300 rounded-t-xl"></div>
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-50 px-2 text-xs text-stone-400 uppercase tracking-widest">
                        Acoustic Result
                     </div>
                    <MusicStaff 
                        label="Fusion" 
                        progressP1={p1Progress} 
                        progressP2={p2Progress}
                        mode="fusion"
                        dividerY={dividerY}
                        onDividerDrag={setDividerY}
                    />
                </div>
            </div>

            {/* Controls Bar */}
            <div className="mt-8 bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={togglePlay}
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-900 text-white hover:bg-stone-700 transition-colors shadow-md"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={handleReset} className="p-2 text-stone-400 hover:text-stone-800 transition-colors">
                        <RefreshCw size={20} />
                    </button>
                </div>

                <div className="h-8 w-px bg-stone-200 mx-2 hidden md:block"></div>

                {/* Sliders Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="min-w-[150px]">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-stone-500 uppercase">Phase Speed</label>
                            <span className="text-xs font-mono text-stone-400">{phaseCycles} cycles</span>
                        </div>
                        <input 
                            type="range" min="10" max="120" step="5"
                            value={phaseCycles} onChange={handlePhaseChange}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-800"
                        />
                    </div>
                    
                    <div className="min-w-[150px]">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-stone-500 uppercase">Tempo (BPM)</label>
                            <span className="text-xs font-mono text-stone-400">{bpm}</span>
                        </div>
                        <input 
                            type="range" min="120" max="400" step="10"
                            value={bpm} onChange={handleBpmChange}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-800"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Sidebar: Chaos Meter */}
        <div className="w-24 flex flex-col items-center pt-24 shrink-0">
             <div className="flex flex-col items-center h-full max-h-[500px] w-full bg-white rounded-2xl shadow-sm border border-stone-200 py-4 relative">
                
                {/* Fixed Label: Rotate -90 degrees properly */}
                <div 
                    onClick={() => setIsInfoOpen(true)}
                    className="cursor-pointer hover:text-blue-500 transition-colors mb-4"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                   <span className="text-xs font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">
                       Auditory Density <Info size={10} className="inline ml-1 mb-1"/>
                   </span>
                </div>
                
                {/* Meter Container */}
                <div className="flex-1 w-6 bg-stone-100 rounded-full relative overflow-hidden mb-4 border border-stone-100">
                    <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-400 via-yellow-400 to-rose-500 transition-all duration-300 ease-out"
                        style={{ height: `${Math.min(100, (chaosScore / 30) * 100)}%` }} 
                    ></div>
                    {/* Ticks */}
                    {[1,2,3,4].map(i => (
                        <div key={i} className="absolute w-full h-px bg-white/50" style={{ bottom: `${i*20}%`}}></div>
                    ))}
                </div>

                <div className="text-2xl font-mono font-bold text-stone-700 mb-6">
                    {chaosScore}
                </div>

                {/* Window Setting */}
                <div className="relative">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsSettingsOpen(!isSettingsOpen);
                        }}
                        className={`p-2 rounded-full transition-colors ${isSettingsOpen ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <Settings2 size={18} />
                    </button>
                    
                    {/* Popover for slider */}
                    {isSettingsOpen && (
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-stone-800 text-white p-3 rounded-lg shadow-xl w-48 z-20"
                        >
                            <div className="text-xs font-bold mb-2">History Window: {chaosWindow}s</div>
                            <input 
                                type="range" min="0.5" max="5.0" step="0.5"
                                value={chaosWindow}
                                onChange={(e) => setChaosWindow(parseFloat(e.target.value))}
                                className="w-full h-1 bg-stone-600 rounded appearance-none cursor-pointer accent-white"
                            />
                            {/* Arrow */}
                            <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 w-2 h-2 bg-stone-800 rotate-45"></div>
                        </div>
                    )}
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default App;