import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Sun, 
  ZapOff, 
  Target, 
  RotateCcw,
  Sliders
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  textSize: 'normal', // 'normal', 'large', 'xlarge'
  highContrast: false,
  reducedMotion: false,
  enhancedFocus: false,
};

export default function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('inclusiveai_a11y_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const triggerButtonRef = useRef(null);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Sync settings with DOM classNames & localStorage
  useEffect(() => {
    try {
      localStorage.setItem('inclusiveai_a11y_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn("Could not save accessibility settings:", e);
    }

    const html = document.documentElement;

    // Text size classes
    html.classList.remove('a11y-text-large', 'a11y-text-xlarge');
    if (settings.textSize === 'large') html.classList.add('a11y-text-large');
    if (settings.textSize === 'xlarge') html.classList.add('a11y-text-xlarge');

    // High contrast class
    if (settings.highContrast) {
      html.classList.add('a11y-high-contrast');
    } else {
      html.classList.remove('a11y-high-contrast');
    }

    // Reduced motion class
    if (settings.reducedMotion) {
      html.classList.add('a11y-reduced-motion');
    } else {
      html.classList.remove('a11y-reduced-motion');
    }

    // Enhanced focus class
    if (settings.enhancedFocus) {
      html.classList.add('a11y-enhanced-focus');
    } else {
      html.classList.remove('a11y-enhanced-focus');
    }
  }, [settings]);

  // Focus management & Escape key listener
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 50);
  };

  const handleIncreaseText = () => {
    setSettings(prev => ({
      ...prev,
      textSize: prev.textSize === 'normal' ? 'large' : 'xlarge'
    }));
  };

  const handleDecreaseText = () => {
    setSettings(prev => ({
      ...prev,
      textSize: prev.textSize === 'xlarge' ? 'large' : 'normal'
    }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const toggleReducedMotion = () => {
    setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  };

  const toggleEnhancedFocus = () => {
    setSettings(prev => ({ ...prev, enhancedFocus: !prev.enhancedFocus }));
  };

  const resetAllSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <>
      {/* Floating Accessibility Trigger Button */}
      <button
        ref={triggerButtonRef}
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 40,
          width: 48, height: 48, borderRadius: '50%',
          background: '#18181b',
          color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 1px 0 rgba(255,255,255,0.15) inset',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        aria-label="Open Accessibility Controls Panel"
        aria-expanded={isOpen}
      >
        <Sliders style={{ width: 20, height: 20 }} aria-hidden="true" />
        <span className="sr-only">Accessibility Settings</span>
      </button>

      {/* Accessibility Dialog Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
          onClick={handleClose}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 backdrop-blur-2xl animate-fadeIn max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-panel-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
                  <Sliders className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="a11y-panel-title" className="text-base font-bold text-zinc-900">
                    Accessibility Controls
                  </h2>
                  <p className="text-xs text-zinc-500">Customize view preferences</p>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900"
                aria-label="Close accessibility controls"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Controls List */}
            <div className="space-y-4 text-xs">
              {/* 1. Text Size Control */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-zinc-700" aria-hidden="true" />
                    Text Size
                  </span>
                  <span className="font-mono text-zinc-600 capitalize font-medium">
                    {settings.textSize === 'normal' && '100% (Default)'}
                    {settings.textSize === 'large' && '115% (Large)'}
                    {settings.textSize === 'xlarge' && '130% (Extra Large)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDecreaseText}
                    disabled={settings.textSize === 'normal'}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      settings.textSize === 'normal'
                        ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                        : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50 shadow-sm'
                    }`}
                    aria-label="Decrease text size"
                  >
                    <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Smaller</span>
                  </button>

                  <button
                    onClick={handleIncreaseText}
                    disabled={settings.textSize === 'xlarge'}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      settings.textSize === 'xlarge'
                        ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                        : 'bg-zinc-900 text-white border-zinc-900 hover:bg-black shadow-sm'
                    }`}
                    aria-label="Increase text size"
                  >
                    <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Larger</span>
                  </button>
                </div>
              </div>

              {/* 2. High Contrast Mode */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-zinc-700" aria-hidden="true" />
                    High Contrast
                  </span>
                  <p className="text-[11px] text-zinc-500">Boosts element contrast</p>
                </div>

                <button
                  onClick={toggleHighContrast}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    settings.highContrast
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                  aria-pressed={settings.highContrast}
                  aria-label="Toggle high contrast mode"
                >
                  {settings.highContrast ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 3. Reduce Animations */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 flex items-center gap-2">
                    <ZapOff className="w-4 h-4 text-zinc-700" aria-hidden="true" />
                    Reduce Motion
                  </span>
                  <p className="text-[11px] text-zinc-500">Disables non-essential animations</p>
                </div>

                <button
                  onClick={toggleReducedMotion}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    settings.reducedMotion
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                  aria-pressed={settings.reducedMotion}
                  aria-label="Toggle reduced motion"
                >
                  {settings.reducedMotion ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 4. Improved Focus Visibility */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-zinc-700" aria-hidden="true" />
                    Enhanced Focus
                  </span>
                  <p className="text-[11px] text-zinc-500">Highlights active keyboard focus</p>
                </div>

                <button
                  onClick={toggleEnhancedFocus}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    settings.enhancedFocus
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                  aria-pressed={settings.enhancedFocus}
                  aria-label="Toggle enhanced focus indicator"
                >
                  {settings.enhancedFocus ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Footer Reset */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <button
                onClick={resetAllSettings}
                className="text-zinc-500 hover:text-zinc-900 font-medium flex items-center gap-1.5 underline transition-colors"
                aria-label="Reset all accessibility preferences to default"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset Defaults
              </button>

              <button
                onClick={handleClose}
                className="apple-button-primary"
              >
                Apply and Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
