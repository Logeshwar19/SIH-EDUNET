import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Hand,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { convertTextToISLSequence, ISL_WORD_DICTIONARY } from '../services/signDictionary.js';

export default function SignVisualizer({
  text = '',
  tokens = null,
  autoPlay = true,
  speed = 1.0,
}) {
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(speed);
  const timerRef = useRef(null);

  // Update sequence whenever text or tokens change
  useEffect(() => {
    if (tokens && tokens.length > 0) {
      const seq = tokens.map(t => {
        const key = typeof t === 'string' ? t.toUpperCase() : (t.word || t.token || '').toUpperCase();
        return ISL_WORD_DICTIONARY[key] || {
          type: 'word',
          token: key,
          gloss: key,
          description: `Indian Sign Language gesture for "${key}"`,
          icon: '✋',
          category: 'Curriculum',
          steps: ['Position hands at chest height', 'Perform sign gesture with appropriate movement']
        };
      });
      setSequence(seq);
      setCurrentIndex(0);
    } else if (text) {
      const seq = convertTextToISLSequence(text);
      setSequence(seq);
      setCurrentIndex(0);
    }
  }, [text, tokens]);

  // Autoplay sequencer
  useEffect(() => {
    if (isPlaying && sequence.length > 0) {
      const duration = (sequence[currentIndex]?.type === 'letter' ? 1200 : 2400) / playbackSpeed;
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % sequence.length);
      }, duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentIndex, sequence, playbackSpeed]);

  const currentSign = sequence[currentIndex] || {
    token: 'READY',
    gloss: 'READY',
    description: 'Awaiting speech or text input to render Indian Sign Language.',
    icon: '👋',
    steps: ['Standing by for lecture speech or student doubt']
  };

  return (
    <div style={{
      background: '#18181b',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      borderRadius: '24px',
      boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.7)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '10px',
            background: '#27272a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white'
          }}>
            <Hand style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Live ISL Visual Sign Language Player
            </h3>
            <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: 0 }}>
              Real-time Indian Sign Language motion synthesis & hand visualization
            </p>
          </div>
        </div>

        {/* Speed Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#121215', padding: '0.2rem 0.4rem', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {[0.5, 1.0, 1.5, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                border: 'none',
                background: playbackSpeed === s ? '#ffffff' : 'transparent',
                color: playbackSpeed === s ? '#09090b' : '#a1a1aa',
                fontSize: '0.6875rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Visual Display Stage */}
      <div style={{
        minHeight: '260px',
        background: '#121215',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        textAlign: 'center',
      }}>
        {/* Sign Icon & Large Motion Display */}
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: '#18181b',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          marginBottom: '0.75rem',
          animation: isPlaying ? 'pulse 1.8s infinite' : 'none',
        }}>
          {currentSign.icon || currentSign.emoji || '✋'}
        </div>

        {/* Current Word or Letter Token */}
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 0.85rem',
          borderRadius: '999px',
          background: '#ffffff',
          color: '#09090b',
          fontSize: '0.75rem',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.35rem',
          fontFamily: 'var(--font-mono)',
        }}>
          {currentSign.type === 'letter' ? `FINGERSPELLING: ${currentSign.token}` : (currentSign.gloss || currentSign.token)}
        </div>

        {/* Spatial Description / How to Sign */}
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e4e4e7', maxWidth: '32rem', margin: '0.35rem 0 0 0', lineHeight: 1.5 }}>
          {currentSign.description}
        </p>

        {/* Step-by-step bullets */}
        {currentSign.steps && currentSign.steps.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {currentSign.steps.map((step, idx) => (
              <span key={idx} style={{
                fontSize: '0.6875rem',
                background: '#27272a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.2rem 0.5rem',
                color: '#d4d4d8',
                fontWeight: 600,
              }}>
                {idx + 1}. {step}
              </span>
            ))}
          </div>
        )}

        {/* Playback Controls Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#18181b',
          padding: '0.3rem 0.75rem',
          borderRadius: '999px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sequence.length - 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center' }}
            title="Previous Sign"
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#ffffff',
              color: '#09090b',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPlaying ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14, marginLeft: 2 }} />}
          </button>

          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % sequence.length)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center' }}
            title="Next Sign"
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>

          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#a1a1aa', fontFamily: 'var(--font-mono)', marginLeft: '0.25rem' }}>
            {sequence.length > 0 ? `${currentIndex + 1}/${sequence.length}` : '0/0'}
          </span>
        </div>
      </div>

      {/* Horizontal Sequence Strip */}
      {sequence.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          padding: '0.5rem 0.25rem',
          scrollbarWidth: 'none',
        }}>
          {sequence.map((item, idx) => {
            const isActive = currentIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsPlaying(false);
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '12px',
                  background: isActive ? '#ffffff' : '#121215',
                  color: isActive ? '#09090b' : '#a1a1aa',
                  border: isActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 14px rgba(255, 255, 255, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.token}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
