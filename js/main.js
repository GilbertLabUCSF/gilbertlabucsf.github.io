/**
 * Gilbert Lab Website - Main JavaScript
 * =====================================
 * Particle-based DNA helix with Cas9 cutting (Canvas)
 */

// Seeded PRNG (mulberry32) — stable, reproducible particle scatters
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The hero's palette, reused for interior green accents
const HERO_GREENS = [
  [22, 163, 74],   // green (strand A)
  [63, 166, 160],  // teal
  [34, 197, 94],   // light green (rungs)
];

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
    particleCount: 160,
    helixRadius: () => {
      const size = Math.min(width(), height());
      return Math.max(90, Math.min(180, size * 0.32));
    },
    helixLength: 1.4, // multiplier of screen diagonal
    wavelength: 70,
    rotationSpeed: 0.0003,
    particleSize: { min: 1.5, max: 4 },
    colors: {
      strandA: { r: 22, g: 163, b: 74 },   // Green
      strandB: { r: 20, g: 184, b: 166 },  // Teal
      rung: { r: 34, g: 197, b: 94 },      // Light green
      effector: { r: 120, g: 122, b: 114 },  // Muted warm gray — dCas9 body, softened so it no longer reads as a lavender dot against the green
      activate: { r: 34, g: 197, b: 94 },  // Green — CRISPRa, gene turned ON
      repress: { r: 120, g: 130, b: 140 }  // Cool grey — CRISPRi, gene turned OFF
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
    const radius = config.helixRadius();
    const offset = Math.sin(angle) * radius;
    const depth = Math.cos(angle); // -1 to 1

    return {
      x: baseX + perpX * offset,
      y: baseY + perpY * offset,
      depth,
      angle
    };
  }

  // Linearly blend two {r,g,b} colors (t in 0..1)
  function blendColor(a, b, t) {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
    };
  }

  // dCas9 effector state — it BINDS the helix (never cuts) and toggles local expression
  let effector = {
    active: false,
    t: 0.5,
    startTime: 0,
    seeded: false,
    mode: 'activate' // alternates 'activate' (CRISPRa) / 'repress' (CRISPRi)
  };
  let lastEventTime = performance.now() - 2000;
  let eventInterval = 5000;
  let eventCount = 0;

  // Regulated regions — a glowing (activated) or dimmed (repressed) stretch of the helix
  let regions = [];

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
        t: p.t,
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
        t: p.t,
        size: p.size,
        type: 'rung'
      });
    });

    // Sort by depth (back to front)
    allParticles.sort((a, b) => a.depth - b.depth);

    // Draw particles
    allParticles.forEach(p => {
      // Fade gracefully at the helix ends so particles dissolve instead of popping in/out
      const edgeFade = Math.min(1, p.t / 0.08) * Math.min(1, (1 - p.t) / 0.08);
      let alpha = (0.2 + (p.depth + 1) / 2 * 0.6) * edgeFade;
      if (alpha <= 0.012) return;
      let size = p.size * (0.6 + (p.depth + 1) / 2 * 0.6);

      let color;
      if (p.type === 'strand') {
        color = p.strand === 'A' ? config.colors.strandA : config.colors.strandB;
      } else {
        color = config.colors.rung;
      }

      // dCas9 binding regulates the local stretch: activation brightens, repression mutes
      let glowBoost = 1;
      for (const reg of regions) {
        const influence = Math.exp(-Math.pow((p.t - reg.t) / reg.span, 2)) * reg.strength;
        if (influence < 0.02) continue;
        if (reg.mode === 'activate') {
          color = blendColor(color, config.colors.activate, influence);
          glowBoost = Math.max(glowBoost, 1 + influence * 1.6);
          alpha = Math.min(1, alpha + influence * 0.35);
        } else {
          color = blendColor(color, config.colors.repress, influence * 0.9);
          alpha *= 1 - influence * 0.55;
          size *= 1 - influence * 0.2;
        }
      }

      // Glow effect
      const glowR = size * 3 * glowBoost;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.fill();
    });

    // Age active regulated regions: ramp up while bound, hold, then release smoothly
    regions = regions.filter(reg => {
      const age = now - reg.startTime;
      if (age > reg.life) return false;
      if (age < 600) reg.strength = (age / 600) * reg.peak;                       // binding
      else if (age > reg.life - 1400) reg.strength = ((reg.life - age) / 1400) * reg.peak; // release
      else reg.strength = reg.peak;
      return true;
    });

    // Activated genes emit faint "transcription" sparks drifting upward
    regions.forEach(reg => {
      if (reg.mode !== 'activate' || reg.strength < 0.3) return;
      const pos = getHelixPoint(reg.t, phase, 'A');
      const c = config.colors.activate;
      for (let i = 0; i < 3; i++) {
        const tt = ((now * 0.0006) + i / 3) % 1;
        const a = (1 - tt) * reg.strength * 0.5;
        ctx.beginPath();
        ctx.arc(pos.x + Math.sin(tt * 6 + i) * 9, pos.y - tt * 64, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
        ctx.fill();
      }
    });

    // Schedule the next binding event, alternating CRISPRa (on) and CRISPRi (off)
    if (!effector.active && now - lastEventTime > eventInterval) {
      effector.active = true;
      effector.startTime = now;
      effector.seeded = false;
      effector.t = 0.25 + Math.random() * 0.5;
      effector.mode = (eventCount % 2 === 0) ? 'activate' : 'repress';
      eventCount++;
      lastEventTime = now;
      eventInterval = 4200 + Math.random() * 2600;
    }

    // dCas9 effector: approach -> dock (bind, no cut) -> release
    if (effector.active) {
      const elapsed = now - effector.startTime;
      const posA = getHelixPoint(effector.t, phase, 'A');
      const posB = getHelixPoint(effector.t, phase, 'B');
      const cx = (posA.x + posB.x) / 2;
      const cy = (posA.y + posB.y) / 2;
      const body = config.colors.effector;
      const ec = effector.mode === 'activate' ? config.colors.activate : config.colors.repress;

      let x, y, opacity;
      if (elapsed < 1100) {
        // Approach
        const p = elapsed / 1100;
        const eased = 1 - Math.pow(1 - p, 3);
        x = cx - 140 * (1 - eased);
        y = cy - 92 * (1 - eased);
        opacity = p;
      } else if (elapsed < 2400) {
        // Docked (bound to target) — seed the regulated region so it blooms under the protein
        x = cx; y = cy; opacity = 1;
        if (!effector.seeded) {
          regions.push({ t: effector.t, mode: effector.mode, startTime: now, life: 5200, peak: 1, strength: 0, span: 0.05 });
          effector.seeded = true;
        }
      } else if (elapsed < 3200) {
        // Release
        const p = (elapsed - 2400) / 800;
        x = cx + 128 * p;
        y = cy + 80 * p;
        opacity = 1 - p;
      } else {
        effector.active = false;
        opacity = 0;
      }

      if (effector.active && opacity > 0) {
        // Binding halo, tinted by mode (green = activate, grey = repress)
        const halo = ctx.createRadialGradient(x, y, 0, x, y, 34);
        halo.addColorStop(0, `rgba(${ec.r}, ${ec.g}, ${ec.b}, ${opacity * 0.5})`);
        halo.addColorStop(0.6, `rgba(${ec.r}, ${ec.g}, ${ec.b}, ${opacity * 0.18})`);
        halo.addColorStop(1, `rgba(${ec.r}, ${ec.g}, ${ec.b}, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // dCas9 protein body — rounded and neutral, clearly docking rather than cutting.
        // Kept quiet (lower opacity) so it reads as a soft presence, not a stray dot.
        ctx.beginPath();
        ctx.ellipse(x, y, 16, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${body.r}, ${body.g}, ${body.b}, ${opacity * 0.62})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${ec.r}, ${ec.g}, ${ec.b}, ${opacity * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Guide RNA threading back toward the bound site
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 15, y - 11, x + 25, y - 21);
        ctx.strokeStyle = `rgba(${config.colors.rung.r}, ${config.colors.rung.g}, ${config.colors.rung.b}, ${opacity * 0.5})`;
        ctx.lineWidth = 1.5;
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
// MOBILE MENU
// ============================================
function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }
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
// EVENTS CAROUSEL
// ============================================
function initEventsCarousel() {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const viewport = carousel.querySelector('.carousel-viewport');
  const slides = Array.from(track?.querySelectorAll('.event-slide') || []);
  const prev = carousel.querySelector('.carousel-btn.prev');
  const next = carousel.querySelector('.carousel-btn.next');
  const dots = carousel.parentElement?.querySelector('[data-carousel-dots]');

  if (!track || slides.length === 0) return;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let currentIndex = 0;
  let rafId = null;

  function getSlideWidth() {
    const slide = slides[0];
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || 0);
    return slide.getBoundingClientRect().width + gap;
  }

  function updateButtons() {
    if (!prev || !next) return;
    prev.disabled = currentIndex <= 0;
    next.disabled = currentIndex >= slides.length - 1;
  }

  // Show an edge fade only where a card is actually clipped off-screen
  function updateFades() {
    if (!viewport) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    viewport.classList.toggle('show-left', track.scrollLeft > 4);
    viewport.classList.toggle('show-right', track.scrollLeft < maxScroll - 4);
  }

  function updateDots() {
    if (!dots) return;
    const dotButtons = Array.from(dots.querySelectorAll('button'));
    dotButtons.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  }

  function scrollToIndex(index, behavior = 'smooth') {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    const left = clamped * getSlideWidth();
    track.scrollTo({ left, behavior: prefersReducedMotion ? 'auto' : behavior });
    currentIndex = clamped;
    updateButtons();
    updateDots();
    updateFades();
  }

  if (dots) {
    dots.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
      dot.addEventListener('click', () => scrollToIndex(idx));
      dots.appendChild(dot);
    });
  }

  function handleScroll() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const width = getSlideWidth();
      const index = Math.round(track.scrollLeft / width);
      if (index !== currentIndex) {
        currentIndex = index;
        updateButtons();
        updateDots();
      }
      updateFades();
    });
  }

  track.addEventListener('scroll', handleScroll, { passive: true });
  prev?.addEventListener('click', () => scrollToIndex(currentIndex - 1));
  next?.addEventListener('click', () => scrollToIndex(currentIndex + 1));
  window.addEventListener('resize', () => scrollToIndex(currentIndex, 'auto'));

  updateButtons();
  updateDots();
  updateFades();
}

// ============================================
// STICKY SECTION INDEX RAIL (desktop)
// ============================================
// Build a fixed 01–07 rail from the labeled sections. It highlights the
// section nearest the vertical center of the viewport and jumps on click.
// CSS hides it on mobile; without JS it simply never appears.
function initSectionRail() {
  const sections = Array.from(document.querySelectorAll('section'))
    .filter((s) => s.id && s.querySelector('.section-label'));
  if (sections.length < 2) return;

  const nav = document.createElement('nav');
  nav.className = 'section-rail';
  nav.setAttribute('aria-label', 'Section index');
  const ol = document.createElement('ol');
  const links = new Map();

  sections.forEach((section, i) => {
    const num = String(i + 1).padStart(2, '0');
    const label = (section.querySelector('.section-label')?.textContent || section.id).trim();
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + section.id;
    a.innerHTML = `<span class="rail-num">${num}</span><span class="rail-label">${label}</span>`;
    li.appendChild(a);
    ol.appendChild(li);
    links.set(section.id, a);
  });

  nav.appendChild(ol);
  document.body.appendChild(nav);

  // Track which sections cross a thin band near the vertical center; the
  // topmost one in document order wins so exactly one link is active.
  const visible = new Set();
  function setActive() {
    let activeId = null;
    for (const section of sections) {
      if (visible.has(section.id)) { activeId = section.id; break; }
    }
    links.forEach((a, id) => a.classList.toggle('active', id === activeId));
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) visible.add(e.target.id);
      else visible.delete(e.target.id);
    });
    setActive();
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach((s) => io.observe(s));
}

// ============================================
// SECTION-DIVIDER PARTICLE MOTIF
// ============================================
// A thin, sparse band of the hero's green/teal particles drifting on a gentle
// diagonal at the top of each labeled section. Decorative and low-opacity;
// injected so it degrades to nothing without JS. One shared rAF loop draws
// only the bands currently on screen. Reduced motion → a single static draw.
function initSectionParticles() {
  const sections = Array.from(document.querySelectorAll('section'))
    .filter((s) => s.querySelector('.section-label'));
  if (!sections.length) return;

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const bands = sections.map((section, i) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'section-particles';
    canvas.setAttribute('aria-hidden', 'true');
    section.insertBefore(canvas, section.firstChild);
    const ctx = canvas.getContext('2d');

    const rng = makeRng(9973 + i * 101);
    const dots = [];
    for (let j = 0; j < 22; j++) {
      dots.push({
        x: rng(),
        y: rng(),
        r: 0.8 + rng() * 1.7,
        a: 0.08 + rng() * 0.2,
        c: HERO_GREENS[Math.floor(rng() * HERO_GREENS.length)],
      });
    }

    const band = { canvas, ctx, dots, visible: false, w: 0, h: 0 };
    band.resize = function () {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      band.w = canvas.offsetWidth;
      band.h = canvas.offsetHeight;
      canvas.width = Math.round(band.w * dpr);
      canvas.height = Math.round(band.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    band.resize();
    return band;
  });

  function drawBand(band, t) {
    const { ctx, w, h, dots } = band;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const offX = (t / 45000) % 1;   // ~45s to cross horizontally
    const offY = (t / 120000) % 1;  // slower → a shallow diagonal drift
    dots.forEach((d) => {
      const x = (((d.x + offX) % 1) + 1) % 1 * w;
      const y = (((d.y + offY) % 1) + 1) % 1 * h;
      const [r, g, b] = d.c;
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${d.a})`;
      ctx.fill();
    });
  }

  window.addEventListener('resize', () => bands.forEach((b) => b.resize()));

  if (prefersReduced) {
    bands.forEach((b) => drawBand(b, 0));
    return;
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const band = bands.find((b) => b.canvas === e.target);
        if (band) band.visible = e.isIntersecting;
      });
    }, { threshold: 0 });
    bands.forEach((b) => io.observe(b.canvas));
  } else {
    bands.forEach((b) => (b.visible = true));
  }

  let raf = null;
  function loop(now) {
    bands.forEach((b) => { if (b.visible) drawBand(b, now); });
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      raf = requestAnimationFrame(loop);
    }
  });
}

