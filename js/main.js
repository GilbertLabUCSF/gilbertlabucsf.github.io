/**
 * Gilbert Lab Website - Main JavaScript
 * =====================================
 * Particle-based DNA helix with Cas9 cutting (Canvas)
 */

// ============================================
// PARTICLE DNA HELIX
// ============================================
function initDNABackground() {
  const container = document.getElementById('heroBg');
  if (!container) return;

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  // Sizing
  const maxDpr = 2;
  const getDpr = () => Math.min(window.devicePixelRatio || 1, maxDpr);
  function resize() {
    const dpr = getDpr();
    canvas.width = Math.round(container.offsetWidth * dpr);
    canvas.height = Math.round(container.offsetHeight * dpr);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const width = () => container.offsetWidth;
  const height = () => container.offsetHeight;

  // DNA Parameters
  const config = {
    particleCount: 120,
    helixRadius: 50,
    helixLength: 1.4, // multiplier of screen diagonal
    wavelength: 80,
    rotationSpeed: 0.0003,
    particleSize: { min: 1.5, max: 4 },
    colors: {
      strandA: { r: 22, g: 163, b: 74 },   // Green
      strandB: { r: 20, g: 184, b: 166 },  // Teal
      rung: { r: 34, g: 197, b: 94 },      // Light green
      cas9: { r: 251, g: 191, b: 36 },     // Amber
      mutation: { r: 239, g: 68, b: 68 }   // Red
    }
  };

  // Particles array
  let particles = [];
  let rungParticles = [];

  // Initialize particles along helix
  function initParticles() {
    particles = [];
    rungParticles = [];

    for (let i = 0; i < config.particleCount; i++) {
      const t = i / config.particleCount;
      // Strand A
      particles.push({ t, strand: 'A', size: config.particleSize.min + Math.random() * (config.particleSize.max - config.particleSize.min) });
      // Strand B
      particles.push({ t, strand: 'B', size: config.particleSize.min + Math.random() * (config.particleSize.max - config.particleSize.min) });

      // Rung particles (every few)
      if (i % 3 === 0) {
        for (let r = 0; r < 5; r++) {
          rungParticles.push({ t, r: r / 4, size: 1 + Math.random() * 1.5 });
        }
      }
    }
  }
  initParticles();

  // Helix geometry
  const diagonal = () => Math.sqrt(width() ** 2 + height() ** 2);
  const startX = () => width() * 0.1;
  const startY = () => -height() * 0.1;
  const endX = () => width() * 0.9;
  const endY = () => height() * 1.1;

  function getHelixPoint(t, phase, strand) {
    const dx = endX() - startX();
    const dy = endY() - startY();
    const len = Math.sqrt(dx * dx + dy * dy);

    const dirX = dx / len;
    const dirY = dy / len;
    const perpX = -dirY;
    const perpY = dirX;

    const dist = t * len;
    const baseX = startX() + dirX * dist;
    const baseY = startY() + dirY * dist;

    const angle = (dist / config.wavelength) * Math.PI * 2 + phase + (strand === 'B' ? Math.PI : 0);
    const radius = config.helixRadius;
    const offset = Math.sin(angle) * radius;
    const depth = Math.cos(angle); // -1 to 1

    return {
      x: baseX + perpX * offset,
      y: baseY + perpY * offset,
      depth,
      angle
    };
  }

  // Cas9 state
  let cas9 = {
    active: false,
    t: 0.5,
    startTime: 0,
    x: 0,
    y: 0,
    opacity: 0
  };
  let lastCutTime = performance.now() - 2000;
  let cutInterval = 5000;

  // Mutations
  let mutations = [];

  // Animation
  let rafId = null;
  let isRunning = false;
  let isVisible = true;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function start() {
    if (isRunning || prefersReducedMotion || !isVisible) return;
    isRunning = true;
    rafId = requestAnimationFrame(animate);
  }

  function stop() {
    if (!isRunning) return;
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function animate(now) {
    const w = width();
    const h = height();

    ctx.clearRect(0, 0, w, h);

    const phase = now * config.rotationSpeed;

    // Sort particles by depth for proper rendering
    const allParticles = [];

    // Add strand particles
    particles.forEach(p => {
      const pos = getHelixPoint(p.t, phase, p.strand);
      allParticles.push({
        ...pos,
        size: p.size,
        type: 'strand',
        strand: p.strand
      });
    });

    // Add rung particles
    rungParticles.forEach(p => {
      const posA = getHelixPoint(p.t, phase, 'A');
      const posB = getHelixPoint(p.t, phase, 'B');
      const x = posA.x + (posB.x - posA.x) * p.r;
      const y = posA.y + (posB.y - posA.y) * p.r;
      const depth = posA.depth + (posB.depth - posA.depth) * p.r;
      allParticles.push({
        x, y, depth,
        size: p.size,
        type: 'rung'
      });
    });

    // Sort by depth (back to front)
    allParticles.sort((a, b) => a.depth - b.depth);

    // Draw particles
    allParticles.forEach(p => {
      const alpha = 0.2 + (p.depth + 1) / 2 * 0.6;
      const size = p.size * (0.6 + (p.depth + 1) / 2 * 0.6);

      let color;
      if (p.type === 'strand') {
        color = p.strand === 'A' ? config.colors.strandA : config.colors.strandB;
      } else {
        color = config.colors.rung;
      }

      // Glow effect
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.fill();
    });

    // Draw mutations
    mutations = mutations.filter(m => {
      const age = now - m.startTime;
      if (age > 8000) return false;

      const posA = getHelixPoint(m.t, phase, 'A');
      const posB = getHelixPoint(m.t, phase, 'B');
      const x = (posA.x + posB.x) / 2;
      const y = (posA.y + posB.y) / 2;

      let alpha;
      if (age < 500) alpha = age / 500;
      else if (age > 7000) alpha = (8000 - age) / 1000;
      else alpha = 1;

      // Mutation glow
      const c = config.colors.mutation;
      const size = 15 + Math.sin(age * 0.008) * 5;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.fill();

      return true;
    });

    // Trigger Cas9
    if (!cas9.active && now - lastCutTime > cutInterval) {
      cas9.active = true;
      cas9.startTime = now;
      cas9.t = 0.2 + Math.random() * 0.6;
      lastCutTime = now;
      cutInterval = 4000 + Math.random() * 3000;
    }

    // Draw Cas9
    if (cas9.active) {
      const elapsed = now - cas9.startTime;
      const posA = getHelixPoint(cas9.t, phase, 'A');
      const posB = getHelixPoint(cas9.t, phase, 'B');
      const targetX = (posA.x + posB.x) / 2;
      const targetY = (posA.y + posB.y) / 2;

      let x, y, opacity, size;

      if (elapsed < 1200) {
        // Approach
        const p = elapsed / 1200;
        const eased = 1 - Math.pow(1 - p, 3);
        x = targetX - 150 * (1 - eased);
        y = targetY - 100 * (1 - eased);
        opacity = p;
        size = 20 + p * 10;
      } else if (elapsed < 1800) {
        // Cut
        const p = (elapsed - 1200) / 600;
        x = targetX;
        y = targetY;
        opacity = 1;
        size = 30 + Math.sin(p * Math.PI) * 20;

        // Flash
        const flashAlpha = Math.sin(p * Math.PI) * 0.6;
        const flashGradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
        flashGradient.addColorStop(0, `rgba(251, 191, 36, ${flashAlpha})`);
        flashGradient.addColorStop(0.5, `rgba(251, 191, 36, ${flashAlpha * 0.3})`);
        flashGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.beginPath();
        ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fillStyle = flashGradient;
        ctx.fill();

      } else if (elapsed < 2600) {
        // Leave
        const p = (elapsed - 1800) / 800;
        x = targetX + 120 * p;
        y = targetY + 80 * p;
        opacity = 1 - p;
        size = 30 - p * 10;
      } else {
        cas9.active = false;
        mutations.push({ t: cas9.t, startTime: now });
        x = targetX;
        y = targetY;
        opacity = 0;
        size = 20;
      }

      if (cas9.active && opacity > 0) {
        const c = config.colors.cas9;

        // Cas9 glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
        gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${opacity * 0.8})`);
        gradient.addColorStop(0.6, `rgba(${c.r}, ${c.g}, ${c.b}, ${opacity * 0.3})`);
        gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

        ctx.beginPath();
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Cas9 body
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 41, 59, ${opacity * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${opacity * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Guide RNA
        ctx.beginPath();
        ctx.moveTo(x + size * 0.5, y);
        ctx.quadraticCurveTo(x + size, y - size * 0.3, x + size * 1.2, y - size * 0.5);
        ctx.strokeStyle = `rgba(34, 197, 94, ${opacity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    rafId = requestAnimationFrame(animate);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible) start();
        else stop();
      });
    }, { threshold: 0.1 });
    observer.observe(container);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  if (!prefersReducedMotion) {
    start();
  }
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('visible', window.scrollY > window.innerHeight * 0.5);
  });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ============================================
// SMOOTH SCROLL
// ============================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) window.scrollTo({ top: target.offsetTop - 64, behavior: 'smooth' });
    });
  });
}

// ============================================
// EVENTS NAVIGATION
// ============================================
function initEventsNav() {
  const yearLinks = document.querySelectorAll('.events-year-nav a');
  yearLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      yearLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      const target = document.querySelector(this.getAttribute('href'));
      if (target) window.scrollTo({ top: target.offsetTop - 84, behavior: 'smooth' });
    });
  });
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDNABackground();
  initNavigation();
  initScrollAnimations();
  initSmoothScroll();
  initEventsNav();
});
