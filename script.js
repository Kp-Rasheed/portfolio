/* =========================================================
   Rasheed Kp — Portfolio interactions
   Vanilla JS, no dependencies. Every feature is optional:
   the page is fully usable if any part of this file fails.
   ========================================================= */
(function () {
  'use strict';

  window.__portfolioReady = true; // cancels the no-JS fail-safe in <head>

  const $ =(sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /** Run each feature in isolation so one failure never breaks the rest. */
  function safely(name, fn) {
    try { fn(); } catch (err) { console.warn(`[portfolio] ${name} failed:`, err); }
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  /* ---------- Preloader ---------- */
  function initPreloader() {
    const loader = $('.preloader');
    if (!loader) return;
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      loader.classList.add('is-done');
      document.documentElement.classList.add('is-loaded');
      setTimeout(() => loader.remove(), 600);
    };
    if (document.readyState === 'complete') setTimeout(hide, 200);
    else window.addEventListener('load', () => setTimeout(hide, 200), { once: true });
    setTimeout(hide, 2500); // never block the page on a slow asset
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    const root = document.documentElement;
    const btn = $('#theme-toggle');
    if (!btn) return;

    const sync = () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      document.dispatchEvent(new CustomEvent('themechange'));
    };

    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
      sync();
    });

    // Follow the OS theme until the visitor picks one explicitly
    window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', (e) => {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
      if (saved) return;
      root.setAttribute('data-theme', e.matches ? 'light' : 'dark');
      sync();
    });

    sync();
  }

  /* ---------- Navigation, progress bar, back-to-top ---------- */
  function initNav() {
    const navbar = $('#navbar');
    const menu = $('#nav-menu');
    const toggle = $('#nav-toggle');
    const progress = $('.scroll-progress span');
    const toTop = $('#to-top');

    // Scroll-driven UI, batched into one rAF per frame
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      navbar?.classList.toggle('scrolled', y > 20);
      toTop?.classList.toggle('is-visible', y > window.innerHeight * 0.8);
      if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    // Mobile menu
    const setOpen = (open) => {
      if (!menu || !toggle) return;
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle?.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu?.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (menu?.classList.contains('is-open') && !navbar.contains(e.target)) setOpen(false);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1080) setOpen(false); });

    // Ignore empty "#" links instead of throwing
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href="#"]');
      if (a) e.preventDefault();
    });

    // Highlight the nav link for the section in view
    const links = $$('.nav-link');
    const byId = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    if (!('IntersectionObserver' in window)) return;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
        const link = byId.get(entry.target.id);
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Stats (derived from project cards) ---------- */
  function initStats() {
    const cards = $$('.project-card');
    const computed = {
      projects: cards.length,
      live: cards.filter((c) => c.hasAttribute('data-live')).length,
      industries: new Set(cards.map((c) => c.dataset.industry).filter(Boolean)).size,
    };

    const counters = $$('.count');
    counters.forEach((el) => {
      const key = el.dataset.stat;
      if (computed[key]) el.textContent = computed[key];
      el.dataset.target = el.textContent;
    });

    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => { el.textContent = '0'; io.observe(el); });
  }

  /* ---------- Typed role text ---------- */
  function initTyped() {
    const el = $('.typed');
    if (!el || reducedMotion.matches) return;
    let words;
    try { words = JSON.parse(el.dataset.words); } catch (e) { return; }
    if (!Array.isArray(words) || words.length < 2) return;

    // Decode HTML entities like &amp; from the attribute
    const decoder = document.createElement('textarea');
    words = words.map((w) => { decoder.innerHTML = w; return decoder.value; });

    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = true;
    el.setAttribute('aria-live', 'off');

    const tick = () => {
      const word = words[wordIndex];
      charIndex += deleting ? -1 : 1;
      el.textContent = word.slice(0, charIndex);

      let delay = deleting ? 40 : 75;
      if (!deleting && charIndex === word.length) { delay = 2200; deleting = true; }
      else if (deleting && charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 350;
      }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2600);
  }

  /* ---------- Hero particle network ---------- */
  function initHeroCanvas() {
    const canvas = $('.hero-canvas');
    const hero = $('#hero');
    if (!canvas || !hero || reducedMotion.matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1, particles = [], running = false, rafId = 0;
    const mouse = { x: -9999, y: -9999 };
    let color = '34, 211, 238';

    const readColor = () => {
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      color = light ? '8, 145, 178' : '34, 211, 238';
    };

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(window.innerWidth < 640 ? 28 : 70, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }));
    };

    const LINK = 130;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Gentle pull toward the pointer
        const mdx = mouse.x - p.x, mdy = mouse.y - p.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 180) { p.x += mdx * 0.003; p.y += mdy * 0.003; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, 0.7)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = dx * dx + dy * dy;
          if (d < LINK * LINK) {
            ctx.strokeStyle = `rgba(${color}, ${0.18 * (1 - Math.sqrt(d) / LINK)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
        if (md < 180) {
          ctx.strokeStyle = `rgba(${color}, ${0.35 * (1 - md / 180)})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    const start = () => { if (!running) { running = true; rafId = requestAnimationFrame(draw); } };
    const stop = () => { running = false; cancelAnimationFrame(rafId); };

    readColor();
    resize();

    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
    document.addEventListener('themechange', readColor);

    if (finePointer.matches) {
      hero.addEventListener('pointermove', (e) => {
        const rect = hero.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }

    // Only animate while the hero is on screen and the tab is visible
    let heroVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        heroVisible && !document.hidden ? start() : stop();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      document.hidden || !heroVisible ? stop() : start();
    });
    start();
  }

  /* ---------- Pointer effects: spotlight, tilt, magnetic ---------- */
  function initPointerEffects() {
    if (!finePointer.matches || reducedMotion.matches) return;

    // Spotlight follows the cursor inside cards
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.spotlight');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }, { passive: true });

    // 3D tilt
    const tilt = (el, max) => {
      let frame = 0;
      el.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        el.style.transform = '';
      });
    };
    $$('.project-card').forEach((el) => tilt(el, 6));
    $$('.tilt').forEach((el) => tilt(el, 8));

    // Magnetic buttons
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.25;
        btn.style.transform = `translate(${x}px, ${y - 2}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Projects: filter, search, load more, details ---------- */
  const INITIAL_VISIBLE = 9;
  const projectState = { category: 'all', query: '', tech: null, techLabel: '', expanded: false };
  let applyProjectFilters = () => {};

  const cardTech = (card) => (card.dataset.tech || '').split(',').map((t) => t.trim()).filter(Boolean);
  const matchesTech = (card, list) => list.some((t) => cardTech(card).includes(t));

  function initProjects() {
    const grid = $('#projects-grid');
    if (!grid) return;
    const cards = $$('.project-card', grid);
    const filters = $$('.filter');
    const search = $('#project-search');
    const empty = $('#projects-empty');
    const loadMore = $('#load-more');
    const techNote = $('#active-tech');

    // Per-filter counts
    filters.forEach((btn) => {
      const f = btn.dataset.filter;
      const n = f === 'all' ? cards.length : cards.filter((c) => (c.dataset.category || '').split(' ').includes(f)).length;
      const badge = $('.filter-count', btn);
      if (badge) badge.textContent = n;
    });

    const searchText = (card) => [
      $('h3', card)?.textContent,
      card.dataset.tech,
      card.dataset.industry,
      card.dataset.category,
      $('.project-text', card)?.textContent,
    ].join(' ').toLowerCase();
    const index = new Map(cards.map((c) => [c, searchText(c)]));

    applyProjectFilters = () => {
      const { category, query, tech, expanded } = projectState;
      const q = query.trim().toLowerCase();
      const limit = category === 'all' && !q && !tech && !expanded;
      let shown = 0, matched = 0;

      cards.forEach((card) => {
        const okCat = category === 'all' || (card.dataset.category || '').split(' ').includes(category);
        const okQuery = !q || q.split(/\s+/).every((word) => index.get(card).includes(word));
        const okTech = !tech || matchesTech(card, tech);
        const match = okCat && okQuery && okTech;
        if (match) matched++;
        const visible = match && (!limit || shown < INITIAL_VISIBLE);
        const wasHidden = card.classList.contains('is-hidden');
        card.classList.toggle('is-hidden', !visible);
        if (visible) {
          if (wasHidden && !reducedMotion.matches) {
            card.classList.remove('is-entering');
            card.style.animationDelay = `${Math.min(shown, 8) * 45}ms`;
            void card.offsetWidth; // restart animation
            card.classList.add('is-entering');
          }
          shown++;
        }
      });

      if (empty) empty.hidden = matched > 0;
      if (loadMore) {
        loadMore.hidden = !(limit && matched > INITIAL_VISIBLE);
        loadMore.innerHTML = `Show all ${matched} projects <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
      }
      if (techNote) {
        techNote.hidden = !tech;
        const strong = $('strong', techNote);
        if (strong) strong.textContent = projectState.techLabel;
      }
    };

    filters.forEach((btn) => btn.addEventListener('click', () => {
      filters.forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      projectState.category = btn.dataset.filter;
      applyProjectFilters();
    }));

    let searchTimer;
    search?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { projectState.query = search.value; applyProjectFilters(); }, 120);
    });

    loadMore?.addEventListener('click', () => {
      projectState.expanded = true;
      applyProjectFilters();
    });

    $('.clear-tech', techNote || document)?.addEventListener('click', () => {
      projectState.tech = null;
      projectState.techLabel = '';
      applyProjectFilters();
    });

    applyProjectFilters();
  }

  /* ---------- Skills: category tabs, project counts, jump-to-projects ---------- */
  function initSkills() {
    const tabs = $$('[data-skill-filter]');
    const skills = $$('#skills-grid .skill');
    const cards = $$('.project-card');

    skills.forEach((skill) => {
      const match = (skill.dataset.match || '').split(',').map((s) => s.trim()).filter(Boolean);
      const n = match.length ? cards.filter((c) => matchesTech(c, match)).length : 0;
      const countEl = $('.skill-count', skill);
      const btn = $('button', skill);
      const name = $('.skill-name', skill)?.textContent || '';
      if (n > 0) {
        skill.classList.add('has-projects');
        if (countEl) countEl.textContent = `${n} project${n > 1 ? 's' : ''}`;
        btn?.setAttribute('aria-label', `${name} — show ${n} related project${n > 1 ? 's' : ''}`);
        btn?.addEventListener('click', () => {
          projectState.tech = match;
          projectState.techLabel = name;
          projectState.category = 'all';
          projectState.query = '';
          const search = $('#project-search');
          if (search) search.value = '';
          $$('.filter').forEach((b) => {
            const on = b.dataset.filter === 'all';
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
          });
          applyProjectFilters();
          $('#projects')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        });
      } else {
        btn?.setAttribute('tabindex', '-1');
        btn?.setAttribute('aria-disabled', 'true');
      }
    });

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const group = tab.dataset.skillFilter;
      tabs.forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-pressed', String(t === tab)); });
      let i = 0;
      skills.forEach((skill) => {
        const show = group === 'all' || (skill.dataset.group || '').split(' ').includes(group);
        skill.classList.toggle('is-dim', !show);
        skill.classList.remove('is-entering');
        if (show && !reducedMotion.matches) {
          skill.style.animationDelay = `${Math.min(i++, 12) * 30}ms`;
          void skill.offsetWidth;
          skill.classList.add('is-entering');
        }
      });
    }));
  }

  /* ---------- Project details dialog ---------- */
  function initModal() {
    const modal = $('#project-modal');
    if (!modal) return;
    const cover = $('.modal-cover', modal);
    const industry = $('.modal-industry', modal);
    const title = $('.modal-title', modal);
    const summary = $('.modal-summary', modal);
    const tags = $('.modal-tags', modal);
    const details = $('.modal-details', modal);
    const actions = $('.modal-actions', modal);
    let lastFocus = null;

    const open = (card) => {
      if (!card) return;
      lastFocus = document.activeElement;

      cover.innerHTML = '';
      const c = $('.project-cover', card);
      if (c) cover.appendChild(c.cloneNode(true));
      industry.textContent = card.dataset.industry || '';
      title.textContent = $('h3', card)?.textContent.trim() || '';
      summary.innerHTML = $('.project-text', card)?.innerHTML || '';
      tags.innerHTML = $('.tech-tags', card)?.innerHTML || '';
      details.innerHTML = $('.project-more', card)?.innerHTML || '';

      actions.innerHTML = '';
      const live = $('.view-site', card);
      if (live) {
        const a = document.createElement('a');
        a.href = live.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'btn btn-primary';
        a.innerHTML = 'Visit live site <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>';
        actions.appendChild(a);
      }
      const talk = document.createElement('a');
      talk.href = '#contact';
      talk.className = 'btn btn-ghost';
      talk.textContent = 'Discuss a similar project';
      talk.addEventListener('click', () => close());
      actions.appendChild(talk);

      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
      document.body.classList.add('no-scroll');
      $('.modal-inner', modal).scrollTop = 0;
      $('.modal-close', modal)?.focus();
    };

    const close = () => {
      if (typeof modal.close === 'function' && modal.open) modal.close();
      else modal.removeAttribute('open');
    };

    modal.addEventListener('close', () => {
      document.body.classList.remove('no-scroll');
      lastFocus?.focus?.({ preventScroll: true });
    });
    $('.modal-close', modal)?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); }); // backdrop

    // "View details" buttons on cards
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.read-more');
      if (btn) { open(btn.closest('.project-card')); return; }

      const link = e.target.closest('[data-open-project]');
      if (link) {
        e.preventDefault();
        open(document.getElementById(`project-${link.dataset.openProject}`));
      }
    });
  }

  /* ---------- Contact form (Web3Forms, AJAX with no-JS fallback) ---------- */
  function initContactForm() {
    const form = $('#contact-form');
    if (!form) return;
    form.noValidate = true; // custom inline validation replaces the browser bubbles
    const status = $('.form-status', form);
    const label = $('.btn-label', form);
    const message = $('#cf-message', form);
    const counter = $('.char-count', form);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const setError = (field, msg) => {
      const wrap = field.closest('.field');
      wrap?.classList.toggle('has-error', !!msg);
      const err = $('.field-error', wrap);
      if (err) err.textContent = msg || '';
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };

    const validate = (field) => {
      const v = field.value.trim();
      if (!v) return setError(field, 'This field is required.'), false;
      if (field.type === 'email' && !emailRe.test(v)) return setError(field, 'Please enter a valid email address.'), false;
      if (field.name === 'message' && v.length < 10) return setError(field, 'Please write at least 10 characters.'), false;
      setError(field, '');
      return true;
    };

    const fields = $$('input[required], textarea[required]', form);
    fields.forEach((f) => {
      f.addEventListener('blur', () => { if (f.value) validate(f); });
      f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') validate(f); });
    });

    message?.addEventListener('input', () => {
      if (counter) counter.textContent = `${message.value.length} / ${message.maxLength}`;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = fields.filter((f) => !validate(f));
      if (invalid.length) { invalid[0].focus(); return; }
      if (!window.fetch) { form.submit(); return; }

      form.classList.add('is-loading');
      const original = label?.textContent;
      if (label) label.textContent = 'Sending…';
      status.textContent = '';
      status.className = 'form-status';

      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Request failed');

        form.reset();
        if (counter) counter.textContent = `0 / ${message.maxLength}`;
        status.textContent = 'Thanks! Your message has been sent — I’ll get back to you soon.';
        status.classList.add('is-success');
        showToast('Message sent successfully ✓');
      } catch (err) {
        status.textContent = 'Sorry, something went wrong. Please try again or email me directly.';
        status.classList.add('is-error');
        showToast('Message could not be sent');
      } finally {
        form.classList.remove('is-loading');
        if (label) label.textContent = original;
      }
    });
  }

  /* ---------- Copy to clipboard ---------- */
  function initCopy() {
    $$('.copy-btn').forEach((btn) => btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        showToast(`Copied: ${value}`);
        const icon = $('i', btn);
        if (icon) {
          icon.className = 'fa-solid fa-check';
          setTimeout(() => { icon.className = 'fa-regular fa-copy'; }, 1600);
        }
      } catch (e) {
        showToast('Copy not available — please copy manually');
      }
    }));
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- Boot ---------- */
  safely('preloader', initPreloader);
  safely('theme', initTheme);
  safely('nav', initNav);
  safely('stats', initStats);
  safely('projects', initProjects);
  safely('skills', initSkills);
  safely('modal', initModal);
  safely('reveal', initReveal);
  safely('typed', initTyped);
  safely('hero canvas', initHeroCanvas);
  safely('pointer effects', initPointerEffects);
  safely('contact form', initContactForm);
  safely('copy', initCopy);
  safely('year', initYear);
})();
