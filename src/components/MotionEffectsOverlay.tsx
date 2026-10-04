import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Sparkles, Eye, EyeOff } from 'lucide-react';

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export const MotionEffectsOverlay: React.FC = () => {
  const [hasMouse, setHasMouse] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const [motionEnabled, setMotionEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return false;
      const saved = localStorage.getItem('nexovira_motion_effects');
      return saved !== 'disabled';
    }
    return true;
  });

  // Canvas ref for ambient particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Direct DOM cursor aura refs (avoids React state re-rendering on mousemove)
  const auraRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  // Coordinates for smooth lerp
  const mousePos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const animFrameId = useRef<number | null>(null);

  // Check pointer device support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
      setHasMouse(mq.matches);

      const handler = (e: MediaQueryListEvent) => setHasMouse(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  // Scroll Progress Tracking (passive, high performance)
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = Math.min(Math.max(window.scrollY / totalScroll, 0), 1);
        setScrollProgress(currentProgress);
        setShowScrollTop(window.scrollY > 380);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mouse Move & Click Ripple Listener
  useEffect(() => {
    if (!hasMouse || !motionEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        dotRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (auraRef.current) auraRef.current.style.opacity = '0';
      if (dotRef.current) dotRef.current.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      if (auraRef.current) auraRef.current.style.opacity = '1';
      if (dotRef.current) dotRef.current.style.opacity = '1';
    };

    const handleClick = (e: MouseEvent) => {
      const newRipple: ClickRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setRipples((prev) => [...prev.slice(-4), newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 750);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('click', handleClick, { passive: true });

    // Smooth Lerp Animation Loop for Aura
    const renderLoop = () => {
      // Linear interpolation (lerp) for smooth trailing
      const ease = 0.14;
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * ease;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('click', handleClick);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [hasMouse, motionEnabled]);

  // Ambient Floating Background Particle Canvas
  useEffect(() => {
    if (!motionEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create 32 particles
    const particleCount = Math.min(36, Math.floor(width / 40));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.4 - 0.15,
      alpha: Math.random() * 0.4 + 0.15,
      color: Math.random() > 0.5 ? '23, 105, 255' : '0, 166, 166',
    }));

    let particleAnimId: number;

    const animateParticles = () => {
      if (document.hidden) {
        particleAnimId = requestAnimationFrame(animateParticles);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw subtle connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Update position
        p1.x += p1.speedX;
        p1.y += p1.speedY;

        // Subtle reaction to mouse
        if (hasMouse && mousePos.current.x > 0) {
          const dx = p1.x - mousePos.current.x;
          const dy = p1.y - mousePos.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            p1.x += (dx / dist) * force * 0.8;
            p1.y += (dy / dist) * force * 0.8;
          }
        }

        // Wrap around boundaries
        if (p1.y < -10) p1.y = height + 10;
        if (p1.y > height + 10) p1.y = -10;
        if (p1.x < -10) p1.x = width + 10;
        if (p1.x > width + 10) p1.x = -10;

        // Render particle
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p1.color}, ${p1.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${p1.color}, 0.5)`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p1.color}, ${0.08 * (1 - dist / 90)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      particleAnimId = requestAnimationFrame(animateParticles);
    };

    particleAnimId = requestAnimationFrame(animateParticles);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(particleAnimId);
    };
  }, [hasMouse, motionEnabled]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMotion = () => {
    const next = !motionEnabled;
    setMotionEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexovira_motion_effects', next ? 'enabled' : 'disabled');
    }
  };

  return (
    <>
      {/* 1. Ultra-sleek Scroll Progress Glow Bar */}
      <div 
        className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none transition-transform duration-75 ease-out"
        style={{
          transform: `scaleX(${scrollProgress})`,
          transformOrigin: 'left',
        }}
      >
        <div className="w-full h-full scroll-glow-beam" />
      </div>

      {/* 2. Floating Ambient Background Canvas */}
      {motionEnabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-[1] opacity-50 dark:opacity-65"
          style={{ willChange: 'transform' }}
        />
      )}

      {/* 3. Smooth Interactive Glowing Cursor Aura (Desktop Only) */}
      {hasMouse && motionEnabled && (
        <>
          {/* Outer Ambient Glow Aura */}
          <div
            ref={auraRef}
            className="fixed top-0 left-0 pointer-events-none z-30 transition-opacity duration-300"
            style={{
              width: '320px',
              height: '320px',
              marginLeft: '-160px',
              marginTop: '-160px',
              background: 'radial-gradient(circle, rgba(0, 166, 166, 0.13) 0%, rgba(23, 105, 255, 0.07) 40%, rgba(0, 0, 0, 0) 70%)',
              borderRadius: '50%',
              willChange: 'transform',
            }}
          />

          {/* Inner Sharp Precision Tracer Dot */}
          <div
            ref={dotRef}
            className="fixed top-0 left-0 pointer-events-none z-40 transition-opacity duration-150"
            style={{
              width: '8px',
              height: '8px',
              marginLeft: '-4px',
              marginTop: '-4px',
              borderRadius: '50%',
              backgroundColor: '#00A6A6',
              boxShadow: '0 0 10px #00A6A6, 0 0 20px #1769FF',
              willChange: 'transform',
            }}
          />
        </>
      )}

      {/* 4. Click Burst Ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none z-50 rounded-full border border-cyan-400/80"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: '40px',
            height: '40px',
            animation: 'rippleWave 0.75s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
            boxShadow: '0 0 15px rgba(0, 166, 166, 0.5), inset 0 0 10px rgba(23, 105, 255, 0.4)',
          }}
        />
      ))}

      {/* 5. Scroll-to-Top Floating Action Button with Animated Glow */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          {/* Motion Toggle Button */}
          <button
            type="button"
            onClick={toggleMotion}
            className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700/80 backdrop-blur-md shadow-lg transition-all duration-200 cursor-pointer hidden sm:flex items-center justify-center motion-btn-pop"
            title={motionEnabled ? "Disable UI Motion & Particle FX" : "Enable UI Motion & Particle FX"}
            aria-label="Toggle motion effects"
          >
            {motionEnabled ? <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Scroll to Top Trigger */}
          <button
            type="button"
            onClick={scrollToTop}
            className="p-3 rounded-full bg-[#1769FF] hover:bg-[#0E56D9] text-white shadow-xl shadow-blue-500/30 border border-blue-400/40 backdrop-blur-md transition-all duration-300 cursor-pointer flex items-center justify-center motion-btn-pop hover:scale-110 active:scale-95 group"
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          </button>
        </div>
      )}
    </>
  );
};
