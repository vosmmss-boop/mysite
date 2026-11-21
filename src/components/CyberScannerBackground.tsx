import {useEffect, useRef} from 'react';

interface CyberScannerBackgroundProps {
  /** Optional className for container overrides */
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulseOffset: number;
}

interface HexCell {
  x: number;
  y: number;
  value: string;
  nextSwitch: number;
  baseAlpha: number;
}

interface PulseRipple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

const HEX_CHARS = '0123456789ABCDEF';

function randomHexByte(): string {
  const a = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  const b = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  return `${a}${b}`;
}

export function CyberScannerBackground({className = ''}: CyberScannerBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {alpha: false});
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let particles: Particle[] = [];
    let nodes: NetworkNode[] = [];
    let hexCells: HexCell[] = [];
    const ripples: PulseRipple[] = [];
    let animFrameId = 0;
    let lastTime = performance.now();

    // Smoothly interpolated cursor state across the entire viewport
    const pointer = {
      targetX: width * 0.5,
      targetY: height * 0.5,
      x: width * 0.5,
      y: height * 0.5,
      active: false,
      strength: 0,
      lastRippleAt: 0,
    };

    const initEntities = () => {
      const isCompact = width < 640;
      const particleCount = isCompact ? 24 : 46;
      const nodeCount = isCompact ? 14 : 26;
      const hexCount = isCompact ? 18 : 38;

      particles = Array.from({length: particleCount}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 14,
        vy: -(8 + Math.random() * 18),
        radius: 0.7 + Math.random() * 1.4,
        alpha: 0.14 + Math.random() * 0.28,
        phase: Math.random() * Math.PI * 2,
      }));

      nodes = Array.from({length: nodeCount}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        radius: 1.3 + Math.random() * 1.3,
        pulseOffset: Math.random() * Math.PI * 2,
      }));

      hexCells = [];
      const gridStep = isCompact ? 42 : 54;
      for (let i = 0; i < hexCount * 2 && hexCells.length < hexCount; i++) {
        const gx = Math.floor((Math.random() * width) / gridStep) * gridStep + 14;
        const gy = Math.floor((Math.random() * height) / gridStep) * gridStep + 20;
        const dx = Math.abs(gx - width * 0.5);
        const dy = Math.abs(gy - height * 0.5);
        if (dx < width * 0.24 && dy < height * 0.14) continue;
        hexCells.push({
          x: gx,
          y: gy,
          value: randomHexByte(),
          nextSwitch: Math.random() * 2.5,
          baseAlpha: 0.055 + Math.random() * 0.055,
        });
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initEntities();
    };

    resize();

    const handlePointerMove = (e: PointerEvent) => {
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;

      const now = performance.now();
      if (!prefersReducedMotion && now - pointer.lastRippleAt > 280) {
        pointer.lastRippleAt = now;
        ripples.push({
          x: e.clientX,
          y: e.clientY,
          radius: 8,
          alpha: 0.24,
        });
        if (ripples.length > 6) ripples.shift();
      }
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;
      if (!prefersReducedMotion) {
        ripples.push({
          x: e.clientX,
          y: e.clientY,
          radius: 10,
          alpha: 0.4,
        });
      }
    };

    const drawFrame = (now: number, dt: number) => {
      const t = now * 0.001;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const isCompact = width < 640;
      const gridSize = isCompact ? 40 : 52;

      // Smooth cursor interpolation
      const lerpFactor = 1 - Math.exp(-10 * dt);
      pointer.x += (pointer.targetX - pointer.x) * lerpFactor;
      pointer.y += (pointer.targetY - pointer.y) * lerpFactor;
      const targetStrength = pointer.active ? 1 : 0;
      pointer.strength += (targetStrength - pointer.strength) * (1 - Math.exp(-6 * dt));

      // 1. Almost pure black canvas (#030608)
      ctx.fillStyle = '#030608';
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle dark cyan ambient radial glow
      const ambientRadius = Math.max(width, height) * 0.52;
      const ambientGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, 'rgba(6, 78, 99, 0.17)');
      ambientGrad.addColorStop(0.42, 'rgba(8, 51, 68, 0.08)');
      ambientGrad.addColorStop(1, 'rgba(3, 6, 8, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // Cursor-reactive ambient scanner spotlight anywhere in viewport
      if (pointer.strength > 0.01) {
        const cursorRadius = isCompact ? 170 : 240;
        const cursorGrad = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          cursorRadius,
        );
        cursorGrad.addColorStop(0, `rgba(34, 211, 238, ${0.11 * pointer.strength})`);
        cursorGrad.addColorStop(0.45, `rgba(6, 182, 212, ${0.045 * pointer.strength})`);
        cursorGrad.addColorStop(1, 'rgba(3, 6, 8, 0)');
        ctx.fillStyle = cursorGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Primary horizontal scanning beam position
      const beamCycle = 7.5;
      const beamProgress = prefersReducedMotion ? 0.36 : (t % beamCycle) / beamCycle;
      const beamY = -80 + beamProgress * (height + 160);

      // Secondary slower horizontal scanning line
      const slowCycle = 13;
      const slowProgress = prefersReducedMotion ? 0.72 : 1 - (t % slowCycle) / slowCycle;
      const slowLineY = slowProgress * height;

      // 3. Subtle animated digital grid
      const gridShift = prefersReducedMotion ? 0 : (t * 4) % gridSize;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.036)';
      ctx.beginPath();
      for (let x = (cx % gridSize) - gridSize; x < width + gridSize; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = (cy % gridSize) - gridSize + gridShift * 0.25; y < height + gridSize; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Grid intersection ticks illuminated by beam and cursor proximity
      const cursorGridRadius = isCompact ? 130 : 185;
      for (let x = cx % gridSize; x < width; x += gridSize) {
        for (let y = (cy % gridSize) + gridShift * 0.25; y < height; y += gridSize) {
          const distToBeam = Math.abs(y - beamY);
          const beamBoost = distToBeam < 90 ? (1 - distToBeam / 90) * 0.16 : 0;

          let cursorBoost = 0;
          if (pointer.strength > 0.02) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cursorGridRadius) {
              cursorBoost = (1 - dist / cursorGridRadius) * 0.28 * pointer.strength;
            }
          }

          if (beamBoost > 0 || cursorBoost > 0) {
            ctx.fillStyle = `rgba(103, 232, 249, ${0.06 + beamBoost + cursorBoost})`;
            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
        }
      }

      // 4. Scanning radar effect centered behind the composition
      const radarMaxR = Math.min(width, height) * (isCompact ? 0.42 : 0.38);
      const ringRadii = [0.42, 0.68, 0.94];
      ctx.save();
      ringRadii.forEach((factor, idx) => {
        const r = radarMaxR * factor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.055 - idx * 0.012})`;
        ctx.lineWidth = 1;
        if (idx === 1) {
          ctx.setLineDash([4, 8]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Rotating radar sweep sector
      const radarAngle = prefersReducedMotion ? -0.6 : t * 0.42;
      const sweepSpan = Math.PI * 0.28;
      const radarGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarMaxR);
      radarGrad.addColorStop(0, 'rgba(34, 211, 238, 0.01)');
      radarGrad.addColorStop(0.65, 'rgba(34, 211, 238, 0.045)');
      radarGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarMaxR, radarAngle - sweepSpan, radarAngle);
      ctx.closePath();
      ctx.fillStyle = radarGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(radarAngle) * radarMaxR, cy + Math.sin(radarAngle) * radarMaxR);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.11)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 5. Animated network connection points (+ interactive cursor node links everywhere)
      const maxLinkDist = isCompact ? 120 : 160;
      const cursorInfluenceDist = isCompact ? 140 : 190;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!prefersReducedMotion) {
          // Subtle magnetic drift toward cursor when near
          if (pointer.strength > 0.05) {
            const dx = pointer.x - node.x;
            const dy = pointer.y - node.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 225 && distSq < cursorInfluenceDist * cursorInfluenceDist) {
              const dist = Math.sqrt(distSq);
              const pull = (1 - dist / cursorInfluenceDist) * 18 * pointer.strength;
              node.x += (dx / dist) * pull * dt;
              node.y += (dy / dist) * pull * dt;
            }
          }

          node.x += node.vx * dt;
          node.y += node.vy * dt;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
          node.x = Math.max(0, Math.min(width, node.x));
          node.y = Math.max(0, Math.min(height, node.y));
        }
      }

      ctx.lineWidth = 0.75;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxLinkDist * maxLinkDist) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxLinkDist) * 0.11;
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Connect nearby network nodes directly to cursor scanner position
        if (pointer.strength > 0.02) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < cursorInfluenceDist * cursorInfluenceDist) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / cursorInfluenceDist) * 0.24 * pointer.strength;
            ctx.strokeStyle = `rgba(103, 232, 249, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = 0.55 + 0.45 * Math.sin(t * 1.8 + node.pulseOffset);
        const beamBoost = Math.max(0, 1 - Math.abs(node.y - beamY) / 100) * 0.22;
        let cursorBoost = 0;
        if (pointer.strength > 0.02) {
          const dist = Math.hypot(node.x - pointer.x, node.y - pointer.y);
          if (dist < cursorInfluenceDist) {
            cursorBoost = (1 - dist / cursorInfluenceDist) * 0.3 * pointer.strength;
          }
        }
        ctx.fillStyle = `rgba(103, 232, 249, ${0.14 * pulse + beamBoost + cursorBoost})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Random hexadecimal characters (illuminated by beam or cursor)
      ctx.font = `400 ${isCompact ? 9 : 10}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      for (let i = 0; i < hexCells.length; i++) {
        const cell = hexCells[i];
        let nearCursor = false;
        let cursorGlow = 0;
        if (pointer.strength > 0.02) {
          const dist = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
          if (dist < 140) {
            nearCursor = true;
            cursorGlow = (1 - dist / 140) * 0.26 * pointer.strength;
          }
        }
        if (!prefersReducedMotion) {
          cell.nextSwitch -= dt * (nearCursor ? 3.2 : 1);
          if (cell.nextSwitch <= 0) {
            cell.value = randomHexByte();
            cell.nextSwitch = nearCursor ? 0.18 + Math.random() * 0.35 : 0.8 + Math.random() * 2.8;
          }
        }
        const distToBeam = Math.abs(cell.y - beamY);
        const beamGlow = distToBeam < 85 ? (1 - distToBeam / 85) * 0.22 : 0;
        ctx.fillStyle = `rgba(34, 211, 238, ${cell.baseAlpha + beamGlow + cursorGlow})`;
        ctx.fillText(cell.value, cell.x, cell.y);
      }

      // 7. Small floating digital particles (gently swirl away/brighten near cursor)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let cursorBoost = 0;
        if (!prefersReducedMotion) {
          if (pointer.strength > 0.02) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 4 && dist < 130) {
              const force = (1 - dist / 130) * 38 * pointer.strength;
              p.x += (dx / dist) * force * dt;
              p.y += (dy / dist) * force * dt;
              cursorBoost = (1 - dist / 130) * 0.32 * pointer.strength;
            }
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }
        const shimmer = 0.65 + 0.35 * Math.sin(t * 2.1 + p.phase);
        ctx.fillStyle = `rgba(103, 232, 249, ${p.alpha * shimmer + cursorBoost})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Cursor scanner ripples & subtle tracking reticle anywhere on screen
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += dt * 110;
        r.alpha -= dt * 0.38;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${r.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (pointer.strength > 0.02 && !prefersReducedMotion) {
        ctx.save();
        ctx.translate(pointer.x, pointer.y);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.22 * pointer.strength})`;
        ctx.lineWidth = 1;

        // Rotating segmented cursor scanner ring
        ctx.save();
        ctx.rotate(t * 0.9);
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Faint crosshair hairlines
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(-14, 0);
        ctx.moveTo(14, 0);
        ctx.lineTo(28, 0);
        ctx.moveTo(0, -28);
        ctx.lineTo(0, -14);
        ctx.moveTo(0, 14);
        ctx.lineTo(0, 28);
        ctx.strokeStyle = `rgba(103, 232, 249, ${0.16 * pointer.strength})`;
        ctx.stroke();
        ctx.restore();
      }

      // 9. Slowly moving scanning lines & primary neon-cyan scanning beam
      ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.fillRect(0, slowLineY, width, 1);

      const trailHeight = isCompact ? 105 : 140;
      const beamGrad = ctx.createLinearGradient(0, beamY - trailHeight, 0, beamY + 12);
      beamGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      beamGrad.addColorStop(0.75, 'rgba(34, 211, 238, 0.065)');
      beamGrad.addColorStop(0.95, 'rgba(34, 211, 238, 0.16)');
      beamGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, beamY - trailHeight, width, trailHeight + 12);

      const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
      lineGrad.addColorStop(0, 'rgba(34, 211, 238, 0.04)');
      lineGrad.addColorStop(0.2, 'rgba(34, 211, 238, 0.24)');
      lineGrad.addColorStop(0.5, 'rgba(103, 232, 249, 0.42)');
      lineGrad.addColorStop(0.8, 'rgba(34, 211, 238, 0.24)');
      lineGrad.addColorStop(1, 'rgba(34, 211, 238, 0.04)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, beamY, width, 1.5);

      // 10. Faint technical coordinates along outer edges (updates live with cursor coordinates)
      ctx.font = `400 ${isCompact ? 9 : 10}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
      const scanRatio = Math.max(0, Math.min(999, Math.round((beamY / Math.max(1, height)) * 999)))
        .toString()
        .padStart(3, '0');
      const curX = Math.round(pointer.x).toString().padStart(4, '0');
      const curY = Math.round(pointer.y).toString().padStart(4, '0');
      const padX = isCompact ? 16 : 28;
      const padY = isCompact ? 20 : 28;

      ctx.textAlign = 'left';
      ctx.fillText(`27.7172° N · 85.3240° E`, padX, padY);
      ctx.fillText(
        pointer.active ? `X:${curX}  Y:${curY}  //  SYS.04` : `Y:${scanRatio}  //  SYS.04`,
        padX,
        height - padY + 4,
      );

      ctx.textAlign = 'right';
      ctx.fillText(`SEC-01  [440.82]`, width - padX, padY);
      ctx.textAlign = 'left';
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;
      drawFrame(now, dt);
      if (!prefersReducedMotion) {
        animFrameId = window.requestAnimationFrame(tick);
      }
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      window.cancelAnimationFrame(animFrameId);
      lastTime = performance.now();
      if (prefersReducedMotion) {
        drawFrame(lastTime, 0);
      } else {
        animFrameId = window.requestAnimationFrame(tick);
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, {passive: true});
    window.addEventListener('pointerdown', handlePointerDown, {passive: true});
    document.addEventListener('mouseleave', handlePointerLeave);
    motionQuery.addEventListener('change', handleMotionChange);

    if (prefersReducedMotion) {
      drawFrame(performance.now(), 0);
    } else {
      animFrameId = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handlePointerLeave);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden bg-[#030608] ${className}`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Subtle CRT / HUD horizontal micro-scanlines */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(34, 211, 238, 0.35) 4px)',
        }}
      />

      {/* Slowly drifting subtle full-width scan whisper */}
      <div className="animate-scanline-slow absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/[0.03] to-transparent" />

      {/* Central protective dark vignette so foreground typography always pops */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 56% 42% at 50% 50%, rgba(3, 6, 8, 0.62) 0%, rgba(3, 6, 8, 0.25) 55%, rgba(3, 6, 8, 0.55) 100%)',
        }}
      />
    </div>
  );
}
