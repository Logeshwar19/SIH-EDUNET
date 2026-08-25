import React, { useState } from 'react';
import {
  Sparkles,
  GraduationCap,
  Hand,
  Eye,
  CheckCircle2,
  ArrowRight,
  User,
  Mail,
  BookOpen,
  Key,
  ShieldCheck,
  X
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentProfile }) {
  const [authStep, setAuthStep] = useState(currentProfile ? 'profile' : 'login'); // 'login' | 'profile'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('teacher'); // 'teacher' | 'deaf' | 'blind'
  const [subject, setSubject] = useState('Biology & General Science');
  const [teacherIdInput, setTeacherIdInput] = useState('TCH-BIO101');
  const [connectedTeacherId, setConnectedTeacherId] = useState('TCH-BIO101');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    // Simulate instant Google OAuth authentication
    setTimeout(() => {
      const googleEmail = email || 'student.learner@gmail.com';
      const nameGuess = googleEmail.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = nameGuess.charAt(0).toUpperCase() + nameGuess.slice(1);
      setEmail(googleEmail);
      setFullName(formattedName || 'Ananya Sharma');
      setIsSubmitting(false);
      setAuthStep('profile');
    }, 600);
  };

  const handleCompleteProfile = (e) => {
    e.preventDefault();
    const finalTeacherId = selectedRole === 'teacher' 
      ? (teacherIdInput.trim() || 'TCH-PROF1') 
      : (connectedTeacherId.trim() || 'TCH-BIO101');

    const profileData = {
      id: `usr-${Date.now()}`,
      email: email || `${fullName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      name: fullName || 'User',
      role: selectedRole, // 'teacher' | 'deaf' | 'blind'
      subject: selectedRole === 'teacher' ? subject : undefined,
      teacherId: finalTeacherId,
      connectedTeacherId: selectedRole !== 'teacher' ? finalTeacherId : undefined,
      avatar: selectedRole === 'teacher' ? '👩‍🏫' : (selectedRole === 'deaf' ? '🤟' : '🎧'),
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('inclusiveai_user_auth', JSON.stringify(profileData));
    if (selectedRole === 'teacher') {
      localStorage.setItem('inclusiveai_teacher_id', JSON.stringify(finalTeacherId));
      localStorage.setItem('inclusiveai_teacher_name', JSON.stringify(profileData.name));
    }
    
    onAuthSuccess(profileData);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(5, 5, 8, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#121215',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: '28px',
        maxWidth: '480px',
        width: '100%',
        padding: '2rem',
        color: '#ffffff',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8)',
        position: 'relative',
        animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close Button (if updating existing profile) */}
        {currentProfile && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: '#27272a',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a1a1aa',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        )}

        {/* STEP 1: GMAIL / GOOGLE SIGN IN */}
        {authStep === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '16px',
              background: '#27272a',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              color: '#ffffff'
            }}>
              <Sparkles style={{ width: 28, height: 28 }} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
                Welcome to InclusiveAI
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', marginTop: '0.35rem', lineHeight: 1.5 }}>
                Sign in with your Gmail account to access your personalized accessible learning studio.
              </p>
            </div>

            {/* Google / Gmail 1-Click Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1.25rem',
                background: '#ffffff',
                color: '#09090b',
                borderRadius: '14px',
                border: 'none',
                fontSize: '0.9375rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.15s ease'
              }}
            >
              {/* Google G Logo SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isSubmitting ? 'Authenticating...' : 'Continue with Google / Gmail'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
              <span style={{ fontSize: '0.6875rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or Enter Gmail</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleGoogleSignIn(); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#71717a' }} />
                <input
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.875rem' }}
              >
                Sign In & Setup Profile <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: PROFILE CREATION & ROLE SELECTION */}
        {authStep === 'profile' && (
          <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', background: '#27272a', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 800, color: '#34d399', marginBottom: '0.5rem' }}>
                <ShieldCheck style={{ width: 12, height: 12 }} /> Authenticated as {email}
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Choose Your Learning Role
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
                Select your role to access your dedicated studio module.
              </p>
            </div>

            {/* Role Picker Radio Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                {
                  id: 'teacher',
                  title: 'Teacher / Instructor',
                  desc: 'Host live classes, broadcast video, speech-to-sign, upload curriculum.',
                  icon: GraduationCap,
                  badge: 'Teacher Studio'
                },
                {
                  id: 'deaf',
                  title: 'Deaf / HoH Student',
                  desc: 'Live ISL avatar, camera gesture recognition & doubt question AI.',
                  icon: Hand,
                  badge: 'ISL Module'
                },
                {
                  id: 'blind',
                  title: 'Blind / Visually Impaired Student',
                  desc: 'Tactile diagram vibration, audio narration, voice quizzes & dictation.',
                  icon: Eye,
                  badge: 'BVI Module'
                },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '16px',
                      background: isSelected ? '#1c1c22' : '#18181b',
                      border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 16px rgba(255, 255, 255, 0.12)' : 'none'
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      background: isSelected ? '#ffffff' : '#27272a',
                      color: isSelected ? '#09090b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon style={{ width: 20, height: 20 }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ffffff' }}>{r.title}</span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.15rem 0.5rem', background: '#27272a', borderRadius: '999px', color: '#d4d4d8' }}>{r.badge}</span>
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: '#a1a1aa', margin: '0.15rem 0 0 0', lineHeight: 1.35 }}>{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Profile Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '0.25rem' }}>
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Prof. Ananya Sharma or Rohan Patel"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Teacher-Specific Fields */}
              {selectedRole === 'teacher' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '0.25rem' }}>
                      Subject / Department
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Class 10 Biology & Science"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '0.25rem' }}>
                      Custom Teacher ID (Students will connect using this ID)
                    </label>
                    <input
                      type="text"
                      value={teacherIdInput}
                      onChange={(e) => setTeacherIdInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TCH-ANANYA or TCH-BIO101"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              ) : (
                /* Student-Specific Connected Teacher ID Field */
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '0.25rem' }}>
                    Connect to Teacher ID (Enrolled Classroom)
                  </label>
                  <input
                    type="text"
                    value={connectedTeacherId}
                    onChange={(e) => setConnectedTeacherId(e.target.value.toUpperCase())}
                    placeholder="Enter Teacher ID (e.g. TCH-BIO101)"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: '#18181b',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: '#a1a1aa', marginTop: '0.2rem', display: 'block' }}>
                    Your doubts and quiz practice will route directly to this teacher.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                justifyContent: 'center',
                padding: '0.8rem',
                fontSize: '0.875rem',
                marginTop: '0.25rem'
              }}
            >
              <CheckCircle2 style={{ width: 16, height: 16 }} /> Enter {selectedRole === 'teacher' ? 'Teacher Studio' : (selectedRole === 'deaf' ? 'ISL Deaf Module' : 'Tactile Blind Module')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
