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
  onOpenAuthModal,
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

        {/* Center: Role Module Indicator Pill */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: '#121215',
          padding: '0.25rem 0.5rem',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {activeRoleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <div
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  background: '#ffffff',
                  color: '#09090b',
                  boxShadow: '0 4px 16px rgba(255, 255, 255, 0.25)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ width: 16, height: 16 }} />
                <span>{tab.label}</span>
                {tab.id === 'deaf' && isLiveLecture && (
                  <span className="live-dot" style={{ width: 6, height: 6, background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                )}
              </div>
            );
          })}

          <button
            onClick={() => onOpenAuthModal && onOpenAuthModal()}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '0.6875rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.3rem 0.6rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.15s'
            }}
            title="Switch Role / Account"
          >
            <RefreshCw style={{ width: 11, height: 11 }} />
            <span>Switch Role</span>
          </button>
        </nav>

        {/* Right Actions: Audio Controls, Live Status, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* Audio TTS Toggle */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            title="Toggle Voice Reader"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid ' + (isAudioMuted ? '#3f3f46' : 'rgba(255, 255, 255, 0.3)'),
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
            <span>{isAudioMuted ? 'Muted' : 'TTS Voice'}</span>
          </button>

          {/* Teacher-Only Live Broadcast Button */}
          {role === 'teacher' && (
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
                <Radio style={{ width: 13, height: 13, color: '#ef4444' }} />
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
            )
          )}

          {/* User Profile Avatar Bubble with Dropdown Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileDropdown(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.25rem 0.65rem 0.25rem 0.35rem',
                borderRadius: '9999px',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                color: '#ffffff'
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#27272a',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 800,
              }}>
                {currentUser?.avatar || (currentUser?.name ? currentUser.name[0] : 'U')}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f4f4f5' }}>
                  {currentUser?.name || 'My Profile'}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#a1a1aa', textTransform: 'capitalize' }}>
                  {role === 'teacher' ? '👩‍🏫 Teacher' : (role === 'deaf' ? '🤟 Deaf' : '🎧 Blind')}
                </div>
              </div>
              <ChevronDown style={{ width: 12, height: 12, color: '#a1a1aa' }} />
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileDropdown && (
              <div style={{
                position: 'absolute',
                top: '115%',
                right: 0,
                width: '240px',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '18px',
                padding: '1rem',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ffffff' }}>{currentUser?.name || 'User Profile'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a1a1aa', wordBreak: 'break-all' }}>{currentUser?.email || 'user@gmail.com'}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', padding: '0.15rem 0.5rem', background: '#27272a', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 700, color: '#34d399' }}>
                    <ShieldCheck style={{ width: 11, height: 11 }} /> {role.toUpperCase()} ROLE
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {role === 'teacher' ? (
                    <div style={{ fontSize: '0.75rem', color: '#d4d4d8' }}>
                      Teacher ID: <strong style={{ fontFamily: 'monospace', color: '#ffffff' }}>{currentUser?.teacherId || 'TCH-BIO101'}</strong>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#d4d4d8' }}>
                      Connected Teacher: <strong style={{ fontFamily: 'monospace', color: '#ffffff' }}>{currentUser?.connectedTeacherId || currentUser?.teacherId || 'TCH-BIO101'}</strong>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      if (onOpenAuthModal) onOpenAuthModal();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '10px',
                      background: '#27272a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: '0.25rem'
                    }}
                  >
                    <RefreshCw style={{ width: 12, height: 12 }} /> Switch Role / Edit Profile
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      if (onLogout) onLogout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <LogOut style={{ width: 12, height: 12 }} /> Log Out / Change Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

