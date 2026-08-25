import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Hand,
  Eye,
  GraduationCap,
  CheckCircle2,
  Zap,
  BookOpen,
  Award,
  TrendingUp,
  Search,
  ShieldCheck,
  Globe,
  Smile,
  Volume2,
  Vibrate,
  ChevronRight
} from 'lucide-react';

export default function HeroLanding({ setActiveTab }) {
  const [emailInput, setEmailInput] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [chartTimeframe, setChartTimeframe] = useState('Weekly');

  const handleStartDemo = (e) => {
    e.preventDefault();
    setActiveTab('teacher');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* ============================================================
         1. HERO HEADER SECTION (Vibrant Purple & Electric Violet Gradient)
         ============================================================ */}
      <div style={{
        background: 'var(--bg-hero-grad)',
        color: '#ffffff',
        position: 'relative',
        paddingBottom: '5rem',
        borderBottomLeftRadius: '48px',
        borderBottomRightRadius: '48px',
        boxShadow: '0 25px 60px -15px rgba(99, 102, 241, 0.35)',
        overflow: 'hidden'
      }}>
        {/* Background Decorative Fluid Wave Orbs */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(124, 58, 237, 0.05) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '5%',
          right: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(99, 102, 241, 0.05) 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 10 }}>
          {/* Top Bar Navigation */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.75rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            {/* Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setActiveTab('landing')}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '14px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)'
              }}>
                <Sparkles style={{ width: 24, height: 24, color: '#7C3AED' }} />
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                Inclusive<span style={{ color: '#F59E0B' }}>AI</span>
              </span>
            </div>

            {/* Nav Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <button onClick={() => setActiveTab('landing')} style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.925rem' }}>Features</button>
              <button onClick={() => setActiveTab('teacher')} style={{ background: 'none', border: 'none', color: '#E0E7FF', fontWeight: 600, cursor: 'pointer', fontSize: '0.925rem' }}>Teacher Studio</button>
              <button onClick={() => setActiveTab('deaf')} style={{ background: 'none', border: 'none', color: '#E0E7FF', fontWeight: 600, cursor: 'pointer', fontSize: '0.925rem' }}>Deaf / ISL</button>
              <button onClick={() => setActiveTab('blind')} style={{ background: 'none', border: 'none', color: '#E0E7FF', fontWeight: 600, cursor: 'pointer', fontSize: '0.925rem' }}>Blind / BVI</button>
              <a href="#pricing" style={{ color: '#E0E7FF', fontWeight: 600, textDecoration: 'none', fontSize: '0.925rem' }}>Pricing</a>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => setActiveTab('auth')} style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.925rem' }}>Log in</button>
              <button onClick={() => setActiveTab('auth')} className="btn-gold">
                Sign up <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </nav>

          {/* Hero Main Content Header */}
          <div style={{ textAlign: 'center', maxWidth: '48rem', margin: '4rem auto 3rem auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '1.5rem'
            }}>
              <Zap style={{ width: 14, height: 14, color: '#F59E0B' }} /> SIH 2026 AI Inclusive Education Platform
            </div>

            <h1 style={{
              fontSize: '3.25rem',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.035em',
              marginBottom: '1.25rem'
            }}>
              All-in-one Access for Every Student
            </h1>

            <p style={{
              fontSize: '1.125rem',
              color: '#E0E7FF',
              lineHeight: 1.6,
              fontWeight: 500,
              marginBottom: '2.25rem'
            }}>
              Upload once. Our AI engine automatically transforms textbook lessons into sign language playback with gesture practice for Deaf students, and narrated audio with haptic diagram exploration for blind students.
            </p>

            {/* Input Action Bar */}
            <form onSubmit={handleStartDemo} style={{
              maxWidth: '32rem',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              borderRadius: '999px',
              padding: '0.4rem 0.5rem 0.4rem 1.25rem',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <input
                type="email"
                placeholder="Input your email or lesson topic..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.925rem',
                  color: '#1E1B4B',
                  fontWeight: 500
                }}
              />
              <button type="submit" className="btn-gold" style={{ padding: '0.65rem 1.4rem' }}>
                Try Demo Now
              </button>
            </form>
          </div>

          {/* ============================================================
             HERO MOCKUP CANVAS (Glassmorphism Dashboard Preview Card)
             ============================================================ */}
          <div style={{
            maxWidth: '64rem',
            margin: '0 auto',
            position: 'relative'
          }}>
            {/* Elevated Mockup Outer Container */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(24px)',
              borderRadius: '32px',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 30px 80px -15px rgba(79, 70, 229, 0.45)',
              padding: '1.75rem',
              color: '#1E1B4B'
            }}>
              {/* Mockup Header Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid #EEF2FF',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>
                    A
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1E1B4B' }}>
                      Hello, Ananya 👋
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                      Grade 10 • Blind & Deaf Accessible Learning Hub
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '999px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    fontSize: '0.8125rem',
                    fontWeight: 800
                  }}>
                    <Award style={{ width: 16, height: 16 }} /> 2,400 XP
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#F1F5F9',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.8125rem',
                    color: '#64748B',
                    fontWeight: 600
                  }}>
                    <Search style={{ width: 14, height: 14 }} /> Search lesson...
                  </div>
                </div>
              </div>

              {/* Mockup Body Content Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column: Today's Lessons & Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '20px',
                    padding: '1.15rem',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E1B4B' }}>Today's Lessons</span>
                      <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 700 }}>2 Active</span>
                    </div>

                    {/* Lesson Item 1 */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      padding: '0.85rem',
                      marginBottom: '0.65rem',
                      border: '1px solid #EEF2FF',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Hand style={{ width: 18, height: 18, color: '#10B981' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#1E1B4B' }}>Biology: Heart Anatomy</h5>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B' }}>ISL Sign Practice • 75% Done</p>
                      </div>
                    </div>

                    {/* Lesson Item 2 */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      padding: '0.85rem',
                      border: '1px solid #EEF2FF',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye style={{ width: 18, height: 18, color: '#3B82F6' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#1E1B4B' }}>Science: Leaf Structure</h5>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B' }}>Haptic Diagram • 40% Done</p>
                      </div>
                    </div>
                  </div>

                  {/* Your Stats Card */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '20px',
                    padding: '1.15rem',
                    border: '1px solid #E2E8F0'
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E1B4B', display: 'block', marginBottom: '0.85rem' }}>
                      Your Performance
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '14px', border: '1px solid #EEF2FF' }}>
                        <span style={{ fontSize: '0.6875rem', color: '#64748B', fontWeight: 700 }}>ISL ACCURACY</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7C3AED' }}>96%</div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '14px', border: '1px solid #EEF2FF' }}>
                        <span style={{ fontSize: '0.6875rem', color: '#64748B', fontWeight: 700 }}>HAPTIC TRACE</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>100%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Learning Activity Chart & Floating Badge */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '1.25rem',
                  border: '1px solid #EEF2FF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1E1B4B' }}>Learning Activity & Mastery</h4>
                      <p style={{ margin: 0, fontSize: '0.725rem', color: '#64748B' }}>Daily multi-modal practice analytics</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {['Daily', 'Weekly', 'Monthly'].map(t => (
                        <button
                          key={t}
                          onClick={() => setChartTimeframe(t)}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.2rem 0.55rem',
                            background: chartTimeframe === t ? '#7C3AED' : '#EEF2FF',
                            color: chartTimeframe === t ? '#ffffff' : '#7C3AED',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG Smooth Area Chart */}
                  <div style={{ width: '100%', height: '140px', position: 'relative' }}>
                    <svg viewBox="0 0 400 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d={
                          chartTimeframe === 'Daily'
                            ? "M 0,100 C 60,70 120,90 180,40 C 240,10 300,50 360,20 C 380,15 390,20 400,18 L 400,140 L 0,140 Z"
                            : chartTimeframe === 'Monthly'
                            ? "M 0,120 C 70,80 140,110 200,60 C 260,20 320,40 370,15 C 390,10 395,12 400,10 L 400,140 L 0,140 Z"
                            : "M 0,110 C 60,90 100,120 160,50 C 220,-10 280,70 340,30 C 370,10 390,25 400,20 L 400,140 L 0,140 Z"
                        }
                        fill="url(#chartGrad)"
                      />
                      {/* Smooth Line */}
                      <path
                        d={
                          chartTimeframe === 'Daily'
                            ? "M 0,100 C 60,70 120,90 180,40 C 240,10 300,50 360,20 C 380,15 390,20 400,18"
                            : chartTimeframe === 'Monthly'
                            ? "M 0,120 C 70,80 140,110 200,60 C 260,20 320,40 370,15 C 390,10 395,12 400,10"
                            : "M 0,110 C 60,90 100,120 160,50 C 220,-10 280,70 340,30 C 370,10 390,25 400,20"
                        }
                        fill="none"
                        stroke="#7C3AED"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Interactive Target Dots */}
                      <circle cx="160" cy="50" r="6" fill="#EC4899" stroke="#ffffff" strokeWidth="2.5" style={{ cursor: 'pointer' }} />
                      <circle cx="340" cy="30" r="6" fill="#10B981" stroke="#ffffff" strokeWidth="2.5" style={{ cursor: 'pointer' }} />
                    </svg>
                  </div>

                  {/* Floating 3D Badge Overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-12px',
                    right: '-12px',
                    background: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '16px',
                    boxShadow: '0 12px 24px -4px rgba(236, 72, 153, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.775rem',
                    fontWeight: 800
                  }}>
                    <CheckCircle2 style={{ width: 18, height: 18 }} />
                    <div>
                      <div style={{ lineHeight: 1.1 }}>100% Target Completed</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.9, fontWeight: 500 }}>Haptic Heart Trace & Voice Quiz</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Logos Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3rem',
            marginTop: '3.5rem',
            opacity: 0.85,
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>coursera</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>edX</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>FutureLearn</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>Udemy</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>UNESCO</span>
          </div>
        </div>
      </div>

      {/* ============================================================
         2. FEATURE SHOWCASE SECTION ("Monitor Your Learning Process")
         ============================================================ */}
      <section style={{ padding: '6rem 1.5rem', maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '42rem', margin: '0 auto 4rem auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E1B4B', marginBottom: '1rem' }}>
            Monitor Your Learning Process
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.6, fontWeight: 500 }}>
            Upload a single classroom PDF or lesson text once. Our core AI Content Engine automatically generates accessible sign and audio-haptic experiences.
          </p>
        </div>

        {/* 3 Grid Feature Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Card 1 */}
          <div className="ref-card" style={{ padding: '2rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <BookOpen style={{ width: 26, height: 26, color: '#7C3AED' }} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E1B4B', marginBottom: '0.75rem' }}>
              Upload Once AI Engine
            </h3>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Extracts PDF text, identifies core scientific concepts, maps diagrams to touch coordinates, and structures quizzes in one pass.
            </p>
            <button onClick={() => setActiveTab('teacher')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              Launch Teacher Studio <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Card 2 */}
          <div className="ref-card" style={{ padding: '2rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Hand style={{ width: 26, height: 26, color: '#10B981' }} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E1B4B', marginBottom: '0.75rem' }}>
              Deaf & HoH ISL Module
            </h3>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Indian Sign Language video playback combined with live MediaPipe 21-landmark hand camera practice and accuracy scoring.
            </p>
            <button onClick={() => setActiveTab('deaf')} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              Try Sign Practice <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Card 3 */}
          <div className="ref-card" style={{ padding: '2rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Eye style={{ width: 26, height: 26, color: '#3B82F6' }} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E1B4B', marginBottom: '0.75rem' }}>
              Blind Audio & Haptic Module
            </h3>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Web Speech TTS narration paired with touch-vibration diagram tracing so blind students can feel anatomical outlines spatially.
            </p>
            <button onClick={() => setActiveTab('blind')} style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              Explore Haptic Diagram <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
         3. PRICING / ACCESSIBILITY TIERS SECTION ("Price For All Your Needs")
         ============================================================ */}
      <section id="pricing" style={{ padding: '4rem 1.5rem 6rem 1.5rem', background: '#ffffff', borderTop: '1px solid #EEF2FF' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '36rem', margin: '0 auto 3rem auto' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E1B4B', marginBottom: '0.75rem' }}>
              Price For All Your Needs
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748B', fontWeight: 500 }}>
              Flexible options for individual students, inclusive classrooms, and educational institutions.
            </p>

            {/* Toggle Switch */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '0.3rem',
              borderRadius: '999px',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
                  color: billingCycle === 'monthly' ? '#1E1B4B' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: billingCycle === 'annual' ? '#7C3AED' : 'transparent',
                  color: billingCycle === 'annual' ? '#ffffff' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: billingCycle === 'annual' ? '0 2px 8px rgba(124,58,237,0.3)' : 'none'
                }}
              >
                Annual (Save 20%)
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', maxWidth: '54rem', margin: '0 auto' }}>
            {/* Beginner Card */}
            <div className="ref-card" style={{ padding: '2.25rem', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748B' }}>Beginner / Student</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '1rem 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: '#1E1B4B' }}>$0</span>
                <span style={{ color: '#64748B', fontWeight: 600 }}>/ forever free</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.75rem' }}>
                Ideal for individual Deaf and blind students accessing public classroom material.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                {['Unlimited Lesson Access', 'ISL Video Dictionary Playback', 'Web Speech TTS Audio', 'Touch Vibration Haptic Diagram'].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: '#10B981' }} /> {item}
                  </div>
                ))}
              </div>

              <button onClick={() => setActiveTab('deaf')} className="btn-white" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started Free
              </button>
            </div>

            {/* Pro / Institution Card */}
            <div className="ref-card" style={{ padding: '2.25rem', border: '2px solid #7C3AED', background: 'linear-gradient(180deg, #ffffff 0%, #EEF2FF 100%)', boxShadow: '0 20px 45px -10px rgba(124, 58, 237, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#7C3AED' }}>Institution / School</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', background: '#F59E0B', color: '#ffffff', borderRadius: '999px' }}>POPULAR CHOICE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '1rem 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: '#1E1B4B' }}>{billingCycle === 'annual' ? '$40' : '$50'}</span>
                <span style={{ color: '#64748B', fontWeight: 600 }}>/ month per school</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.75rem' }}>
                Full teacher studio upload engine with live MediaPipe sign recognition and classroom analytics.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                {[
                  'PDF / Textbook Auto-Extractor',
                  'MediaPipe 21-Landmark Gesture Evaluator',
                  'Live Classroom Broadcast Sync',
                  'Teacher Progress & Inbox Analytics',
                  'Custom ISL Dictionary Mapping'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: '#1E1B4B', fontWeight: 700 }}>
                    <CheckCircle2 style={{ width: 18, height: 18, color: '#7C3AED' }} /> {item}
                  </div>
                ))}
              </div>

              <button onClick={() => setActiveTab('teacher')} className="btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                Choose School Plan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
         4. CALL TO ACTION BANNER ("Ready to Jump In?")
         ============================================================ */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #4F46E5 100%)',
          borderRadius: '32px',
          padding: '3.5rem 2.5rem',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.4)',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Inner Light Glow Effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ maxWidth: '32rem', position: 'relative', zIndex: 10 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', lineHeight: 1.2 }}>
              Ready to Jump In?
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#E0E7FF', lineHeight: 1.6, fontWeight: 500 }}>
              Start transforming textbook content into inclusive sign language and audio-haptic lessons in seconds.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
            <button onClick={() => setActiveTab('teacher')} className="btn-gold" style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}>
              Launch Teacher Studio <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
            <button onClick={() => setActiveTab('deaf')} className="btn-white" style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}>
              Try Deaf Practice
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
         5. SLEEK DARK FOOTER
         ============================================================ */}
      <footer style={{ background: '#0F172A', color: '#94A3B8', padding: '4rem 1.5rem 2.5rem 1.5rem', borderTop: '1px solid #1E293B' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3.5rem' }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Sparkles style={{ width: 20, height: 20 }} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>InclusiveAI</span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#94A3B8' }}>
              AI-Powered Inclusive Education Platform — Upload Once, Learn Without Barriers.
            </p>
          </div>

          {/* Column 1 */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <button onClick={() => setActiveTab('teacher')} style={{ background: 'none', border: 'none', color: '#94A3B8', textAlign: 'left', cursor: 'pointer' }}>Teacher Studio</button>
              <button onClick={() => setActiveTab('deaf')} style={{ background: 'none', border: 'none', color: '#94A3B8', textAlign: 'left', cursor: 'pointer' }}>Deaf & HoH Module</button>
              <button onClick={() => setActiveTab('blind')} style={{ background: 'none', border: 'none', color: '#94A3B8', textAlign: 'left', cursor: 'pointer' }}>Blind & BVI Module</button>
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}>Resources</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <a href="#pricing" style={{ color: '#94A3B8', textDecoration: 'none' }}>Documentation</a>
              <a href="#pricing" style={{ color: '#94A3B8', textDecoration: 'none' }}>ISL Dictionary</a>
              <a href="#pricing" style={{ color: '#94A3B8', textDecoration: 'none' }}>Haptic Guidelines</a>
            </div>
          </div>

          {/* Column 3 */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}>SIH 2026</h4>
            <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.6 }}>
              Built for Smart India Hackathon 2026 inclusive education challenges.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '80rem', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: '#64748B', flexWrap: 'wrap', gap: '1rem' }}>
          <div>Copyright © 2026 InclusiveAI. All Rights Reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Accessibility Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
