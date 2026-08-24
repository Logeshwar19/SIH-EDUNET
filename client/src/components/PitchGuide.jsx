import React, { useState } from 'react';
import { 
  Layers, 
  Volume2, 
  Copy, 
  Check, 
  ShieldCheck
} from 'lucide-react';

export default function PitchGuide() {
  const [copied, setCopied] = useState(false);

  const pitchText = "Adapting a single lesson for deaf and blind students usually requires hours of manual work. With InclusiveAI, a teacher uploads a lesson file once. The platform automatically generates Indian Sign Language videos for deaf students and audio lessons with tactile touchscreen diagrams for blind students. Upload once so every student can learn.";

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSpeakPitch = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(pitchText);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn text-[#111827] font-sans">
      {/* Elevator Pitch Hero */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-[#111827]" aria-hidden="true" />
            Executive Overview
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakPitch}
              className="apple-button-primary flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-900"
              aria-label="Listen to spoken audio elevator pitch"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              Listen to Pitch
            </button>
            <button
              onClick={handleCopyPitch}
              className="apple-button-secondary flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-900"
              aria-label={copied ? "Pitch copied to clipboard" : "Copy pitch text to clipboard"}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-zinc-900" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>{copied ? 'Copied' : 'Copy Pitch'}</span>
            </button>
          </div>
        </div>

        <blockquote className="text-base sm:text-lg font-medium text-zinc-900 leading-relaxed italic border-l-2 border-zinc-900 pl-4 py-1">
          "{pitchText}"
        </blockquote>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-zinc-900"></div>
            <span className="text-zinc-700"><strong>Upload Once:</strong> PDF, TXT, or notes</span>
          </div>
          <div className="bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-zinc-900"></div>
            <span className="text-zinc-700"><strong>Deaf Students:</strong> ISL Video and gesture feedback</span>
          </div>
          <div className="bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-zinc-900"></div>
            <span className="text-zinc-700"><strong>Blind Students:</strong> Tactile diagrams and audio</span>
          </div>
        </div>
      </div>

      {/* Structured Presentation Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            1. Problem
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Inaccessible Learning Materials</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Adapting lessons into accessible formats takes significant time. Deaf and blind students often lack access to interactive study materials.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            2. Solution
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Automated Accessible Content</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            A single lesson upload automatically creates sign language videos, practice tools, audio narrations, and tactile touchscreen diagrams.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            3. Workflow
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">How It Works</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Teacher Uploads File to Text Extraction, Content Processing, ISL and Tactile Output, to Student Portals.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            4. Deaf Module
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Sign Language and Gesture Practice</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Includes sign language videos, real-time camera gesture feedback, scoring, and a sign-to-text messaging tool for teachers.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            5. Blind Module
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Audio Narrations and Voice Control</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Provides spoken lesson narrations, hands-free voice commands, and spoken quizzes with instant feedback.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            6. Haptic Innovation
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Tactile Screen Diagrams</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Vibrations mark diagram outlines on touchscreen devices. Touching specific regions plays spoken descriptions.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            7. AI Engine
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Core Processing Engine</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Processes document text, structures key concepts, generates quizzes, and defines tactile coordinates.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            8. Teacher Studio
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Dashboard and Analytics</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Teachers can upload materials, monitor student progress, review quiz results, and read student messages.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <span className="text-xs font-mono font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
            9. Technology Stack
          </span>
          <h4 className="text-sm font-semibold text-zinc-900">Built With</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            React, Node.js Express, MediaPipe Hands, HTML5 Canvas, Web Vibration API, and Web Speech API.
          </p>
        </div>
      </div>

      {/* Real-Life Example Walkthrough Card */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-zinc-900" aria-hidden="true" />
          Example: Grade 10 Human Heart Lesson
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-700">
          <div className="p-4 rounded-xl bg-white border border-zinc-200/80 space-y-2 shadow-sm">
            <strong className="text-zinc-900 block">1. Teacher Upload:</strong>
            <p>The teacher uploads <code className="text-zinc-800 font-mono bg-zinc-100 px-1 py-0.5 rounded">Class10_Heart.pdf</code> with lesson text and a diagram.</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-zinc-200/80 space-y-2 shadow-sm">
            <strong className="text-zinc-900 block">2. Deaf Student:</strong>
            <p>Views sign videos for Heart, Pump, and Oxygen, then practices gestures using the camera.</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-zinc-200/80 space-y-2 shadow-sm">
            <strong className="text-zinc-900 block">3. Blind Student:</strong>
            <p>Listens to the audio lesson, explores the heart diagram using vibration feedback, and answers voice quiz questions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
