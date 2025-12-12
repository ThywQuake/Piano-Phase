import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Info, Settings2, X, Music, ChevronDown } from 'lucide-react';
import { MusicStaff } from './components/MusicStaff';
import { soundEngine } from './services/SoundEngine';
import { MELODY, NOTE_COUNT, INSTRUMENTS } from './constants';

// Declare MathJax for TypeScript
declare global {
  interface Window {
    MathJax: any;
  }
}

// GitHub Corner Component
const GithubCorner = ({ url }: { url: string }) => (
  <a 
    href={url} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="github-corner" 
    aria-label="View source on GitHub"
  >
    <svg 
      width="80" 
      height="80" 
      viewBox="0 0 250 250" 
      style={{ fill: '#151513', color: '#fff', position: 'absolute', top: 0, border: 0, right: 0, zIndex: 50 }} 
      aria-hidden="true"
    >
      <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
      <path 
        d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" 
        fill="currentColor" 
        style={{ transformOrigin: '130px 106px' }} 
        className="octo-arm"
      ></path>
      <path 
        d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" 
        fill="currentColor" 
        className="octo-body"
      ></path>
    </svg>
    <style>{`
      .github-corner:hover .octo-arm {
        animation: octocat-wave 560ms ease-in-out;
      }
      @keyframes octocat-wave {
        0%, 100% { transform: rotate(0) }
        20%, 60% { transform: rotate(-25deg) }
        40%, 80% { transform: rotate(10deg) }
      }
      @media (max-width:500px) {
        .github-corner:hover .octo-arm {
          animation: none;
        }
        .github-corner .octo-arm {
          animation: octocat-wave 560ms ease-in-out;
        }
      }
    `}</style>
  </a>
);

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [phaseCycles, setPhaseCycles] = useState(40);
  const [bpm, setBpm] = useState(280);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(INSTRUMENTS[0].id);
  const [noteDuration, setNoteDuration] = useState(INSTRUMENTS[0].envelope.decay);
  
  const [p1Progress, setP1Progress] = useState(0);
  const [p2Progress, setP2Progress] = useState(0);
  
  const [dividerY, setDividerY] = useState(0.62); 
  
  // Chaos Meter State
  const [chaosScore, setChaosScore] = useState(0);
  const [chaosWindow, setChaosWindow] = useState(0.5); // Total window
  const [futureWindow, setFutureWindow] = useState(0.2); // Future part
  const [fusionThreshold, setFusionThreshold] = useState(0.025);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isInfoOpen && window.MathJax) {
      setTimeout(() => {
        window.MathJax.typesetPromise && window.MathJax.typesetPromise();
      }, 50);
    }
  }, [isInfoOpen]);

  // --- Chaos Calculation Logic (Rhythmic Irregularity) ---
  const calculateChaos = (p1: number, p2: number, windowTotal: number, future: number, threshold: number) => {
    const loopDur = soundEngine.getLoopDuration();
    const p1Pos = p1 * loopDur; 
    const p2Pos = p2 * loopDur; 
    const timestamps: number[] = [];
    
    // 非对称窗口
    // 过去：(windowTotal - future)
    // 未来：future
    const futureLimit = future;
    const pastLimit = Math.max(0, windowTotal - futureLimit);

    const addNotes = (currentPos: number) => {
      [-1, 0, 1].forEach(loopOffset => {
        for (let i = 0; i < NOTE_COUNT; i++) {
            const noteTime = (i / NOTE_COUNT) * loopDur + (loopOffset * loopDur);
            const relativeTime = noteTime - currentPos;
            
            // NEW: Record Window [ -pastLimit, +futureLimit ]
            if (relativeTime >= -pastLimit && relativeTime <= futureLimit) {
                timestamps.push(relativeTime);
            }
        }
      });
    };

    addNotes(p1Pos);
    addNotes(p2Pos);

    if (timestamps.length < 2) return 0;
    timestamps.sort((a, b) => a - b);

    // 1. Auditory Fusion
    const fusedEvents: number[] = [];
    if (timestamps.length > 0) {
        fusedEvents.push(timestamps[0]);
        for (let i = 1; i < timestamps.length; i++) {
            const diff = timestamps[i] - timestamps[i-1];
            if (diff > threshold) { 
                fusedEvents.push(timestamps[i]);
            }
        }
    }
    
    if (fusedEvents.length < 2) return 0;

    // 2. Calculate IOIs
    const iois: number[] = [];
    for (let i = 0; i < fusedEvents.length - 1; i++) {
        iois.push(fusedEvents[i+1] - fusedEvents[i]);
    }

    // 3. Calculate CV
    const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
    if (mean === 0) return 0;

    const variance = iois.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / iois.length;
    const sd = Math.sqrt(variance);
    const cv = sd / mean;

    return Math.min(100, Math.round(cv * 100));
  };

  const updateLoop = useCallback(() => {
    const { p1, p2 } = soundEngine.getCurrentState();
    setP1Progress(p1);
    setP2Progress(p2);

    // Update with dynamic futureWindow
    const score = calculateChaos(p1, p2, chaosWindow, futureWindow, fusionThreshold);
    setChaosScore(score);
    
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateLoop);
    }
  }, [isPlaying, chaosWindow, futureWindow, fusionThreshold]);

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
  
  const handleInstrumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedInstrumentId(val);
      soundEngine.setInstrument(val);
      const inst = INSTRUMENTS.find(i => i.id === val);
      if (inst) {
          setNoteDuration(inst.envelope.decay);
      }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setNoteDuration(val);
      soundEngine.setDecay(val);
  };

  let rawDiff = p2Progress - p1Progress;
  if (rawDiff < 0) rawDiff += 1;
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

  const renderChaosMeter = (isVertical: boolean) => {
    const percent = chaosScore;
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
                      className={`absolute z-20 bg-stone-800 text-white p-3 rounded-lg shadow-xl w-56 ${isVertical ? 'right-full top-1/2 -translate-y-1/2 mr-3' : 'bottom-full right-0 mb-3'}`}
                  >
                      <div className="text-xs font-bold mb-2">Total Window: {chaosWindow}s</div>
                      <input 
                          type="range" min="0.3" max="2.0" step="0.1"
                          value={chaosWindow}
                          onChange={(e) => setChaosWindow(parseFloat(e.target.value))}
                          className="w-full h-1 bg-stone-600 rounded appearance-none cursor-pointer accent-white mb-4"
                      />
                      
                      {/* 新增: Future Prediction Slider */}
                      <div className="text-xs font-bold mb-2">Future Prediction: {futureWindow}s</div>
                      <input 
                          type="range" min="0.01" max="0.3" step="0.01"
                          value={futureWindow}
                          onChange={(e) => setFutureWindow(parseFloat(e.target.value))}
                          className="w-full h-1 bg-stone-600 rounded appearance-none cursor-pointer accent-white mb-4"
                      />

                      <div className="text-xs font-bold mb-2">Fusion Threshold: {Math.round(fusionThreshold * 1000)}ms</div>
                      <input 
                          type="range" min="0.005" max="0.100" step="0.005"
                          value={fusionThreshold}
                          onChange={(e) => setFusionThreshold(parseFloat(e.target.value))}
                          className="w-full h-1 bg-stone-600 rounded appearance-none cursor-pointer accent-white"
                      />
                  </div>
              )}
          </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200 flex flex-col relative" onClick={() => setIsSettingsOpen(false)}>
      
      {/* GitHub Corner */}
      <GithubCorner url="https://github.com/ThywQuake/Piano-Phase" />

      {/* Modal for Info */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
                <button onClick={() => setIsInfoOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800">
                    <X size={20}/>
                </button>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Info size={20} className="text-blue-500"/>
                    Auditory Density Calculation
                </h2>
                <div className="text-sm text-stone-600 space-y-4">
                    <p>The <strong>Auditory Density</strong> meter quantifies the rhythmic irregularity within a sliding time window centered on the current moment.</p>
                    
                    <div className="bg-stone-50 p-4 rounded border border-stone-200 text-xs">
                        <p className="mb-2 font-semibold text-stone-500 uppercase tracking-wider">Formula: Coefficient of Variation (CV)</p>
                        <div className="overflow-x-auto py-2">
                             <div>
                                {"$$ Density = \\min \\left( 100, \\frac{\\sigma}{\\mu} \\times 100 \\right) $$"}
                             </div>
                             <div className="mt-2">
                                {"$$ \\mu = \\frac{1}{N} \\sum_{i=1}^{N} \\Delta t_i $$"}
                             </div>
                             <div className="mt-2">
                                {"$$ \\sigma = \\sqrt{\\frac{1}{N} \\sum_{i=1}^{N} (\\Delta t_i - \\mu)^2} $$"}
                             </div>
                        </div>
                        <div className="mt-2 text-stone-400 italic">
                            {/* Update: Dynamic formula text */}
                            Where {"$\\Delta t_i$"} are the Inter-Onset Intervals (IOIs) between consecutive sound events (fused if {"$< " + Math.round(fusionThreshold * 1000) + "ms$"}) in the window {"$[t - " + (chaosWindow - futureWindow).toFixed(2) + ", t + " + futureWindow + "]$"}.
                        </div>
                    </div>

                    <ul className="list-disc list-inside space-y-1">
                         <li><strong>Low Density (Green)</strong>: $\sigma \approx 0$. Events are evenly spaced (Isochronous). Occurs during <span className="text-emerald-600 font-bold">Unison</span> or <span className="text-emerald-600 font-bold">Perfect Interlocking</span>.</li>
                         <li><strong>High Density (Red)</strong>: $\sigma \gg 0$. Events are irregularly spaced. Occurs during <span className="text-rose-500 font-bold">Phasing Transitions</span>.</li>
                    </ul>
                </div>
            </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full flex flex-row gap-8">
        <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6 flex justify-between items-end border-b border-stone-200 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-stone-800">Piano Phase</h1>
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
                    chaosWindow={chaosWindow}
                    futureWindow={futureWindow}
                    bpm={bpm}
                />
                <MusicStaff 
                    label="Player 2 (Phasing)" 
                    progressP1={p1Progress} 
                    progressP2={p2Progress}
                    mode="p2"
                    chaosWindow={chaosWindow}
                    futureWindow={futureWindow}
                    bpm={bpm}
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
                        chaosWindow={chaosWindow}
                        futureWindow={futureWindow}
                        bpm={bpm}
                    />
                </div>
            </div>

            <div className="mt-8 lg:hidden">
                {renderChaosMeter(false)}
            </div>

            {/* Controls Bar */}
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

                {/* Sliders Grid */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <div className="min-w-[100px]">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-stone-500 uppercase">Phase Speed</label>
                            <span className="text-xs font-mono text-stone-400">{phaseCycles}</span>
                        </div>
                        <input 
                            type="range" min="10" max="120" step="5"
                            value={phaseCycles} onChange={handlePhaseChange}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-800"
                        />
                    </div>
                    
                    <div className="min-w-[100px]">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-stone-500 uppercase">Tempo</label>
                            <span className="text-xs font-mono text-stone-400">{bpm}</span>
                        </div>
                        <input 
                            type="range" min="120" max="400" step="10"
                            value={bpm} onChange={handleBpmChange}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-800"
                        />
                    </div>

                    <div className="min-w-[100px]">
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

                    <div className="min-w-[100px]">
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-stone-500 uppercase">Length</label>
                            <span className="text-xs font-mono text-stone-400">{noteDuration.toFixed(2)}s</span>
                        </div>
                        <input 
                            type="range" min="0.05" max="0.5" step="0.01"
                            value={noteDuration} 
                            onChange={handleDurationChange}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-800"
                        />
                    </div>
                </div>
            </div>

            {/* Description Section - Removed bottom link as requested */}
            <div className="mt-12 border-t border-stone-200 pt-8 pb-8">
                {/* 更改：将原先的 flex-col 容器改为 flex-row，并保持 max-w-4xl 约束，以容纳右侧的头像 */}
                <div className="flex flex-row justify-between items-start gap-6 max-w-4xl mx-auto"> 
                    
                    {/* 左侧文字/图标内容块 (flex-1 确保它占据大部分空间) */}
                    <div className="flex-1">
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
                    </div>
                    
                    {/* 右侧头像 (hidden sm:block: 在小屏幕上隐藏，只在足够大的屏幕上显示) */}
                    <div className="shrink-0 hidden sm:block pt-2 flex flex-col items-center">
                        <a href="https://stevereich.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group">
                            <img 
                                src="./icon.jpeg" 
                                alt="Steve Reich Portrait" 
                                className="w-32 h-32 rounded-full object-cover shadow-xl border-4 border-white transition-all group-hover:shadow-2xl group-hover:border-stone-200"
                            />
                            <div className="mt-2 text-sm font-semibold text-stone-700 group-hover:text-blue-600 transition-colors">
                                Steve Reich
                            </div>
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