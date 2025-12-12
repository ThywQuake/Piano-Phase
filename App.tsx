import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Info, Settings2, X, Music, Github, ChevronDown } from 'lucide-react';
import { MusicStaff } from './components/MusicStaff';
import { soundEngine } from './services/SoundEngine';
import { MELODY, NOTE_COUNT, INSTRUMENTS } from './constants';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phaseCycles, setPhaseCycles] = useState(40);
  const [bpm, setBpm] = useState(280);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(INSTRUMENTS[0].id);
  const [p1Progress, setP1Progress] = useState(0);
  const [p2Progress, setP2Progress] = useState(0);
  
  // Visual states
  const [dividerY, setDividerY] = useState(0.45); 
  
  // Chaos Meter State
  const [chaosScore, setChaosScore] = useState(0);
  const [chaosWindow, setChaosWindow] = useState(2.0); 
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
  
  // 新增：处理乐器切换
  const handleInstrumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedInstrumentId(val);
      soundEngine.setInstrument(val);
  };

  // Phase Calculation in Notes
  let rawDiff = p2Progress - p1Progress;
  if (rawDiff < 0) rawDiff += 1; // 0..1
  const notesDiff = rawDiff * NOTE_COUNT;
  const doubled = notesDiff * 2;
  const nearestHalf = Math.round(doubled) / 2;
  const distToHalf = Math.abs(notesDiff - nearestHalf);
  const isHighlight = distToHalf < 0.05; 
  
  let phaseColorClass = "text-stone-400";
  if (isHighlight) {
    const isInteger = Math.abs(nearestHalf % 1) < 0.01;
    if (isInteger) {
         phaseColorClass = "text-emerald-500 font-bold scale-110";
    } else {
         phaseColorClass = "text-rose-500 font-bold scale-105";
    }
  }

  // Shared Chaos Meter Content (Updated with your mask fix)
  const renderChaosMeter = (isVertical: boolean) => {
    const percent = Math.min(100, (chaosScore / 30) * 100);
    return (
      <div className={`flex ${isVertical ? 'flex-col items-center py-4' : 'flex-row items-center px-4 py-3'} h-full w-full bg-white rounded-2xl shadow-sm border border-stone-200 relative gap-4`}>
          <div 
              onClick={() => setIsInfoOpen(true)}
              className="cursor-pointer hover:text-blue-500 transition-colors flex items-center"
              style={isVertical ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}}
          >
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
                  Auditory Density <Info size={14} className={isVertical ? "mb-1" : "ml-1"}/>
              </span>
          </div>
          <div className={`flex-1 rounded-full relative overflow-hidden border border-stone-100 ${isVertical ? 'w-6 h-full' : 'h-4 w-full'}`}>
              <div className="absolute inset-0 bg-gradient-to-r lg:bg-gradient-to-t from-emerald-400 via-yellow-400 to-rose-500"></div>
              <div 
                  className="absolute bg-stone-100 transition-all duration-300 ease-out"
                  style={isVertical ? { 
                      width: '120%', 
                      left: '-10%',
                      top: '-1px',                   
                      height: `calc(${100 - percent}% + 2px)` 
                  } : {
                      height: '120%',
                      top: '-10%',
                      right: '-1px',                 
                      width: `calc(${100 - percent}% + 2px)`  
                  }} 
              ></div>
          </div>
          <div className={`text-xl font-mono font-bold text-stone-700 ${isVertical ? 'mb-6 text-center' : 'w-8 text-right'}`}>
              {chaosScore}
          </div>
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
              {isSettingsOpen && (
                  <div 
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute z-20 bg-stone-800 text-white p-3 rounded-lg shadow-xl w-48 ${isVertical ? 'right-full top-1/2 -translate-y-1/2 mr-3' : 'bottom-full right-0 mb-3'}`}
                  >
                      <div className="text-xs font-bold mb-2">History Window: {chaosWindow}s</div>
                      <input 
                          type="range" min="0.5" max="5.0" step="0.5"
                          value={chaosWindow}
                          onChange={(e) => setChaosWindow(parseFloat(e.target.value))}
                          className="w-full h-1 bg-stone-600 rounded appearance-none cursor-pointer accent-white"
                      />
                  </div>
              )}
          </div>
      </div>
    );
  };

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

      <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full flex flex-row gap-8">
        
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
            <div className="space-y-6">
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

            {/* Mobile/Tablet Chaos Meter (Horizontal) */}
            <div className="mt-8 lg:hidden">
                {renderChaosMeter(false)}
            </div>

            {/* Controls Bar - Updated with Instrument Selector */}
            <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex items-center gap-2 self-start sm:self-center">
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

                <div className="h-px w-full sm:h-8 sm:w-px bg-stone-200 mx-2"></div>

                {/* Sliders Grid - Expanded to 3 columns */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {/* Phase Speed */}
                    <div className="min-w-[120px]">
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
                    
                    {/* Tempo */}
                    <div className="min-w-[120px]">
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

                    {/* Instrument Selector */}
                    <div className="min-w-[120px]">
                         <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-stone-500 uppercase">Timbre</label>
                        </div>
                        <div className="relative">
                          <select 
                            value={selectedInstrumentId}
                            onChange={handleInstrumentChange}
                            className="w-full h-8 bg-stone-100 border border-stone-200 text-stone-700 text-sm rounded-lg px-2 appearance-none focus:outline-none focus:ring-2 focus:ring-stone-400 font-medium cursor-pointer"
                          >
                            {INSTRUMENTS.map(inst => (
                              <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Description Section */}
            <div className="mt-12 border-t border-stone-200 pt-8 pb-8">
                <div className="flex flex-col gap-6 max-w-4xl">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-stone-100 rounded-full text-stone-500 hidden sm:block">
                            <Music size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-stone-800 mb-2">About Piano Phase</h2>
                            <div className="prose prose-stone text-sm text-stone-600 leading-relaxed space-y-3">
                                <p>
                                    <strong>Piano Phase</strong> (1967) is one of the first and most famous examples of minimalism in music, composed by 
                                    Steve Reich. It employs a technique called <span className="text-stone-800 font-semibold">phasing</span>.
                                </p>
                                <p>
                                    Two pianists begin by playing the same repeating twelve-note melody in unison. One pianist keeps a steady tempo, 
                                    while the other gradually accelerates until they are playing slightly faster. As the second pianist pulls ahead, 
                                    the two melodies shift out of sync, creating a series of complex, ever-changing rhythmic patterns and resulting harmonies.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-stone-500 border-t border-stone-100 pt-4">
                        <Github size={16} />
                        <span>Project Source:</span>
                        <a 
                            href="https://github.com/ThywQuake/Piano-Phase" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-mono"
                        >
                            https://github.com/ThywQuake/Piano-Phase
                        </a>
                    </div>
                </div>
            </div>
        </div>

        {/* Desktop Chaos Meter */}
        <div className="w-24 shrink-0 pt-24 hidden lg:block">
             <div className="h-[500px] w-full sticky top-8">
                {renderChaosMeter(true)}
             </div>
        </div>

      </div>
    </div>
  );
};

export default App;