// ============================================
// PUBLICATIONS — tap to expand (touch/click)
// ============================================
// Hover and keyboard focus reveal the row via CSS; this handles the explicit
// toggle, which is the only path on touch devices with no hover.
function initPublications() {
  document.querySelectorAll('.pub-item').forEach((item) => {
    const toggle = item.querySelector('.pub-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const open = item.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}

// ============================================
// FLAGSHIP CARD PARTICLES
// ============================================
// A faint, static scatter of the hero's green/teal particles inside the
// flagship research card. Seeded so positions are stable across reloads.
function initFlagshipParticles() {
  const canvas = document.querySelector('.flagship-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const card = canvas.parentElement;
  const rng = makeRng(20140929);

  const dots = [];
  for (let i = 0; i < 26; i++) {
    dots.push({
      x: rng(),
      y: rng(),
      r: 1 + rng() * 2.4,
      a: 0.12 + rng() * 0.26,
      c: HERO_GREENS[Math.floor(rng() * HERO_GREENS.length)],
    });
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    dots.forEach((d) => {
      const x = d.x * w;
      const y = d.y * h;
      const [r, g, b] = d.c;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, d.r * 3);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${d.a})`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.beginPath();
      ctx.arc(x, y, d.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${d.a})`;
      ctx.fill();
    });
  }

  draw();
  window.addEventListener('resize', draw);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDNABackground();
  initNavigation();
  initMobileMenu();
  initScrollAnimations();
  initSectionRail();
  initSmoothScroll();
  initEventsCarousel();
  initFlagshipParticles();
  initPublications();
  initSectionParticles();
});
