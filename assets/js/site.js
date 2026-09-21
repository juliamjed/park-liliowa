/* ==========================================================================
   PARK LILIOWA  ·  skrypt wspólny  ·  wersja 2
   1) konfiguracja   2) zgody i cookies   3) interfejs   4) ruch
   5) formularze i leady
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. KONFIGURACJA ------------------------------------------
     SHEETS_URL  — adres wdrożenia Google Apps Script (patrz _wdrozenie/).
                   Puste pole oznacza, że leady idą kanałem zapasowym.
     BACKUP_MAIL — zapasowy odbiorca przez formsubmit.co.
     GA_ID       — identyfikator Google Analytics 4.
  --------------------------------------------------------------------- */
  var CFG = {
    SHEETS_URL: '',
    BACKUP_MAIL: 'natalie@grupat44.pl',
    GA_ID: 'G-PK3Y3Y2Q5E',
    CONSENT_VERSION: '2026-09'
  };
  window.PL_CFG = CFG;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 2. ZGODY I COOKIES (Google Consent Mode v2) -------------- */
  var STORE = 'pl_consent_v1';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted',
    security_storage: 'granted', wait_for_update: 500
  });

  function readConsent() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; }
  }
  function loadGA() {
    if (!CFG.GA_ID || window.__plGa) return;
    window.__plGa = true;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', CFG.GA_ID, { anonymize_ip: true });
  }
  function applyConsent(c) {
    gtag('consent', 'update', {
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied',
      analytics_storage: c.analytics ? 'granted' : 'denied'
    });
    if (c.analytics || c.marketing) loadGA();
  }
  function saveConsent(c) {
    c.ts = new Date().toISOString(); c.v = CFG.CONSENT_VERSION;
    try { localStorage.setItem(STORE, JSON.stringify(c)); } catch (e) {}
    applyConsent(c);
    var bar = $('#cookiebar'); if (bar) bar.classList.remove('is-open');
  }
  var saved = readConsent();
  if (saved) applyConsent(saved);

  function track(name, params) { try { gtag('event', name, params || {}); } catch (e) {} }
  window.plTrack = track;

  /* ---------- 3. INTERFEJS --------------------------------------------- */
  function ui() {
    /* baner cookies */
    var bar = $('#cookiebar');
    if (bar && !saved) setTimeout(function () { bar.classList.add('is-open'); }, 1100);
    $$('[data-consent]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-consent');
        saveConsent({ analytics: v !== 'reject', marketing: v === 'all' });
      });
    });
    $$('[data-consent-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); if (bar) bar.classList.add('is-open'); });
    });

    /* menu */
    var nav = $('#nav'), burger = $('#burger');
    if (nav && burger) {
      burger.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      $$('#nav .nav__links a').forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    /* lightbox */
    var lb = $('#lightbox');
    if (lb) {
      var lbImg = $('#lightbox-img');
      $$('[data-zoom]').forEach(function (el) {
        el.addEventListener('click', function () {
          var i = el.querySelector('img'); if (!i) return;
          lbImg.src = i.getAttribute('data-full') || i.currentSrc || i.src;
          lbImg.alt = i.alt || '';
          lb.classList.add('is-open');
          document.body.style.overflow = 'hidden';
        });
      });
      lb.addEventListener('click', function () { lb.classList.remove('is-open'); document.body.style.overflow = ''; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { lb.classList.remove('is-open'); document.body.style.overflow = ''; }
      });
    }

    /* rozwijanie pełnej treści zgód */
    $$('.consent__more').forEach(function (b) {
      b.addEventListener('click', function () {
        var box = document.getElementById(b.getAttribute('aria-controls'));
        if (!box) return;
        if (box.hasAttribute('hidden')) { box.removeAttribute('hidden'); b.textContent = 'zwiń'; }
        else { box.setAttribute('hidden', ''); b.textContent = 'rozwiń'; }
      });
    });

    /* wybór lokalu z tabeli przenosi do formularza */
    $$('[data-lokal]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var sel = $('#lokal'); if (sel) sel.value = b.getAttribute('data-lokal');
        var t = $('#kontakt'); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        if (sel) setTimeout(function () { sel.focus({ preventScroll: true }); }, 600);
        track('select_item', { item_id: b.getAttribute('data-lokal') });
      });
    });

    $$('a[href^="tel:"]').forEach(function (a) { a.addEventListener('click', function () { track('click_phone'); }); });
    $$('a[href^="mailto:"]').forEach(function (a) { a.addEventListener('click', function () { track('click_email'); }); });
  }

  /* ---------- 4. RUCH --------------------------------------------------- */
  function motion() {
    var nav = $('#nav'), progress = $('#progress');
    var sections = $$('main section[id]');
    var navLinks = $$('#nav .nav__links a[href^="#"]');
    var parallax = $$('.parallax');
    var stories = $$('.story');
    var marks = [25, 50, 75], hit = {};
    var ticking = false, sweepTick = false;

    function onScroll() {
      var y = window.pageYOffset;
      var h = document.documentElement;

      if (nav) nav.classList.toggle('is-stuck', y > 24);

      if (progress) {
        var max = h.scrollHeight - h.clientHeight;
        progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }

      /* podświetlenie aktywnej sekcji w menu */
      if (navLinks.length) {
        var cur = '';
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= 140) cur = sections[i].id;
        }
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur);
        });
      }

      /* parallax */
      if (!reduce) {
        parallax.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
          var speed = parseFloat(el.getAttribute('data-speed') || '0.12');
          var off = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
          el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
        });
      }

      /* kroki opowieści ze zmianą zdjęcia */
      stories.forEach(function (st) {
        var steps = $$('.story__step', st), imgs = $$('.story__media img', st);
        var active = 0;
        steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < window.innerHeight * 0.55) active = i; });
        steps.forEach(function (s, i) { s.classList.toggle('is-on', i === active); });
        imgs.forEach(function (im, i) { im.classList.toggle('is-on', i === active); });
      });

      var p = (h.scrollHeight - h.clientHeight) > 0 ? y / (h.scrollHeight - h.clientHeight) * 100 : 0;
      marks.forEach(function (m) { if (p >= m && !hit[m]) { hit[m] = 1; track('scroll_depth', { percent: m }); } });

      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    /* wejście sekcji z opóźnieniem kaskadowym */
    var pending = $$('[data-reveal]');
    pending.forEach(function (el) {
      if (!el.style.getPropertyValue('--d')) {
        var g = el.parentElement;
        var idx = g ? Array.prototype.indexOf.call(g.children, el) : 0;
        el.style.setProperty('--d', Math.min(idx, 6) * 70 + 'ms');
      }
    });
    if (reduce) {
      pending.forEach(function (el) { el.classList.add('is-in'); });
      pending = [];
    }
    function sweep() {
      if (!pending.length) return;
      var limit = window.innerHeight * 0.92;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < limit) { el.classList.add('is-in'); return false; }
        return true;
      });
    }
    window.addEventListener('scroll', function () {
      if (!sweepTick) { sweepTick = true; requestAnimationFrame(function () { sweepTick = false; sweep(); }); }
    }, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    window.addEventListener('load', sweep);
    setTimeout(sweep, 60);
    setTimeout(sweep, 600);

    /* liczniki */
    var counters = $$('[data-count]');
    if (counters.length && 'IntersectionObserver' in window && !reduce) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target; co.unobserve(el);
          var to = parseFloat(el.getAttribute('data-count'));
          var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
          var pre = el.getAttribute('data-pre') || '';
          var suf = el.getAttribute('data-suf') || '';
          var t0 = performance.now(), dur = 1300;
          (function step(now) {
            var k = Math.min(1, (now - t0) / dur);
            var v = to * (1 - Math.pow(1 - k, 3));
            el.textContent = pre + v.toLocaleString('pl-PL', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
            if (k < 1) requestAnimationFrame(step);
          })(t0);
        });
      }, { threshold: .4 });
      counters.forEach(function (el) { co.observe(el); });
    } else {
      counters.forEach(function (el) {
        var to = parseFloat(el.getAttribute('data-count'));
        var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
        el.textContent = (el.getAttribute('data-pre') || '') +
          to.toLocaleString('pl-PL', { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
          (el.getAttribute('data-suf') || '');
      });
    }
  }

  /* ---------- 5. FORMULARZE I LEADY ------------------------------------ */
  function utm() {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(function (k) {
      var v = q.get(k); if (v) o[k] = v;
    });
    try {
      if (Object.keys(o).length) sessionStorage.setItem('pl_utm', JSON.stringify(o));
      else { var s = sessionStorage.getItem('pl_utm'); if (s) o = JSON.parse(s); }
    } catch (e) {}
    return o;
  }

  function consentsOf(form) {
    return $$('input[type=checkbox][data-consent-text]', form).map(function (c) {
      return (c.checked ? 'TAK' : 'NIE') + ': ' + c.getAttribute('data-consent-text');
    }).join(' | ');
  }

  function validate(form) {
    var ok = true;
    $$('.is-invalid', form).forEach(function (e) { e.classList.remove('is-invalid'); });
    $$('[required]', form).forEach(function (el) {
      var bad = (el.type === 'checkbox') ? !el.checked : !String(el.value || '').trim();
      if (el.type === 'radio') bad = !form.querySelector('input[name="' + el.name + '"]:checked');
      if (!bad && el.type === 'email') bad = !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(el.value.trim());
      if (!bad && el.type === 'tel') bad = String(el.value).replace(/\D/g, '').length < 9;
      if (bad) { ok = false; (el.closest('.field') || el.closest('.consent') || el).classList.add('is-invalid'); }
    });
    if (!ok) {
      var f = $('.is-invalid', form);
      if (f) f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    return ok;
  }

  function payload(form) {
    var fd = new FormData(form), o = {};
    fd.forEach(function (v, k) { if (k.charAt(0) !== '_' && k !== 'hp_field') o[k] = v; });
    o.zgody = consentsOf(form);
    o.formularz = form.getAttribute('data-form') || 'kontakt';
    o.strona = location.pathname;
    o.url = location.href;
    o.referrer = document.referrer || '';
    o.data = new Date().toISOString();
    Object.assign(o, utm());
    return o;
  }

  function toSheets(data) {
    if (!CFG.SHEETS_URL) return Promise.reject(new Error('brak SHEETS_URL'));
    return fetch(CFG.SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    }).then(function () { return true; });
  }

  function toBackup(data) {
    if (!CFG.BACKUP_MAIL) return Promise.reject(new Error('brak adresu zapasowego'));
    var body = Object.assign({
      _subject: 'Park Liliowa: nowe zapytanie (' + (data.formularz || '') + ')',
      _template: 'table', _captcha: 'false'
    }, data);
    return fetch('https://formsubmit.co/ajax/' + CFG.BACKUP_MAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error('formsubmit ' + r.status); return true; });
  }

  function forms() {
    $$('form[data-form]').forEach(function (form) {
      var msg = form.querySelector('.form-msg');
      var btn = form.querySelector('[type=submit]');
      var label = btn ? btn.innerHTML : '';

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var hp = form.querySelector('[name=hp_field]');
        if (hp && hp.value) return;
        if (!validate(form)) return;

        var data = payload(form);
        if (btn) { btn.disabled = true; btn.innerHTML = 'Wysyłanie…'; }
        if (msg) { msg.className = 'form-msg'; msg.textContent = ''; }

        toSheets(data)
          .catch(function () { return toBackup(data); })
          .then(function () {
            track('generate_lead', {
              form: data.formularz,
              lokal: data.Lokal || '',
              zgoda_marketing: /TAK: Zgoda marketingowa/.test(data.zgody || '') ? 1 : 0
            });
            if (msg) {
              msg.className = 'form-msg is-ok';
              msg.textContent = form.getAttribute('data-thanks') ||
                'Dziękujemy. Zapytanie zostało wysłane, odezwiemy się w ciągu jednego dnia roboczego.';
            }
            form.reset();
            var file = form.getAttribute('data-file');
            if (file) {
              var a = document.createElement('a');
              a.href = file; a.download = ''; a.rel = 'noopener';
              document.body.appendChild(a); a.click(); a.remove();
              track('file_download', { file: file });
            }
          })
          .catch(function () {
            if (msg) {
              msg.className = 'form-msg is-err';
              msg.innerHTML = 'Nie udało się wysłać formularza. Zadzwoń: <a href="tel:+48530733774">+48 530 733 774</a> ' +
                'lub napisz na <a href="mailto:' + CFG.BACKUP_MAIL + '">' + CFG.BACKUP_MAIL + '</a>.';
            }
          })
          .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { ui(); motion(); forms(); });
})();
