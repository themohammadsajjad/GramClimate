'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export function useMotionPreference() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem('gramclimate-motion'); } catch { /* Preferences can be unavailable in private browsing. */ }
      setEnabled(!preference.matches && saved !== 'off');
    };
    read();
    preference.addEventListener('change', read);
    return () => preference.removeEventListener('change', read);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? 'on' : 'off';
    if (!enabled) return;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let card: HTMLElement | null = null;
    const reset = () => { card?.style.removeProperty('transform'); card = null; };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      const target = (event.target as Element).closest<HTMLElement>('.stat');
      if (target !== card) reset();
      if (!target) return;
      card = target;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(850px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-2px)`;
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', reset, { passive: true });
    return () => {
      reset();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('scroll', reset);
    };
  }, [enabled]);
  const toggle = () => setEnabled(previous => {
    const next = !previous;
    try { localStorage.setItem('gramclimate-motion', next ? 'on' : 'off'); } catch { /* The switch still works for this visit. */ }
    return next;
  });
  return { enabled, toggle };
}

export function MotionButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return <button className="motion-button" aria-pressed={enabled} aria-label="Visual motion" onClick={onToggle}>
    {enabled ? <Pause size={14} /> : <Play size={14} />}<span>Motion {enabled ? 'on' : 'off'}</span>
  </button>;
}

// The weather scene is decorative; the charts below carry the actual data.
export function ClimateScene({ enabled }: { enabled: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const scene = sceneRef.current;
    const clouds = cloudRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!scene || !clouds || !canvas || !context) return;
    const ctx = context;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let width = 0, height = 0, frame = 0, last = 0, time = 0;
    let visible = true, mouseX = 0, mouseY = 0, driftX = 0, driftY = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const scroll = enabled ? Math.max(-8, Math.min(8, -scene.getBoundingClientRect().top * .025)) : 0;
      const breeze = Math.sin(time * .16) * 12;
      clouds.style.transform = enabled
        ? `translate3d(${breeze + driftX * 9}px, ${driftY * 5 + scroll}px, 0) scale(1.12)`
        : 'scale(1.12)';
      if (!enabled) return;
      const count = finePointer.matches ? 65 : 28;
      for (let i = 0; i < count; i++) {
        const depth = .35 + (i % 5) * .16;
        const speed = 95 + depth * 120;
        const y = ((i * 47.71 + time * speed) % (height + 50)) - 25;
        const x = ((i * 127.31 - time * (28 + depth * 25) + width * 100) % (width + 60)) - 30;
        // Keep rain away from the reading area on wide screens.
        const fade = width > 600 ? Math.max(0, (x / width - .43) * 1.7) : .35;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - 3 - depth * 2, y + 7 + depth * 9);
        ctx.strokeStyle = `rgba(201,231,239,${fade * (.13 + depth * .2)})`;
        ctx.lineWidth = depth > .8 ? 1.1 : .65; ctx.stroke();
      }
    };
    const tick = (now: number) => {
      if (now - last >= (finePointer.matches ? 32 : 48)) {
        time += Math.min((now - (last || now)) / 1000, .08); last = now;
        driftX += (mouseX - driftX) * .05; driftY += (mouseY - driftY) * .05;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame); last = 0;
      if (enabled && visible && !document.hidden) frame = requestAnimationFrame(tick);
      else draw();
    };
    const resize = new ResizeObserver(() => {
      const rect = scene.getBoundingClientRect(); width = rect.width; height = rect.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
    });
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    const move = (event: PointerEvent) => {
      if (!enabled || !finePointer.matches) return;
      const rect = scene.getBoundingClientRect();
      mouseX = Math.max(-1, Math.min(1, (event.clientX - rect.left - width / 2) / width));
      mouseY = Math.max(-1, Math.min(1, (event.clientY - rect.top - height / 2) / height));
    };
    const leave = () => { mouseX = 0; mouseY = 0; };
    resize.observe(scene); intersection.observe(scene);
    document.addEventListener('visibilitychange', resume);
    if (enabled) { window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('blur', leave); }
    resume();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pointermove', move); window.removeEventListener('blur', leave);
      clouds.style.removeProperty('transform');
    };
  }, [enabled]);
  return <div ref={sceneRef} className="climate-scene" aria-hidden="true">
    <div className="weather-landscape" />
    <div ref={cloudRef} className="weather-clouds" />
    <div className="weather-shade" />
    <canvas ref={canvasRef} />
    <span className="weather-caption">Atmospheric illustration</span>
  </div>;
}
