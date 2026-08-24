import React, { useState } from 'react';
import { 
  Cpu, 
  Code2
} from 'lucide-react';

export default function AIEngineVisualizer({ lesson }) {
  const [activeJsonTab, setActiveJsonTab] = useState('full');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn text-zinc-900 font-sans">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-zinc-900" />
            AI Processing Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight leading-tight">
            AI Content Engine Architecture
          </h2>
          <p className="text-sm text-zinc-600 max-w-3xl leading-relaxed">
            A single processing pipeline reads lesson files and generates sign language videos, audio lessons, and tactile diagram data.
          </p>
        </div>
      </div>

      {/* 4-Step Pipeline Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
            01
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">Document Processing</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Extracts text and diagram data from uploaded documents.
          </p>
          <div className="text-[11px] font-mono text-zinc-700 bg-zinc-100/90 p-2.5 rounded-xl border border-zinc-200/80">
            Output: Structured text and layout geometry
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
            02
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">Content Structuring</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Organizes text into key concepts and generates quiz questions.
          </p>
          <div className="text-[11px] font-mono text-zinc-700 bg-zinc-100/90 p-2.5 rounded-xl border border-zinc-200/80">
            Output: Key concepts and questions
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
            03
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">ISL Mapping</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Maps vocabulary to Indian Sign Language glosses and gesture targets.
          </p>
          <div className="text-[11px] font-mono text-zinc-700 bg-zinc-100/90 p-2.5 rounded-xl border border-zinc-200/80">
            Output: ISL glosses and target poses
          </div>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
            04
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">Tactile and Audio Generation</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Converts diagram lines into vibration boundaries and creates audio explanations.
          </p>
          <div className="text-[11px] font-mono text-zinc-700 bg-zinc-100/90 p-2.5 rounded-xl border border-zinc-200/80">
            Output: Tactile paths and audio points
          </div>
        </div>
      </div>

      {/* Synthesized JSON Inspection Inspector */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-zinc-900" />
            <div>
              <h3 className="text-base font-bold text-zinc-900">Generated Lesson Data</h3>
              <p className="text-xs text-zinc-500">Data generated for {lesson.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100/80 rounded-xl border border-zinc-200/80 text-xs font-mono" role="tablist" aria-label="Generated payload format tabs">
            <button
              role="tab"
              aria-selected={activeJsonTab === 'full'}
              onClick={() => setActiveJsonTab('full')}
              className={`px-3 py-1 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                activeJsonTab === 'full' ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-zinc-200/60' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Full Data
            </button>
            <button
              role="tab"
              aria-selected={activeJsonTab === 'isl'}
              onClick={() => setActiveJsonTab('isl')}
              className={`px-3 py-1 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                activeJsonTab === 'isl' ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-zinc-200/60' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              ISL Data
            </button>
            <button
              role="tab"
              aria-selected={activeJsonTab === 'bvi'}
              onClick={() => setActiveJsonTab('bvi')}
              className={`px-3 py-1 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                activeJsonTab === 'bvi' ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-zinc-200/60' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Tactile Data
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 max-h-[460px] overflow-y-auto font-mono text-xs text-zinc-200 shadow-sm">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(
              activeJsonTab === 'full' 
                ? lesson 
                : activeJsonTab === 'isl' 
                ? lesson.islModule 
                : lesson.bviModule,
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
