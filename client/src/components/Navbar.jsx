import React from 'react';
import {
  GraduationCap,
  Hand,
  Eye,
  Volume2,
  VolumeX,
  Vibrate,
  ChevronDown,
  Radio,
  Square,
  Sparkles,
  Search,
  Bell,
  SlidersHorizontal
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  lessons,
  currentLessonId,
  setCurrentLessonId,
  isAudioMuted,
  setIsAudioMuted,
  hapticsEnabled,
  setHapticsEnabled,
  isLiveLecture,
  onStartLiveLecture,
  onStopLiveLecture,
}) {
  const tabs = [
    { id: 'teacher', label: 'Teacher Studio', icon: GraduationCap, badge: 'Hub' },
    { id: 'deaf', label: 'ISL / Deaf', icon: Hand, badge: 'Live Sign' },
    { id: 'blind', label: 'Blind / BVI', icon: Eye, badge: 'Audio & Tactile' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 12,
      zIndex: 50,
      maxWidth: '82rem',
      margin: '0 auto',
      padding: '0 1rem',
    }}>
      <div style={{
        background: 'rgba(24, 24, 27, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '24px',
        boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.7)',
        padding: '0.625rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        {/* Brand Logo & Tag — Blind & Deaf */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/logo.png"
            alt="Blind & Deaf Logo"
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.03em',
              }}>
                Blind & <span style={{ color: '#e4e4e7' }}>Deaf</span>
              </span>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                padding: '0.15rem 0.45rem',
                background: '#27272a',
                color: '#f4f4f5',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}>
                SIH 2026
              </span>
            </div>
            <p style={{ fontSize: '0.625rem', color: '#a1a1aa', fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              See With Sound • Hear With Signs
            </p>
          </div>
        </div>

        {/* Center Tab Switcher (Monochrome Grey & Black Pill) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: '#121215',
          padding: '0.25rem',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 800 : 600,
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid transparent',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#09090b' : '#a1a1aa',
                  boxShadow: isActive ? '0 4px 16px rgba(255, 255, 255, 0.25)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                <span>{tab.label}</span>
                {tab.id === 'deaf' && isLiveLecture && (
                  <span className="live-dot" style={{ width: 6, height: 6, background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Lesson Select, Controls, Live Status, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Lesson Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={currentLessonId}
              onChange={(e) => setCurrentLessonId(e.target.value)}
              style={{
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '9999px',
                padding: '0.4rem 1.8rem 0.4rem 0.85rem',
                appearance: 'none',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              }}
            >
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id} style={{ background: '#18181b', color: '#ffffff' }}>
                  {lesson.title?.slice(0, 24)}… ({lesson.grade})
                </option>
              ))}
            </select>
            <ChevronDown style={{ width: 13, height: 13, color: '#a1a1aa', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Audio TTS Toggle */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            title="Toggle Voice Reader"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid ' + (isAudioMuted ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.25)'),
              background: isAudioMuted ? '#18181b' : '#27272a',
              color: isAudioMuted ? '#71717a' : '#ffffff',
              fontSize: '0.6875rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {isAudioMuted ? <VolumeX style={{ width: 13, height: 13 }} /> : <Volume2 style={{ width: 13, height: 13 }} />}
            <span>{isAudioMuted ? 'Muted' : 'TTS ON'}</span>
          </button>

          {/* Live Lecture Toggle */}
          {!isLiveLecture ? (
            <button
              onClick={onStartLiveLecture}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.95rem',
                background: '#ffffff',
                color: '#09090b',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)',
              }}
            >
              <Radio style={{ width: 13, height: 13 }} />
              <span>Go Live</span>
            </button>
          ) : (
            <button
              onClick={onStopLiveLecture}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.95rem',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span className="live-dot" />
              <span>LIVE</span>
              <Square style={{ width: 10, height: 10 }} />
            </button>
          )}

          {/* User Profile Avatar Bubble */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.5rem 0.25rem 0.3rem',
            borderRadius: '9999px',
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#27272a',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 800,
            }}>
              M
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#f4f4f5' }}>Michael</span>
          </div>
        </div>
      </div>
    </header>
  );
}
