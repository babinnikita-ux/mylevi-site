(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const video = document.getElementById('hero-video');
  const scene = document.getElementById('scene');
  const toggle = document.querySelector('.motion-toggle');
  const label = document.querySelector('.motion-label');
  const status = document.getElementById('motion-status');
  let optedIn = false;
  let wanted = !reduced.matches && !compact.matches && !(connection && connection.saveData);
  let inView = true;
  let playAttempt = 0;
  let videoFailed = false;
  let pendingUserAnnouncement = false;
  const setState = (playing) => {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(playing));
    label.textContent = playing ? 'Пауза' : (videoFailed ? 'Повторить видео' : 'Включить движение');
  };
  const announce = (text) => { if (status) status.textContent = text; };
  const updatePlayback = async () => {
    if (!video || !toggle) return;
    const attempt = ++playAttempt;
    if (!wanted || !inView || document.hidden) {
      video.pause();
      setState(false);
      return;
    }
    if (!video.getAttribute('src') || videoFailed) {
      videoFailed = false;
      video.src = video.dataset.src;
      video.muted = true;
      video.load();
    }
    try {
      await video.play();
      if (attempt !== playAttempt) return;
      setState(true);
      if (pendingUserAnnouncement) {
        announce('Фоновое движение включено.');
        pendingUserAnnouncement = false;
      }
    } catch (_) {
      if (attempt !== playAttempt) return;
      setState(false);
      if (pendingUserAnnouncement) {
        announce('Видео не запустилось. Можно попробовать ещё раз.');
        pendingUserAnnouncement = false;
      }
    }
  };
  if (video && scene && toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      wanted = video.paused;
      optedIn = wanted;
      pendingUserAnnouncement = wanted;
      if (!wanted) announce('Фоновое движение приостановлено.');
      updatePlayback();
    });
    video.addEventListener('play', () => setState(true));
    video.addEventListener('pause', () => setState(false));
    video.addEventListener('error', () => {
      videoFailed = true;
      wanted = false;
      playAttempt++;
      video.pause();
      setState(false);
      if (pendingUserAnnouncement) {
        announce('Не удалось загрузить видео. Можно попробовать ещё раз.');
        pendingUserAnnouncement = false;
      }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        updatePlayback();
      }, { threshold: 0.05 }).observe(scene);
    }
    document.addEventListener('visibilitychange', updatePlayback);
    updatePlayback();
  }
  let revealObserver;
  const startReveals = () => {
    if (revealObserver) revealObserver.disconnect();
    if (reduced.matches || !('IntersectionObserver' in window)) {
      document.documentElement.classList.remove('js-motion');
      return;
    }
    document.documentElement.classList.add('js-motion');
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -35px 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => revealObserver.observe(el));
  };
  startReveals();
  const preferenceChanged = () => {
    if (reduced.matches || (!optedIn && (compact.matches || (connection && connection.saveData)))) wanted = false;
    updatePlayback();
    startReveals();
  };
  if (reduced.addEventListener) reduced.addEventListener('change', preferenceChanged);
  if (compact.addEventListener) compact.addEventListener('change', preferenceChanged);
  if (connection && connection.addEventListener) connection.addEventListener('change', preferenceChanged);
  if ('IntersectionObserver' in window) {
    const navLinks = [...document.querySelectorAll('.header nav a')];
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const active = link.hash === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-10% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('#projects, #about, #contact').forEach((el) => navObserver.observe(el));
  }
})();
