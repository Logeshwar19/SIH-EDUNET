import React, { useState } from 'react';
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
  SlidersHorizontal,
  Home,
  User,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Key
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
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const role = currentUser?.role || 'teacher';

  const allTabs = [
    { id: 'teacher', label: 'Teacher Studio', icon: GraduationCap, badge: 'Host Hub', role: 'teacher' },
    { id: 'deaf', label: 'ISL Deaf Module', icon: Hand, badge: 'Live Sign', role: 'deaf' },
    { id: 'blind', label: 'Blind / BVI Module', icon: Eye, badge: 'Audio & Tactile', role: 'blind' },
  ];

  // Restrict visible tabs to current user's role
  const activeRoleTabs = allTabs.filter(t => t.role === role);

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
        background: 'rgba(24, 24, 27, 0.94)',
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
        position: 'relative'
      }}>
        {/* Brand Logo & Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <Sparkles style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.03em',
              }}>
                Inclusive<span style={{ color: '#e4e4e7' }}>AI</span>
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

        {/* Center Active Role Badge (Strict RBAC - Shows Only the Logged-in User's Portal) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#121215',
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}>
          {currentUser?.role === 'teacher' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <GraduationCap style={{ width: 16, height: 16, color: '#3b82f6' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                Teacher Studio
              </span>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.45rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderRadius: '999px' }}>
                Educator Access
              </span>
            </div>
          )}

          {currentUser?.role === 'deaf_student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Hand style={{ width: 16, height: 16, color: '#a855f7' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                Deaf / ISL Module
              </span>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.45rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', borderRadius: '999px' }}>
                Visual Sign AI
              </span>
              {isLiveLecture && (
                <span className="live-dot" style={{ width: 6, height: 6, background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
              )}
            </div>
          )}

          {currentUser?.role === 'blind_student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Eye style={{ width: 16, height: 16, color: '#10b981' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                Blind / BVI Module
              </span>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.45rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '999px' }}>
                Audio & Tactile
              </span>
            </div>
          )}

          {!currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Sparkles style={{ width: 14, height: 14, color: '#f59e0b' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa' }}>
                Please Sign In
              </span>
            </div>
          )}
        </div>

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
              {lessons.length === 0 ? (
                <option value="" style={{ background: '#18181b', color: '#a1a1aa' }}>
                  No Lessons Uploaded
                </option>
              ) : (
                lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id} style={{ background: '#18181b', color: '#ffffff' }}>
                    {lesson.title?.slice(0, 24)}… ({lesson.grade})
                  </option>
                ))
              )}
            </select>
            <ChevronDown style={{ width: 13, height: 13, color: '#a1a1aa', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Audio TTS Toggle (Blind Student Only) */}
          {currentUser?.role === 'blind_student' && (
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              title="Toggle Voice Reader"
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid ' + (isAudioMuted ? 'rgba(255, 255, 255, 0.15)' : '#10b981'),
                background: isAudioMuted ? '#18181b' : 'rgba(16, 185, 129, 0.15)',
                color: isAudioMuted ? '#a1a1aa' : '#34d399',
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
          )}

          {/* Teacher Broadcast Go Live Button (Teacher Only) */}
          {currentUser?.role === 'teacher' && (
            !isLiveLecture ? (
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
                <span>END LECTURE</span>
                <Square style={{ width: 10, height: 10 }} />
              </button>
            )
          )}

          {/* User Profile Avatar Bubble & Login Switcher */}
          <div
            onClick={onOpenAuth}
            title="Click to Switch Portal or Change User"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.65rem 0.25rem 0.35rem',
              borderRadius: '9999px',
              background: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: currentUser?.role === 'teacher' ? '#3b82f6' : currentUser?.role === 'deaf_student' ? '#a855f7' : currentUser?.role === 'blind_student' ? '#10b981' : '#27272a',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}>
              {currentUser?.avatar || (currentUser?.name ? currentUser.name[0] : '👤')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f4f4f5' }}>
                {currentUser?.name ? currentUser.name.split(' ')[0] : 'Sign In'}
              </span>
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'capitalize' }}>
                {currentUser?.role ? currentUser.role.replace('_', ' ') : 'Select Role'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

