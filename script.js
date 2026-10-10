// ── Cursor Trail Effect ────────────────────────────────────────────────────
class CursorTrailEffect {
  constructor(style = 'dots') {
    this.mouseX = 0;
    this.mouseY = 0;
    this.style  = style;
    this.container = null;
    this.dots   = [];
    this.animId = null;
    this._spawnActive = false;

    document.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    this._init();
  }

  _clearContainer() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    this._spawnActive = false;
    if (this.container) { this.container.innerHTML = ''; }
    this.dots = [];
  }

  _init() {
    this._clearContainer();
    if (this.style === 'off') return;

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'cursor-trail';
      // These inline styles are required: without position:fixed the container
      // isn't a positioned ancestor, so child left/top values do nothing.
      Object.assign(this.container.style, {
        position:      'fixed',
        top:           '0',
        left:          '0',
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        '9999',
        overflow:      'hidden'
      });
      document.body.appendChild(this.container);
    }

    if      (this.style === 'dots')     this._initDots();
    else if (this.style === 'sparkles') this._initSparkles();
    else if (this.style === 'comet')    this._initComet();
  }

  _initDots() {
    const length = 12, speed = 0.2;
    this.dots = Array.from({ length }, (_, i) => {
      const dot = document.createElement('div');
      dot.className = 'cursor-trail-dot';
      const size = 8;
      dot.style.width  = size + 'px';
      dot.style.height = size + 'px';
      dot.style.opacity = (1 - i / length).toFixed(2);
      // position:fixed is required — without it left/top are ignored (static default).
      Object.assign(dot.style, {
        position:     'fixed',
        borderRadius: '50%',
        background:   'var(--primary-color, #00CED1)',
        transform:    'translate(-50%, -50%)',
        pointerEvents:'none'
      });
      this.container.appendChild(dot);
      return { el: dot, x: 0, y: 0 };
    });
    const animate = () => {
      this.dots.forEach((dot, i) => {
        const target = i === 0 ? { x: this.mouseX, y: this.mouseY } : this.dots[i - 1];
        dot.x += (target.x - dot.x) * speed;
        dot.y += (target.y - dot.y) * speed;
        dot.el.style.left = dot.x + 'px';
        dot.el.style.top  = dot.y + 'px';
      });
      this.animId = requestAnimationFrame(animate);
    };
    this.animId = requestAnimationFrame(animate);
  }

  _initSparkles() {
    this._spawnActive = true;
    const glyphs = ['✦', '✧', '★', '⋆', '✺', '·', '✼'];
    const spawn = () => {
      if (!this._spawnActive) return;
      const s = document.createElement('div');
      s.className = 'cursor-trail-sparkle';
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      // position:fixed is required so left/top resolve against the viewport
      // (matching the clientX/clientY values we're using).
      Object.assign(s.style, {
        position:     'fixed',
        color:        'var(--primary-color, #00CED1)',
        fontSize:     '16px',
        lineHeight:   '1',
        pointerEvents:'none',
        userSelect:   'none'
      });
      const offsetX = (Math.random() - 0.5) * 24;
      const offsetY = (Math.random() - 0.5) * 24;
      s.style.left = (this.mouseX + offsetX) + 'px';
      s.style.top  = (this.mouseY + offsetY) + 'px';
      this.container.appendChild(s);
      const riseY = -(30 + Math.random() * 40);
      const rot   = (Math.random() - 0.5) * 360;
      s.animate([
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1) rotate(0deg)' },
        { opacity: 0, transform: `translate(-50%, calc(-50% + ${riseY}px)) scale(0.2) rotate(${rot}deg)` }
      ], { duration: 500 + Math.random() * 400, easing: 'ease-out' })
        .onfinish = () => s.remove();
      setTimeout(spawn, 55);
    };
    spawn();
  }

  _initComet() {
    const length = 22, speed = 0.13;
    this.dots = Array.from({ length }, (_, i) => {
      const dot = document.createElement('div');
      dot.className = 'cursor-trail-dot cursor-trail-comet';
      const size = Math.max(2, 11 - i * 0.42);
      dot.style.width   = size + 'px';
      dot.style.height  = size + 'px';
      dot.style.opacity = (1 - i / length).toFixed(2);
      Object.assign(dot.style, {
        position:     'fixed',
        borderRadius: '50%',
        background:   'var(--primary-color, #00CED1)',
        transform:    'translate(-50%, -50%)',
        boxShadow:    '0 0 6px 2px rgba(0,206,209,0.45)',
        pointerEvents:'none'
      });
      this.container.appendChild(dot);
      return { el: dot, x: 0, y: 0 };
    });
    const animate = () => {
      this.dots.forEach((dot, i) => {
        const target = i === 0 ? { x: this.mouseX, y: this.mouseY } : this.dots[i - 1];
        dot.x += (target.x - dot.x) * speed;
        dot.y += (target.y - dot.y) * speed;
        dot.el.style.left = dot.x + 'px';
        dot.el.style.top  = dot.y + 'px';
      });
      this.animId = requestAnimationFrame(animate);
    };
    this.animId = requestAnimationFrame(animate);
  }

  setStyle(style) {
    this.style = style;
    this._init();
  }
}
// ──────────────────────────────────────────────────────────────────────────────

const VISITOR_WEBHOOK = 'https://xenostopic-webhook.advikmukherjee077.workers.dev';

let hasUserInteracted = false;

function initMedia() {
  const mainAudio = document.getElementById('main-audio');
  const backgroundVideo = document.getElementById('background');
  if (!mainAudio || !backgroundVideo) return;
  mainAudio.volume = 0.3;
  backgroundVideo.muted  = true;
  backgroundVideo.play().catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  const startScreen        = document.getElementById('start-screen');
  const terminalWindow     = document.getElementById('terminal-window');
  const profileName        = document.getElementById('profile-name');
  const profileBio         = document.getElementById('profile-bio');
  const visitorCount       = document.getElementById('visitor-count');
  const mainAudio          = document.getElementById('main-audio');
  const homeButton         = document.getElementById('home-theme');
  const animeButton        = document.getElementById('anime-theme');
  const volumeIcon         = document.getElementById('volume-icon');
  const volumeSlider       = document.getElementById('volume-slider');
  const transparencySlider = document.getElementById('transparency-slider');
  const backgroundVideo    = document.getElementById('background');
  const glitchOverlay      = document.querySelector('.glitch-overlay');
  const profileBlock       = document.getElementById('profile-block');
  const presenceDot        = document.getElementById('presence-dot');
  const presenceText       = document.getElementById('presence-text');
  const profilePicture     = document.querySelector('.profile-picture');
  const profileContainer   = document.querySelector('.profile-container');
  const trailBtn           = document.getElementById('trail-btn');

  // ── Music-player control refs ────────────────────────────────────────────
  const songTitleEl  = document.getElementById('song-title');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnSeekBack  = document.getElementById('btn-seek-back');
  const btnSeekFwd   = document.getElementById('btn-seek-fwd');
  const btnSkip      = document.getElementById('btn-skip');
  const btnLoop      = document.getElementById('btn-loop');
  const seekBar        = document.getElementById('seek-bar');
  const currentTimeEl  = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');

  // ── Discord Presence (Lanyard) ─────────────────────────────────────────────
  const DISCORD_USER_ID = '1546261644261327021';
  let lastOnlineTimestamp = parseInt(localStorage.getItem('lastOnlineTimestamp')) || null;

  function formatLastSeen(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)    return `last seen ${diff} second${diff !== 1 ? 's' : ''} ago`;
    if (diff < 3600)  { const m = Math.floor(diff / 60);  return `last seen ${m} minute${m !== 1 ? 's' : ''} ago`; }
    if (diff < 86400) { const h = Math.floor(diff / 3600); return `last seen ${h} hour${h !== 1 ? 's' : ''} ago`; }
    const d = Math.floor(diff / 86400); return `last seen ${d} day${d !== 1 ? 's' : ''} ago`;
  }

  function updatePresenceUI(status) {
    presenceDot.className = 'presence-dot ' + status;
    if      (status === 'online') presenceText.textContent = 'Online';
    else if (status === 'idle')   presenceText.textContent = 'Idle';
    else if (status === 'dnd')    presenceText.textContent = 'Do Not Disturb';
    else presenceText.textContent = lastOnlineTimestamp ? formatLastSeen(lastOnlineTimestamp) : 'Offline';
  }

  async function fetchPresence() {
    try {
      const res  = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
      const data = await res.json();
      if (!data.success) return;
      const status = data.data.discord_status;
      if (status !== 'offline') {
        lastOnlineTimestamp = Date.now();
        localStorage.setItem('lastOnlineTimestamp', lastOnlineTimestamp);
      }
      updatePresenceUI(status);
    } catch (err) {
      console.error('Lanyard fetch failed:', err);
    }
  }

  fetchPresence();
  setInterval(fetchPresence, 30000);
  setInterval(() => {
    if (presenceDot.classList.contains('offline') && lastOnlineTimestamp) {
      presenceText.textContent = formatLastSeen(lastOnlineTimestamp);
    }
  }, 60000);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Custom cursor ──────────────────────────────────────────────────────────
  const cursor      = document.querySelector('.custom-cursor');
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  if (isTouchDevice) {
    document.body.classList.add('touch-device');
    document.addEventListener('touchstart', e => {
      cursor.style.left    = e.touches[0].clientX + 'px';
      cursor.style.top     = e.touches[0].clientY + 'px';
      cursor.style.display = 'block';
    });
    document.addEventListener('touchmove', e => {
      cursor.style.left    = e.touches[0].clientX + 'px';
      cursor.style.top     = e.touches[0].clientY + 'px';
      cursor.style.display = 'block';
    });
    document.addEventListener('touchend', () => { cursor.style.display = 'none'; });
  } else {
    document.addEventListener('mousemove', e => {
      cursor.style.left    = e.clientX + 'px';
      cursor.style.top     = e.clientY + 'px';
      cursor.style.display = 'block';
    });
    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'scale(0.8) translate(-50%, -50%)';
    });
    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'scale(1) translate(-50%, -50%)';
    });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Starfield background ─────────────────────────────────────────────────
  (function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let w, h;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.floor((w * h) / 2600);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        baseAlpha: Math.random() * 0.6 + 0.25,
        twinkleSpeed: Math.random() * 0.015 + 0.004,
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.05 + 0.01,
      }));
    }

    let raf;
    function tick(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed + s.phase) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, alpha))})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.y += s.drift;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    // Stop animating once the start screen is gone — no need to keep painting
    // stars behind the rest of the site forever.
    const observer = new MutationObserver(() => {
      const el = document.getElementById('start-screen');
      if (el && el.classList.contains('hidden')) {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        observer.disconnect();
      }
    });
    const startScreenEl = document.getElementById('start-screen');
    if (startScreenEl) observer.observe(startScreenEl, { attributes: true, attributeFilter: ['class'] });
  })();
  // ──────────────────────────────────────────────────────────────────────────

  // ── Visitor Counter ────────────────────────────────────────────────────────
  // counterapi.dev's v1 API (the one this used to call) was retired on
  // Aug 7, 2026 — every request now 404s, which is why the counter was stuck.
  // v2 requires a pre-registered account/workspace, so instead this now hits
  // a tiny self-hosted Cloudflare Worker (views-worker.js) backed by KV —
  // same pattern as VISITOR_WEBHOOK / IMAGE_HOST_UPLOAD_URL above, so it
  // won't silently break again if a third-party service changes its API.
  const COUNTER_URL       = 'https://twilight-dream-db36.advikmukherjee76.workers.dev/';
  const COUNTER_CACHE_KEY = 'xeno_lastCount';

  function fetchWithTimeout(url, opts = {}, ms = 6000) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  async function initializeVisitorCounter() {
    const cached = localStorage.getItem(COUNTER_CACHE_KEY);
    // Show cached count immediately — never a blank while loading
    if (cached) visitorCount.textContent = Number(cached).toLocaleString();

    try {
      const res = await fetchWithTimeout(COUNTER_URL);
      if (res.ok) {
        const data  = await res.json();
        const count = data.count ?? null;
        if (count !== null) {
          visitorCount.textContent = Number(count).toLocaleString();
          localStorage.setItem(COUNTER_CACHE_KEY, count);
          return;
        }
      }
    } catch (e) {
      console.warn('views counter worker failed:', e);
    }

    // Worker unreachable — keep the cached value or fall back to 0 on a brand-new visit.
    if (!cached) visitorCount.textContent = '0';
  }

  initializeVisitorCounter();
  // ──────────────────────────────────────────────────────────────────────────

  // ── Cursor trail style selector ────────────────────────────────────────────
  const trailStyles = ['dots', 'sparkles', 'comet', 'off'];
  const trailIcons  = { dots: '⬤', sparkles: '✦', comet: '☄', off: '⊘' };
  let trailStyleIdx = 0;
  let trailEffect   = null; // initialised after start screen click

  if (trailBtn) {
    trailBtn.textContent = trailIcons[trailStyles[trailStyleIdx]];
    trailBtn.title       = 'Cursor Trail Style';

    const cycleTrail = () => {
      trailStyleIdx = (trailStyleIdx + 1) % trailStyles.length;
      const style   = trailStyles[trailStyleIdx];
      trailBtn.textContent = trailIcons[style];
      if (trailEffect) trailEffect.setStyle(style);
    };
    trailBtn.addEventListener('click', cycleTrail);
    trailBtn.addEventListener('touchstart', e => { e.preventDefault(); cycleTrail(); });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Name typewriter ────────────────────────────────────────────────────────
  const name = 'Elite Hub';
  let nameText = '';
  let nameIndex = 0;
  let isNameDeleting = false;
  let nameCursorVisible = true;
  let nameCursorInterval = null;

  function typeWriterName() {
    if (!isNameDeleting && nameIndex < name.length) {
      nameText = name.slice(0, nameIndex + 1);
      nameIndex++;
    } else if (isNameDeleting && nameIndex > 0) {
      nameText = name.slice(0, nameIndex - 1);
      nameIndex--;
    } else if (nameIndex === name.length) {
      isNameDeleting = true;
      setTimeout(typeWriterName, 1800);
      return;
    } else if (nameIndex === 0) {
      isNameDeleting = false;
    }
    profileName.textContent = nameText + (nameCursorVisible ? '|' : ' ');
    if (Math.random() < 0.1) {
      profileName.classList.add('glitch');
      setTimeout(() => profileName.classList.remove('glitch'), 200);
    }
    setTimeout(typeWriterName, isNameDeleting ? 150 : 300);
  }

  function startNameCursorBlink() {
    if (nameCursorInterval) return;
    nameCursorInterval = setInterval(() => {
      nameCursorVisible = !nameCursorVisible;
      profileName.textContent = nameText + (nameCursorVisible ? '|' : ' ');
    }, 500);
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Bio typewriter ─────────────────────────────────────────────────────────
  const bioMessages = [
    'Gambling is always a 50/50, either you lose or you win!',
    'Lost in the static!'
  ];
  let bioText = '';
  let bioIndex = 0;
  let bioMessageIndex = 0;
  let isBioDeleting = false;
  let bioCursorVisible = true;
  let bioCursorInterval = null;

  function typeWriterBio() {
    const msg = bioMessages[bioMessageIndex];
    if (!isBioDeleting && bioIndex < msg.length) {
      bioText = msg.slice(0, bioIndex + 1);
      bioIndex++;
    } else if (isBioDeleting && bioIndex > 0) {
      bioText = msg.slice(0, bioIndex - 1);
      bioIndex--;
    } else if (bioIndex === msg.length) {
      isBioDeleting = true;
      setTimeout(typeWriterBio, 2000);
      return;
    } else if (bioIndex === 0 && isBioDeleting) {
      isBioDeleting = false;
      bioMessageIndex = (bioMessageIndex + 1) % bioMessages.length;
    }
    profileBio.textContent = bioText + (bioCursorVisible ? '|' : ' ');
    if (Math.random() < 0.1) {
      profileBio.classList.add('glitch');
      setTimeout(() => profileBio.classList.remove('glitch'), 200);
    }
    setTimeout(typeWriterBio, isBioDeleting ? 75 : 150);
  }

  function startBioCursorBlink() {
    if (bioCursorInterval) return;
    bioCursorInterval = setInterval(() => {
      bioCursorVisible = !bioCursorVisible;
      profileBio.textContent = bioText + (bioCursorVisible ? '|' : ' ');
    }, 500);
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Playlist system ──────────────────────────────────────────────────────
  // ✏️  CUSTOMISE SONG NAMES HERE
  //     Change the `name` value next to any track to whatever you want
  //     displayed in the player bar.  Change `src` if you rename a file.
  //
  //   home  → page 1 (background.mp4 theme)
  //   anime → page 2 (anime_background.mp4 theme)
  // ─────────────────────────────────────────────────────────────────────────
  const playlists = {
    home: [
      { src: 'assets/third_song.mp3',       name: 'Billie Jeans'   },  // ← cover song (plays first)
      { src: 'assets/background_music.mp3', name: 'Random Song'    },
    ],
    anime: [
      { src: 'assets/fourth_song.mp3',      name: 'Subway Sexist V2' },  // ← cover song (plays first)
      { src: 'assets/anime_music.mp3',      name: 'Random Song 2'  },
    ]
  };
  // ─────────────────────────────────────────────────────────────────────────

  let currentThemeKey = 'home';
  let currentTrackIdx = 0;
  let isPlaying       = false;
  let isMuted         = false;
  let loopEnabled     = true;   // loop the current song by default

  mainAudio.volume = parseFloat(volumeSlider.value);

  function loadTrack(idx) {
    const list      = playlists[currentThemeKey];
    currentTrackIdx = ((idx % list.length) + list.length) % list.length;
    const track     = list[currentTrackIdx];
    mainAudio.src   = track.src;
    mainAudio.load();
    if (songTitleEl) songTitleEl.textContent = '\u266a ' + track.name;
    // Reset seek bar for the new track
    if (seekBar)        { seekBar.value = 0; seekBar.style.setProperty('--seek-pct', '0%'); }
    if (currentTimeEl)  currentTimeEl.textContent  = '0:00';
    if (durationTimeEl) durationTimeEl.textContent = '0:00';
  }

  function playAudio() {
    mainAudio.muted  = isMuted;
    mainAudio.volume = parseFloat(volumeSlider.value);
    mainAudio.play().then(() => {
      isPlaying = true;
      if (btnPlayPause) btnPlayPause.textContent = '\u23f8';
    }).catch(() => {});
  }

  function pauseAudio() {
    mainAudio.pause();
    isPlaying = false;
    if (btnPlayPause) btnPlayPause.textContent = '\u25b6';
  }

  // Auto-advance or loop when a track finishes
  mainAudio.addEventListener('ended', () => {
    if (loopEnabled) {
      mainAudio.currentTime = 0;
      playAudio();
    } else {
      loadTrack(currentTrackIdx + 1);
      playAudio();
    }
  });
  // ────────────────────────────────────────────────────────────────────────

  // ── Audio controls (volume icon + slider) ────────────────────────────────
  const muteIcon   = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>`;
  const unmuteIcon = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;

  const toggleMute = () => {
    isMuted              = !isMuted;
    mainAudio.muted      = isMuted;
    volumeIcon.innerHTML = isMuted ? muteIcon : unmuteIcon;
  };

  volumeIcon.addEventListener('click',      toggleMute);
  volumeIcon.addEventListener('touchstart', e => { e.preventDefault(); toggleMute(); });

  volumeSlider.addEventListener('input', () => {
    mainAudio.volume     = parseFloat(volumeSlider.value);
    isMuted              = false;
    mainAudio.muted      = false;
    volumeIcon.innerHTML = unmuteIcon;
  });
  // ────────────────────────────────────────────────────────────────────────

  // ── Player buttons (-5 / play-pause / +5 / skip) ─────────────────────────
  if (btnPlayPause) {
    const togglePlay = () => isPlaying ? pauseAudio() : playAudio();
    btnPlayPause.addEventListener('click',      togglePlay);
    btnPlayPause.addEventListener('touchstart', e => { e.preventDefault(); togglePlay(); });
  }
  if (btnSeekBack) {
    const doSeekBack = () => { mainAudio.currentTime = Math.max(0, mainAudio.currentTime - 5); };
    btnSeekBack.addEventListener('click',      doSeekBack);
    btnSeekBack.addEventListener('touchstart', e => { e.preventDefault(); doSeekBack(); });
  }
  if (btnSeekFwd) {
    const doSeekFwd = () => {
      const cap = isFinite(mainAudio.duration) ? mainAudio.duration : mainAudio.currentTime + 5;
      mainAudio.currentTime = Math.min(cap, mainAudio.currentTime + 5);
    };
    btnSeekFwd.addEventListener('click',      doSeekFwd);
    btnSeekFwd.addEventListener('touchstart', e => { e.preventDefault(); doSeekFwd(); });
  }
  if (btnSkip) {
    const doSkip = () => { loadTrack(currentTrackIdx + 1); if (isPlaying) playAudio(); };
    btnSkip.addEventListener('click',      doSkip);
    btnSkip.addEventListener('touchstart', e => { e.preventDefault(); doSkip(); });
  }

  // ── Loop toggle button ────────────────────────────────────────────────────
  if (btnLoop) {
    const updateLoopBtn = () => {
      btnLoop.style.opacity = loopEnabled ? '1' : '0.35';
      btnLoop.style.color   = loopEnabled ? 'var(--primary-color, #00CED1)' : 'white';
      btnLoop.title = loopEnabled ? 'Loop: On (click to turn off)' : 'Loop: Off (click to turn on)';
    };
    updateLoopBtn();

    const toggleLoop = () => {
      loopEnabled = !loopEnabled;
      updateLoopBtn();
    };
    btnLoop.addEventListener('click',      toggleLoop);
    btnLoop.addEventListener('touchstart', e => { e.preventDefault(); toggleLoop(); });
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Seek bar ─────────────────────────────────────────────────────────────
  function formatTime(s) {
    if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  // Show total duration as soon as the browser has the metadata
  mainAudio.addEventListener('loadedmetadata', () => {
    if (durationTimeEl) durationTimeEl.textContent = formatTime(mainAudio.duration);
  });

  // Keep bar + current-time in sync while playing
  mainAudio.addEventListener('timeupdate', () => {
    if (!mainAudio.duration || !isFinite(mainAudio.duration)) return;
    const pct = (mainAudio.currentTime / mainAudio.duration) * 100;
    if (seekBar) {
      seekBar.value = pct;
      seekBar.style.setProperty('--seek-pct', pct + '%');
    }
    if (currentTimeEl) currentTimeEl.textContent = formatTime(mainAudio.currentTime);
  });

  if (seekBar) {
    // Scrub on drag
    seekBar.addEventListener('input', () => {
      const pct = parseFloat(seekBar.value);
      seekBar.style.setProperty('--seek-pct', pct + '%');
      if (isFinite(mainAudio.duration)) {
        mainAudio.currentTime = (pct / 100) * mainAudio.duration;
      }
    });
    // Prevent seek-bar touches from triggering the card tilt
    seekBar.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    seekBar.addEventListener('touchmove',  e => e.stopPropagation(), { passive: true });
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Self-Hosted Git Replica block & page-scroll system ──────────────────────
  const gitBlock    = document.getElementById('git-block');
  const contactBlock   = document.getElementById('contact-block');
  const imageHostBlock = document.getElementById('imagehost-block');
  const scrollHint     = document.getElementById('scroll-hint');
  const pageDot0       = document.getElementById('page-dot-0');
  const pageDot1       = document.getElementById('page-dot-1');
  const pageDot2       = document.getElementById('page-dot-2');
  const pageDot3       = document.getElementById('page-dot-3');

  // ── Repo stats counter (clones / downloads) ─────────────────────────────────
  // Same self-hosted Cloudflare Worker + KV pattern as COUNTER_URL above, see
  // repo-stats-worker.js. Leave blank to disable the counter — everything
  // else on the repo cards keeps working, it just won't show clone/download
  // numbers.
  const REPO_STATS_URL = 'https://xenostopic-repo-stats.advikmukherjee76.workers.dev/'; // e.g. 'https://xenostopic-repo-stats.YOUR-SUBDOMAIN.workers.dev/'

  async function fetchRepoStats(id, hit) {
    if (!REPO_STATS_URL) return null;
    const qs = new URLSearchParams({ repo: id });
    if (hit) qs.set('hit', hit);
    try {
      const res = await fetchWithTimeout(`${REPO_STATS_URL}?${qs.toString()}`, { cache: 'no-store' }, 6000);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`[xeno/repo-stats] failed for ${id}:`, e.message);
    }
    return null;
  }

  async function fetchAllRepoStats() {
    if (!REPO_STATS_URL) return null;
    try {
      const res = await fetchWithTimeout(`${REPO_STATS_URL}?all=1`, { cache: 'no-store' }, 6000);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[xeno/repo-stats] aggregate fetch failed:', e.message);
    }
    return null;
  }

  // ── Line-count helper (fully local — no third-party APIs) ──────────────────
  // repo-meta/<profile>/<id>.json is written by build-repos.sh from the repo's own
  // files, so this never leaves the site's own host.
  async function fetchLineCount(id) {
    try {
      const res = await fetchWithTimeout(`repo-meta/cyber/${id}.json`, { cache: 'no-store' }, 6000);
      if (res.ok) {
        const meta = await res.json();
        if (typeof meta.lines === 'number' && meta.lines > 0) {
          return { count: meta.lines, estimated: false };
        }
      }
    } catch (e) {
      console.warn(`[xeno/lines] meta.json missing for ${id}:`, e.message);
    }
    return null;
  }

  // ── stuff.txt driven repo cards ────────────────────────────────────────────
  // stuff.txt only lists which repos/<dir> folders to show, in what order.
  // Everything else — name, icon, tags, README and line count — is pulled
  // is pulled straight from that folder by loadRepoConfig() below, the same
  // way a host would derive a repo card from an owner/repo pair, except it's
  // all local files instead of an API call.
  let REPO_CONFIGS = [];  // [{ id }] — one per [repo] block in stuff.txt
  let REPO_DETAILS = {};  // { id: { name, tags, dir, readmeUrl, icon, image } }

  function parseStuffTxt(text) {
    const configs = [];
    const blocks = text.split(/\n\s*\[repo\]/i).slice(1); // drop header/comments before first [repo]
    for (const block of blocks) {
      const fields = {};
      block.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim().toLowerCase();
        const val = line.slice(idx + 1).trim();
        fields[key] = val;
      });
      const dir = fields.dir || fields.id; // `id` kept as an alias for older stuff.txt files
      if (!dir) continue;
      configs.push({ id: dir, dir });
    }
    return configs;
  }

  // Fetches repos/<dir>/repo.json for display metadata. Missing file (or
  // missing fields in it) just falls back to sane defaults — a repo.json
  // is optional, not required, same as stuff.txt says.
  async function fetchRepoManifest(dir) {
    try {
      const res = await fetchWithTimeout(`repos/${dir}/repo.json`, { cache: 'no-store' }, 5000);
      if (res.ok) return await res.json();
    } catch (_) {}
    return {};
  }

  async function loadRepoDetails(configs) {
    const details = {};
    await Promise.all(configs.map(async ({ id, dir }) => {
      const manifest = await fetchRepoManifest(dir);
      const tags = Array.isArray(manifest.tags) ? manifest.tags.filter(Boolean) : [];
      details[id] = {
        name:      manifest.name || dir,
        tags:      tags.length ? tags : ['placeholder'],
        dir,
        readmeUrl: `repos/${dir}/README.md`,
        icon:      manifest.icon || '📦',
        image:     manifest.image || '',
      };
    }));
    return details;
  }

  function renderRepoCards() {
    const grid = document.getElementById('gh-repos');
    if (!grid) return;

    const order = Object.keys(REPO_DETAILS);
    grid.innerHTML = order.map(id => {
      const d = REPO_DETAILS[id];
      const iconImg = d.image
        ? `<img class="repo-icon" src="${d.image}" alt="${d.name}"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="repo-icon-fallback" style="display:none">${d.icon}</div>`
        : `<div class="repo-icon-fallback" style="display:flex">${d.icon}</div>`;
      const dirLine = `repos/${d.dir}`;
      return `
                <div class="repo-card" data-repo-id="${id}">
                    <div class="repo-icon-wrap">
                        ${iconImg}
                    </div>
                    <div class="repo-info">
                        <div class="repo-name">${d.name}</div>
                        <div class="repo-url">${dirLine}</div>
                        <div class="repo-lines" id="lines-${id}">⏳ Loading...</div>
                    </div>
                </div>`;
    }).join('');

    // High-end pointer-reactive hover treatment for each repo card.
    function enhanceRepoCardHover(card) {
      if (!card || card.dataset.hoverEnhanced === '1') return;
      card.dataset.hoverEnhanced = '1';
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      const update = (e) => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const px = x / rect.width;
        const py = y / rect.height;
        const rx = (0.5 - py) * 8;
        const ry = (px - 0.5) * 10;
        card.style.setProperty('--repo-mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--repo-my', `${(py * 100).toFixed(1)}%`);
        card.style.setProperty('--repo-rx', `${rx.toFixed(2)}deg`);
        card.style.setProperty('--repo-ry', `${ry.toFixed(2)}deg`);
      };

      card.addEventListener('mouseenter', (e) => {
        card.classList.add('repo-card--hovering');
        update(e);
      });
      card.addEventListener('mousemove', update);
      card.addEventListener('mouseleave', () => {
        card.classList.remove('repo-card--hovering');
        card.style.setProperty('--repo-mx', '50%');
        card.style.setProperty('--repo-my', '50%');
        card.style.setProperty('--repo-rx', '0deg');
        card.style.setProperty('--repo-ry', '0deg');
      });
    }

    // Wire clicks now that cards exist in the DOM
    grid.querySelectorAll('.repo-card').forEach(card => {
      enhanceRepoCardHover(card);
      card.addEventListener('click', () => {
        const id = card.dataset.repoId;
        if (id && REPO_DETAILS[id]) openRepoTab(id);
      });
    });
  }

  let repoConfigLoaded = false;
  async function loadRepoConfig() {
    if (repoConfigLoaded) return;
    try {
      const res = await fetch('stuff.txt');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      REPO_CONFIGS = parseStuffTxt(text);
      REPO_DETAILS = await loadRepoDetails(REPO_CONFIGS);
    } catch (err) {
      console.warn('[xeno/stuff] failed to load stuff.txt:', err);
      REPO_CONFIGS = [];
      REPO_DETAILS = {};
    }
    repoConfigLoaded = true;
    renderRepoCards();
    initStatsSummary();
  }

  let lineCountsStarted = false;
  async function initLineCount() {
    await loadRepoConfig();
    if (lineCountsStarted) return;
    lineCountsStarted = true;
    for (const { id } of REPO_CONFIGS) {
      const el = document.getElementById('lines-' + id);
      if (!el) continue;
      const result = await fetchLineCount(id);
      el.textContent = result === null
        ? '📄 —'
        : `📄 ${Number(result.count).toLocaleString()} lines`;
      // Keep the repo detail tab's line-count in sync if it's currently showing this repo
      if (currentRepoTabId === id && repoTabLoc) repoTabLoc.textContent = el.textContent;
    }
  }

  // ── Self-hosted repo-grid summary badge ─────────────────────────────────────
  // Same "two numbers side by side" look the GitHub follower/following line
  // had, except these totals are real clone/download counts summed across
  // every repo card, served by repo-stats-worker.js instead of any GitHub API.
  let statsSummaryStarted = false;
  async function initStatsSummary() {
    if (statsSummaryStarted) return;
    statsSummaryStarted = true;

    const statsWrap  = document.getElementById('gh-follow-stats');
    const clonesEl   = document.getElementById('gh-clones-count');
    const downloadsEl = document.getElementById('gh-downloads-count');
    if (!statsWrap || !clonesEl || !downloadsEl) return;

    const all = await fetchAllRepoStats();
    if (!all) return; // no worker configured yet — leave the line hidden

    let clones = 0, downloads = 0;
    for (const id of REPO_CONFIGS.map(c => c.id)) {
      const s = all[id];
      if (!s) continue;
      clones    += Number(s.clones)    || 0;
      downloads += Number(s.downloads) || 0;
    }
    clonesEl.textContent    = clones.toLocaleString();
    downloadsEl.textContent = downloads.toLocaleString();
    statsWrap.style.display = 'block';
  }

  // ── Page transition ────────────────────────────────────────────────────────
  let currentPage      = 0;   // 0 = profile, 1 = repos, 2 = contact, 3 = image host
  let isTransitioning  = false;

  function setPageDots(page) {
    pageDot0 && pageDot0.classList.toggle('active', page === 0);
    pageDot1 && pageDot1.classList.toggle('active', page === 1);
    pageDot2 && pageDot2.classList.toggle('active', page === 2);
    pageDot3 && pageDot3.classList.toggle('active', page === 3);
  }

  const topControlsBar = document.querySelector('.top-controls');
  function updateTopControlsPosition(page) {
    if (!topControlsBar) return;
    topControlsBar.classList.toggle('top-controls--top-left', page === 3);
  }

  function goToPage(page) {
    if (isTransitioning || page === currentPage) return;
    if (startScreen && !startScreen.classList.contains('hidden')) return;
    isTransitioning = true;
    setPageDots(page);
    updateTopControlsPosition(page);

    const direction = page > currentPage ? 1 : -1;
    const blocks    = [profileBlock, gitBlock, contactBlock, imageHostBlock];
    const outBlock  = blocks[currentPage];
    const inBlock   = blocks[page];

    // Always hide scroll hint when leaving any page
    if (scrollHint) gsap.to(scrollHint, { opacity: 0, duration: 0.25 });

    // Slide current page out
    gsap.to(outBlock, {
      rotationX: 0, rotationY: 0,
      opacity: 0, y: direction * -70,
      duration: 0.45, ease: 'power2.in',
      onComplete: () => { outBlock.style.pointerEvents = 'none'; }
    });

    // Slide next page in from opposite direction
    gsap.fromTo(inBlock,
      { opacity: 0, y: direction * 70, xPercent: -50, yPercent: -50, rotationX: 0, rotationY: 0 },
      {
        opacity: 1, y: 0, xPercent: -50, yPercent: -50,
        duration: 0.48, ease: 'power2.out', delay: 0.18,
        onStart: () => { inBlock.style.pointerEvents = 'auto'; },
        onComplete: () => {
          currentPage     = page;
          isTransitioning = false;
          updateSideBtn(page);
          if (page === 0 && scrollHint) gsap.to(scrollHint, { opacity: 1, duration: 0.5 });
          if (page === 1) { initLineCount(); }
        }
      }
    );
  }

  // Page dot clicks
  if (pageDot0) pageDot0.addEventListener('click', () => goToPage(0));
  if (pageDot1) pageDot1.addEventListener('click', () => goToPage(1));
  if (pageDot2) pageDot2.addEventListener('click', () => goToPage(2));
  if (pageDot3) pageDot3.addEventListener('click', () => goToPage(3));

  // ── Side nav buttons (forward + backward cycling) ──────────────────────────
  const sideNavGroup     = document.getElementById('side-nav-group');
  const sideNavBtn       = document.getElementById('side-nav-btn');
  const sideNavLabel     = document.getElementById('side-nav-label');
  const sideNavArrow     = document.getElementById('side-nav-arrow');
  const sideNavBtnBack   = document.getElementById('side-nav-btn-back');
  const sideNavLabelBack = document.getElementById('side-nav-label-back');
  const sideNavArrowBack = document.getElementById('side-nav-arrow-back');

  function updateSideBtn(page) {
    // Forward label always points to the next page in the cycle (0→1→2→3→0)
    if (sideNavLabel && sideNavArrow) {
      const next = ['Repos', 'Contact', 'Image Host', 'Profile'];
      sideNavLabel.textContent = next[page];
      sideNavArrow.textContent = '▶';
    }
    // Back label always points to the previous page in the cycle (0→3→2→1→0)
    if (sideNavLabelBack && sideNavArrowBack) {
      const prev = ['Image Host', 'Profile', 'Repos', 'Contact'];
      sideNavLabelBack.textContent = prev[page];
      sideNavArrowBack.textContent = '◀';
    }
  }
  updateSideBtn(0); // init

  if (sideNavBtn) {
    const doNavClick = () => {
      goToPage((currentPage + 1) % 4);
    };
    sideNavBtn.addEventListener('click',      doNavClick);
    sideNavBtn.addEventListener('touchstart', e => { e.preventDefault(); doNavClick(); });
  }
  if (sideNavBtnBack) {
    const doNavClickBack = () => {
      goToPage((currentPage + 3) % 4); // -1 mod 4
    };
    sideNavBtnBack.addEventListener('click',      doNavClickBack);
    sideNavBtnBack.addEventListener('touchstart', e => { e.preventDefault(); doNavClickBack(); });
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── 3-D tilt for git block ──────────────────────────────────────────────
  gitBlock.addEventListener('mousemove',  e => handleTilt(e, gitBlock));
  gitBlock.addEventListener('touchmove',  e => {
    e.preventDefault();
    handleTilt(e, gitBlock);
  }, { passive: false });
  gitBlock.addEventListener('mouseleave', () => resetTilt(gitBlock));
  gitBlock.addEventListener('touchend',   () => resetTilt(gitBlock));

  // ── 3-D tilt for contact block ─────────────────────────────────────────────
  contactBlock.addEventListener('mousemove',  e => handleTilt(e, contactBlock));
  contactBlock.addEventListener('touchmove',  e => {
    e.preventDefault();
    handleTilt(e, contactBlock);
  }, { passive: false });
  contactBlock.addEventListener('mouseleave', () => resetTilt(contactBlock));
  contactBlock.addEventListener('touchend',   () => resetTilt(contactBlock));

  // ── Init git block position (hidden, below) ─────────────────────────────
  gsap.set(gitBlock,    { xPercent: -50, yPercent: -50, y: 80, opacity: 0 });
  gsap.set(contactBlock,   { xPercent: -50, yPercent: -50, y: 80, opacity: 0 });
  gsap.set(imageHostBlock, { xPercent: -50, yPercent: -50, y: 80, opacity: 0 });
  // ──────────────────────────────────────────────────────────────────────────

  // ── Verification / site activation ───────────────────────────────────────
  // The public entry page (index.html) now owns the terminal boot UI. The actual
  // profile site is site.html and is only revealed after the verification gate
  // has stored the session flag.
  const GATE_URL = 'gate.html';
  const GATE_PASSED_KEY = 'cyber_gate_passed';

  function hasPassedGate() {
    try {
      return sessionStorage.getItem(GATE_PASSED_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function revealProfile() {
    if (startScreen) startScreen.classList.add('hidden');
    if (sideNavGroup) sideNavGroup.classList.add('visible');

    loadTrack(0);
    playAudio();

    profileBlock.style.opacity = '0';
    profileBlock.style.display = 'flex';

    gsap.fromTo(
      profileBlock,
      { opacity: 0, y: -50, xPercent: -50, yPercent: -50 },
      {
        opacity: 1, y: 0, xPercent: -50, yPercent: -50,
        duration: 1, ease: 'power2.out',
        onComplete: () => {
          profileContainer.classList.add('orbit');
          if (scrollHint) gsap.to(scrollHint, { opacity: 1, duration: 0.6, delay: 0.4 });
        }
      }
    );

    if (!isTouchDevice) {
      trailEffect = new CursorTrailEffect(trailStyles[trailStyleIdx]);
    }

    startNameCursorBlink();
    startBioCursorBlink();
    typeWriterName();
    typeWriterBio();
  }

  if (hasPassedGate()) {
    revealProfile();
  } else {
    window.location.replace(GATE_URL);
  }

  // ──────────────────────────────────────────────────────────────────────────

  // ── Transparency slider ────────────────────────────────────────────────────
  transparencySlider.addEventListener('input', () => {
    const opacity = transparencySlider.value;
    const bg     = opacity == 0 ? 'rgba(0,0,0,0)' : `rgba(0,0,0,${opacity})`;
    const border = opacity == 0 ? 'transparent' : '';
    const blur   = opacity == 0 ? 'none' : `blur(${10 * opacity}px)`;
    profileBlock.style.background     = bg;
    profileBlock.style.borderColor    = border;
    profileBlock.style.backdropFilter = blur;
    if (gitBlock) {
      gitBlock.style.background     = bg;
      gitBlock.style.borderColor    = border;
      gitBlock.style.backdropFilter = blur;
    }
    if (contactBlock) {
      contactBlock.style.background     = bg;
      contactBlock.style.borderColor    = border;
      contactBlock.style.backdropFilter = blur;
    }
    if (imageHostBlock) {
      imageHostBlock.style.background     = bg;
      imageHostBlock.style.borderColor    = border;
      imageHostBlock.style.backdropFilter = blur;
    }
  });
  // ──────────────────────────────────────────────────────────────────────────

  // ── Theme switcher ─────────────────────────────────────────────────────────
  function switchTheme(videoSrc, themeKey, themeClass) {
    const colorMap = {
      'home-theme':  '#00CED1',
      'anime-theme': '#DC2626',
    };
    const primaryColor = colorMap[themeClass] || '#00CED1';
    document.documentElement.style.setProperty('--primary-color', primaryColor);

    gsap.to(backgroundVideo, {
      opacity: 0, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        backgroundVideo.src = videoSrc;
        backgroundVideo.load();

        // Switch playlist and restart from track 0
        currentThemeKey = themeKey;
        pauseAudio();
        mainAudio.currentTime = 0;
        loadTrack(0);
        playAudio();

        document.body.classList.remove('home-theme', 'anime-theme');
        document.body.classList.add(themeClass);

        // Only restore profile block if we're actually on the profile page.
        // Without this guard it would bleed through onto the repos/contact pages.
        if (currentPage === 0) {
          gsap.to(profileBlock, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', xPercent: -50, yPercent: -50 });
        }

        backgroundVideo.addEventListener('canplay', function onCanPlay() {
          backgroundVideo.removeEventListener('canplay', onCanPlay);
          backgroundVideo.play().catch(() => {});
          gsap.to(backgroundVideo, {
            opacity: 1, duration: 0.5, ease: 'power2.out',
            onComplete: () => {
              profileContainer.classList.remove('orbit');
              void profileContainer.offsetWidth;
              profileContainer.classList.add('orbit');
            }
          });
        });
      }
    });
  }

  homeButton.addEventListener('click',      () => switchTheme('assets/background.mp4', 'home', 'home-theme'));
  homeButton.addEventListener('touchstart', e => { e.preventDefault(); switchTheme('assets/background.mp4', 'home', 'home-theme'); });
  animeButton.addEventListener('click',      () => switchTheme('assets/anime_background.mp4', 'anime', 'anime-theme'));
  animeButton.addEventListener('touchstart', e => { e.preventDefault(); switchTheme('assets/anime_background.mp4', 'anime', 'anime-theme'); });
  // ────────────────────────────────────────────────────────────────────────

  // ── 3-D card tilt ─────────────────────────────────────────────────────────
  function handleTilt(e, element) {
    const rect    = element.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const maxTilt = 15;
    gsap.to(element, {
      rotationX: ((clientY - centerY) / rect.height) * maxTilt,
      rotationY: -((clientX - centerX) / rect.width) * maxTilt,
      duration: 0.3, ease: 'power2.out', transformPerspective: 1000
    });
  }

  const resetTilt = el => gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' });

  profileBlock.addEventListener('mousemove',  e => handleTilt(e, profileBlock));
  profileBlock.addEventListener('touchmove',  e => {
    if (e.target.id === 'seek-bar') return;   // don't tilt while scrubbing
    e.preventDefault();
    handleTilt(e, profileBlock);
  });
  profileBlock.addEventListener('mouseleave', () => resetTilt(profileBlock));
  profileBlock.addEventListener('touchend',   () => resetTilt(profileBlock));
  // ──────────────────────────────────────────────────────────────────────────

  // ── Profile picture interactions ───────────────────────────────────────────
  profilePicture.addEventListener('mouseenter', () => {
    glitchOverlay.style.opacity = '1';
    setTimeout(() => { glitchOverlay.style.opacity = '0'; }, 500);
  });

  const spinOrbit = () => {
    profileContainer.classList.remove('fast-orbit', 'orbit');
    void profileContainer.offsetWidth;
    profileContainer.classList.add('fast-orbit');
    setTimeout(() => {
      profileContainer.classList.remove('fast-orbit');
      void profileContainer.offsetWidth;
      profileContainer.classList.add('orbit');
    }, 500);
  };

  profilePicture.addEventListener('click',      spinOrbit);
  profilePicture.addEventListener('touchstart', e => { e.preventDefault(); spinOrbit(); });
  // ──────────────────────────────────────────────────────────────────────────

  // ── Contact form ────────────────────────────────────────────────────────────
  const contactMessageInput = document.getElementById('contact-message');
  const contactDiscordUserEl = document.getElementById('contact-discord-name');
  const contactDiscordAvatarEl = document.getElementById('contact-discord-avatar');

  function getCyberDiscordUser() {
    try {
      const raw = sessionStorage.getItem('cyber_discord_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function populateContactIdentity() {
    const user = getCyberDiscordUser();
    if (!contactDiscordUserEl) return;

    if (user && user.username) {
      contactDiscordUserEl.textContent =
        `${user.username}${user.id ? ` • ${user.id}` : ''}`;

      if (contactDiscordAvatarEl && user.avatarUrl) {
        contactDiscordAvatarEl.src = user.avatarUrl;
      }
    } else {
      contactDiscordUserEl.textContent =
        'Discord account not connected — return through gate.html first.';
    }
  }

  populateContactIdentity();
  const contactSendBtn      = document.getElementById('contact-send');
  const contactStatusEl     = document.getElementById('contact-status');

  function setContactStatus(msg, cls) {
    if (!contactStatusEl) return;
    contactStatusEl.textContent = msg;
    contactStatusEl.className   = 'contact-status' + (cls ? ' ' + cls : '');
  }

  async function sendContactMessage() {
    const msgText = (contactMessageInput?.value || '').trim();
    const discordUser = getCyberDiscordUser();

    if (!msgText) {
      setContactStatus('Message cannot be empty.', 'error');
      contactMessageInput?.focus();
      return;
    }

    if (!discordUser || !discordUser.username) {
      setContactStatus('Connect Discord through the gate first.', 'error');
      return;
    }

    if (contactSendBtn) contactSendBtn.disabled = true;
    setContactStatus('Sending…', '');

    try {
      const res = await fetch(VISITOR_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Cyber Contact',
          avatar_url: discordUser.avatarUrl || 'assets/profile.webp',
          embeds: [{
            title: '📬  New Contact Message',
            color: 0x00CED1,
            description: msgText,
            fields: [
              {
                name: '👤  Discord User',
                value: `${discordUser.username}${discordUser.id ? ` (${discordUser.id})` : ''}`,
                inline: true
              },
              {
                name: '🕐  Sent At',
                value: new Date().toUTCString(),
                inline: false
              }
            ],
            footer: {
              text: 'Overgrown Elite Hub Contact Form'
            },
            timestamp: new Date().toISOString()
          }]
        })
      });

      if (res.ok || res.status === 204) {
        setContactStatus('✅  Sent!', 'success');
        if (contactMessageInput) contactMessageInput.value = '';
        setTimeout(() => setContactStatus('', ''), 5000);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('[cyber/contact]', err);
      setContactStatus('❌  Failed to send — try again.', 'error');
    } finally {
      if (contactSendBtn) contactSendBtn.disabled = false;
    }
  }

  if (contactSendBtn) {
    contactSendBtn.addEventListener('click',      sendContactMessage);
    contactSendBtn.addEventListener('touchstart', e => { e.preventDefault(); sendContactMessage(); });
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ══════════════════════════════════════════════════════════════════════════
  // REPO DETAIL TAB — in-page repo-detail view opened from a repo card
  // ══════════════════════════════════════════════════════════════════════════
  // Card data (name, tags, links, README path) is loaded from stuff.txt at
  // runtime via loadRepoConfig() above — REPO_DETAILS is declared up there
  // and populated once stuff.txt is fetched. Nothing to edit here.

  // ── Tiny Markdown → HTML renderer ──────────────────────────────────────────
  // Covers what READMEs actually use: ATX + setext headings, bold/italic,
  // inline code, fenced code blocks, links, lists, blockquotes, hr, tables.
  function renderMarkdown(md) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Pull fenced code blocks out first so nothing inside them gets touched
    const blocks = [];
    md = md.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      blocks.push('<pre><code>' + esc(code.replace(/\n$/, '')) + '</code></pre>');
      return '\u0000BLOCK' + (blocks.length - 1) + '\u0000';
    });

    const inline = t => esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const lines = md.replace(/\r\n/g, '\n').split('\n');
    let html = '', listType = null, para = [], tableRows = [];

    const flushPara  = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
    const flushList  = () => { if (listType) { html += `</${listType}>`; listType = null; } };
    const flushTable = () => {
      if (!tableRows.length) return;
      const rows = tableRows.filter(r => !r.every(c => /^:?-+:?$/.test(c)));
      const [header, ...body] = rows;
      html += '<table><thead><tr>' + header.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
      body.forEach(r => { html += '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'; });
      html += '</tbody></table>';
      tableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const next    = (lines[i + 1] || '').trim();

      const blockMatch = trimmed.match(/^\u0000BLOCK(\d+)\u0000$/);
      if (blockMatch) { flushPara(); flushList(); flushTable(); html += blocks[+blockMatch[1]]; continue; }
      if (!trimmed)   { flushPara(); flushList(); flushTable(); continue; }

      if (/^\|.*\|$/.test(trimmed)) { tableRows.push(trimmed.slice(1, -1).split('|').map(c => c.trim())); continue; }
      flushTable();

      let m;
      if ((m = trimmed.match(/^(#{1,4})\s+(.*)$/))) {
        flushPara(); flushList();
        html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
        continue;
      }
      // Setext headings: a standalone text line directly followed by an underline of = or -
      if (para.length === 0 && trimmed && /^=+$/.test(next)) { flushList(); html += `<h1>${inline(trimmed)}</h1>`; i++; continue; }
      if (para.length === 0 && trimmed && /^-{1,}$/.test(next) && !/^[-*]\s/.test(trimmed)) { flushList(); html += `<h2>${inline(trimmed)}</h2>`; i++; continue; }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { flushPara(); flushList(); html += '<hr>'; continue; }
      if ((m = trimmed.match(/^>\s?(.*)$/))) { flushPara(); flushList(); html += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
      if ((m = trimmed.match(/^[-*]\s+(.*)$/))) { flushPara(); if (listType !== 'ul') { flushList(); html += '<ul>'; listType = 'ul'; } html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = trimmed.match(/^\d+\.\s+(.*)$/))) { flushPara(); if (listType !== 'ol') { flushList(); html += '<ol>'; listType = 'ol'; } html += `<li>${inline(m[1])}</li>`; continue; }

      flushList();
      para.push(trimmed);
    }
    flushPara(); flushList(); flushTable();
    return html;
  }

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const repoTabOverlay    = document.getElementById('repo-tab-overlay');
  const repoTab           = document.getElementById('repo-tab');
  const repoTabClose      = document.getElementById('repo-tab-close');
  const repoTabTitle      = document.getElementById('repo-tab-title');
  const repoTabTags       = document.getElementById('repo-tab-tags');
  const repoTabLoc        = document.getElementById('repo-tab-loc');
  const repoTabOpenLink   = document.getElementById('repo-tab-open-link');
  const repoTabBundleBtn  = document.getElementById('repo-tab-bundle-btn');
  const repoTabZipBtn      = document.getElementById('repo-tab-zip-btn');
  const repoTabReadme     = document.getElementById('repo-tab-readme');
  const repoTabStats      = document.getElementById('repo-tab-stats');

  let currentRepoTabId = null;
  let repoTabIsOpen     = false;

  repoTabBundleBtn?.addEventListener('click', () => {
    if (currentRepoTabId) generateRepoRuntimeArtifact(currentRepoTabId, 'bundle', repoTabBundleBtn);
  });
  repoTabZipBtn?.addEventListener('click', () => {
    if (currentRepoTabId) generateRepoRuntimeArtifact(currentRepoTabId, 'zip', repoTabZipBtn);
  });

  function getLocText(id) {
    const el = document.getElementById('lines-' + id);
    return el ? el.textContent : '📄 —';
  }

  function setRepoTabAction(linkEl, url, activeTitle) {
    if (url) {
      linkEl.href  = url;
      linkEl.title = activeTitle;
      linkEl.classList.remove('repo-tab-action-box--disabled');
    } else {
      linkEl.removeAttribute('href');
      linkEl.title = 'Not available yet';
      linkEl.classList.add('repo-tab-action-box--disabled');
    }
  }

  async function generateRepoRuntimeArtifact(id, kind, button) {
    const data = REPO_DETAILS[id];
    if (!data || !window.EliteHubRuntimeRepo) return;
    const original = button?.textContent || '';
    try {
      if (button) { button.disabled = true; button.classList.add('repo-tab-action-box--disabled'); button.textContent = '…'; }
      const metaRes = await fetch(`repo-meta/cyber/${encodeURIComponent(data.dir)}.tree.json`, { cache: 'no-store' });
      if (!metaRes.ok) throw new Error(`Repository tree unavailable (HTTP ${metaRes.status})`);
      const tree = await metaRes.json();
      const entries = Array.isArray(tree.entries) ? tree.entries : [];
      const artifact = await window.EliteHubRuntimeRepo.generate({
        root: 'repos',
        id: data.dir,
        entries,
        name: data.name,
        kind,
        onProgress: (stage, done, total) => {
          if (button && stage === 'fetch' && total) button.textContent = `${Math.round(done / total * 100)}%`;
        }
      });
      window.EliteHubRuntimeRepo.download(artifact);
      if (kind === 'zip') fetchRepoStats(id, 'zip');
      else fetchRepoStats(id, 'clone');
    } catch (err) {
      console.error('[elite-hub/runtime-repo]', err);
      window.alert(`Could not generate the ${kind === 'zip' ? 'ZIP' : 'Git bundle'}: ${err.message || err}`);
    } finally {
      if (button) { button.disabled = false; button.classList.remove('repo-tab-action-box--disabled'); button.textContent = original; }
    }
  }

  async function openRepoTab(id) {
    const data = REPO_DETAILS[id];
    if (!data || !repoTabOverlay) return;

    currentRepoTabId = id;
    repoTabIsOpen     = true;

    repoTabTitle.textContent = data.name;
    repoTabTags.innerHTML    = data.tags.map(t => `<span class="repo-tab-tag">${t}</span>`).join('');
    repoTabLoc.textContent   = getLocText(id);
    setRepoTabAction(repoTabOpenLink, `repo.html?repo=${encodeURIComponent(data.dir)}`, 'Open repo page');
    [repoTabBundleBtn, repoTabZipBtn].forEach(btn => {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('repo-tab-action-box--disabled');
      }
    });
    if (repoTabBundleBtn) repoTabBundleBtn.title = 'Generate Git bundle in memory';
    if (repoTabZipBtn) repoTabZipBtn.title = 'Generate ZIP in memory';
    if (repoTabStats) {
      repoTabStats.textContent = '🔗 …  · ⬇️ …';
      fetchRepoStats(id).then(stats => {
        if (currentRepoTabId !== id || !stats) return;
        repoTabStats.textContent = `🔗 ${Number(stats.clones).toLocaleString()} clones · ⬇️ ${Number(stats.downloads).toLocaleString()} downloads`;
      });
    }
    repoTabReadme.innerHTML  = '<p style="opacity:.5">Loading README…</p>';

    gsap.set(repoTab, { rotationX: 0, rotationY: 0 });
    gsap.to(repoTabOverlay, {
      opacity: 1, duration: 0.3, ease: 'power2.out',
      onStart: () => { repoTabOverlay.style.pointerEvents = 'auto'; }
    });
    gsap.fromTo(repoTab,
      { y: 24, scale: 0.96, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }
    );

    if (!data._readmeCache) {
      try {
        const res = await fetch(data.readmeUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data._readmeCache = await res.text();
      } catch (err) {
        console.warn('[xeno/repo-tab] README fetch failed:', err);
        if (currentRepoTabId === id) {
          repoTabReadme.innerHTML = `<p style="opacity:.6">No README yet — drop one at <code>${data.readmeUrl}</code>.</p>`;
        }
        return;
      }
    }
    if (currentRepoTabId === id) {
      repoTabReadme.innerHTML = renderMarkdown(data._readmeCache);
    }
  }

  function closeRepoTab() {
    if (!repoTabOverlay || !repoTabIsOpen) return;
    repoTabIsOpen    = false;
    currentRepoTabId = null;
    resetTilt(repoTab);
    gsap.to(repoTab, { y: 16, scale: 0.97, opacity: 0, duration: 0.25, ease: 'power2.in' });
    gsap.to(repoTabOverlay, {
      opacity: 0, duration: 0.28, ease: 'power2.in',
      onComplete: () => { repoTabOverlay.style.pointerEvents = 'none'; }
    });
  }

  if (repoTabClose)   repoTabClose.addEventListener('click', closeRepoTab);
  if (repoTabOverlay) repoTabOverlay.addEventListener('click', e => { if (e.target === repoTabOverlay) closeRepoTab(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && repoTabIsOpen) closeRepoTab(); });

  // Same 3-D cursor tilt as the other page blocks
  if (repoTab) {
    repoTab.addEventListener('mousemove',  e => handleTilt(e, repoTab));
    repoTab.addEventListener('touchmove',  e => { e.preventDefault(); handleTilt(e, repoTab); });
    repoTab.addEventListener('mouseleave', () => resetTilt(repoTab));
    repoTab.addEventListener('touchend',   () => resetTilt(repoTab));
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── 3-D cursor tilt for the terminal boot window ────────────────────────────
  if (terminalWindow) {
    terminalWindow.addEventListener('mousemove',  e => handleTilt(e, terminalWindow));
    terminalWindow.addEventListener('touchmove',  e => { e.preventDefault(); handleTilt(e, terminalWindow); });
    terminalWindow.addEventListener('mouseleave', () => resetTilt(terminalWindow));
    terminalWindow.addEventListener('touchend',   () => resetTilt(terminalWindow));
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── 3-D cursor tilt for the image-host tab ──────────────────────────────────
  if (imageHostBlock) {
    imageHostBlock.addEventListener('mousemove',  e => handleTilt(e, imageHostBlock));
    imageHostBlock.addEventListener('touchmove',  e => { e.preventDefault(); handleTilt(e, imageHostBlock); });
    imageHostBlock.addEventListener('mouseleave', () => resetTilt(imageHostBlock));
    imageHostBlock.addEventListener('touchend',   () => resetTilt(imageHostBlock));
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ══════════════════════════════════════════════════════════════════════════
  // IMAGE HOST TAB — lightweight image uploader, ported in natively (no iframe).
  //
  // This is a *static* site — there's no server here to receive an upload.
  // This points at the R2-free Cloudflare Worker proxy used by the static site.
  // The Worker forwards uploads to the configured external image host.
  //
  // Until this is set, the tab renders fully but shows a small notice instead
  // of silently failing on upload.
  // ══════════════════════════════════════════════════════════════════════════
  const IMAGE_HOST_UPLOAD_URL = 'https://gentle-sunset-e89f.advikmukherjee76.workers.dev/api/upload';

  const ihDropzone      = document.getElementById('ih-dropzone');
  const ihFileInput     = document.getElementById('ih-file-input');
  const ihIdle          = document.getElementById('ih-idle');
  const ihProgressWrap  = document.getElementById('ih-progress-wrap');
  const ihProgressBar   = document.getElementById('ih-progress-bar');
  const ihProgressLabel = document.getElementById('ih-progress-label');
  const ihResult        = document.getElementById('ih-result');
  const ihError         = document.getElementById('ih-error');
  const ihNotConfigured = document.getElementById('ih-not-configured');

  const IH_MAX_SIZE     = 10 * 1024 * 1024;
  const IH_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  let ihObjectUrl = null;

  if (ihDropzone) {
    ['dragenter', 'dragover'].forEach(evt => {
      ihDropzone.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation();
        ihDropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      ihDropzone.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation();
        ihDropzone.classList.remove('is-dragover');
      });
    });
    ihDropzone.addEventListener('drop', e => {
      const file = e.dataTransfer.files[0];
      if (file) ihHandleFile(file);
    });
    ihDropzone.addEventListener('click', () => ihFileInput.click());
    ihDropzone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ihFileInput.click(); }
    });
  }
  if (ihFileInput) {
    ihFileInput.addEventListener('change', () => {
      const file = ihFileInput.files[0];
      if (file) ihHandleFile(file);
    });
  }

  function ihHandleFile(file) {
    ihClearError();

    if (!IMAGE_HOST_UPLOAD_URL) {
      if (ihNotConfigured) ihNotConfigured.style.display = 'block';
      return;
    }
    if (!IH_ALLOWED_TYPES.includes(file.type)) {
      ihShowError("That file type isn't supported — upload a PNG, JPG, GIF, or WEBP.");
      return;
    }
    if (file.size > IH_MAX_SIZE) {
      ihShowError('That image is over 10MB. Try a smaller file.');
      return;
    }
    ihUploadFile(file);
  }

  function ihUploadFile(file) {
    ihIdle.style.display = 'none';
    ihResult.style.display = 'none';
    ihProgressWrap.style.display = 'block';
    ihProgressBar.style.width = '0%';
    ihProgressLabel.textContent = `Uploading ${file.name}…`;

    const formData = new FormData();
    formData.append('image', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', IMAGE_HOST_UPLOAD_URL);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        ihProgressBar.style.width = pct + '%';
        ihProgressLabel.textContent = `Uploading ${file.name}… ${pct}%`;
      }
    });

    xhr.addEventListener('load', () => {
      ihProgressWrap.style.display = 'none';
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { data = null; }

      if (xhr.status >= 200 && xhr.status < 300 && data && data.success) {
        ihShowResult(data, file);
      } else {
        ihIdle.style.display = 'block';
        ihShowError((data && data.error) || 'Upload failed. Please try again.');
      }
    });

    xhr.addEventListener('error', () => {
      ihProgressWrap.style.display = 'none';
      ihIdle.style.display = 'block';
      ihShowError('Network error — check your connection and try again.');
    });

    xhr.send(formData);
  }

  function ihShowResult(data, file) {
    if (ihObjectUrl) URL.revokeObjectURL(ihObjectUrl);
    ihObjectUrl = URL.createObjectURL(file);

    document.getElementById('ih-embed-thumb').src = ihObjectUrl;
    document.getElementById('ih-embed-filename').textContent = file.name;
    document.getElementById('ih-link-input').value = data.viewUrl;
    document.getElementById('ih-raw-link').href = data.rawUrl;

    ihResult.style.display = 'block';
  }

  function ihResetUploader() {
    if (ihObjectUrl) { URL.revokeObjectURL(ihObjectUrl); ihObjectUrl = null; }
    if (ihFileInput) ihFileInput.value = '';
    ihResult.style.display = 'none';
    ihIdle.style.display = 'block';
    ihClearError();
  }

  const ihUploadAnotherBtn = document.getElementById('ih-upload-another');
  if (ihUploadAnotherBtn) ihUploadAnotherBtn.addEventListener('click', ihResetUploader);

  const ihLinkInputEl = document.getElementById('ih-link-input');
  if (ihLinkInputEl) ihLinkInputEl.addEventListener('click', function () { this.select(); });

  const ihCopyBtn = document.getElementById('ih-copy-btn');
  if (ihCopyBtn) {
    ihCopyBtn.addEventListener('click', async () => {
      const input = document.getElementById('ih-link-input');
      try {
        await navigator.clipboard.writeText(input.value);
      } catch {
        input.select();
        document.execCommand('copy');
      }
      const original = ihCopyBtn.textContent;
      ihCopyBtn.textContent = 'Copied!';
      ihCopyBtn.classList.add('copied');
      setTimeout(() => {
        ihCopyBtn.textContent = original;
        ihCopyBtn.classList.remove('copied');
      }, 1600);
    });
  }

  function ihShowError(msg) {
    if (!ihError) return;
    ihError.textContent = msg;
    ihError.style.display = 'block';
  }
  function ihClearError() {
    if (!ihError) return;
    ihError.textContent = '';
    ihError.style.display = 'none';
    if (ihNotConfigured) ihNotConfigured.style.display = 'none';
  }
  // ══════════════════════════════════════════════════════════════════════════
});


// ── Troll → Rickroll DVD-bounce window ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const trollTrigger = document.getElementById('troll-trigger');
  const rrWindow      = document.getElementById('rickroll-window');
  const rrTilt        = document.getElementById('rickroll-tilt');
  const rrClose       = document.getElementById('rickroll-close');
  const rrVideo       = document.getElementById('rickroll-video');

  if (!trollTrigger || !rrWindow) return;

  let bounceId   = null;
  let posX = 40, posY = 40;
  let velX = 2.6, velY = 2.1;

  function stepBounce() {
    const w = rrWindow.offsetWidth  || 420;
    const h = rrWindow.offsetHeight || 260;
    const maxX = window.innerWidth  - w;
    const maxY = window.innerHeight - h;

    posX += velX;
    posY += velY;

    if (posX <= 0)      { posX = 0;    velX = Math.abs(velX); }
    if (posX >= maxX)   { posX = maxX; velX = -Math.abs(velX); }
    if (posY <= 0)      { posY = 0;    velY = Math.abs(velY); }
    if (posY >= maxY)   { posY = maxY; velY = -Math.abs(velY); }

    rrWindow.style.transform = `translate(${posX}px, ${posY}px)`;
    bounceId = requestAnimationFrame(stepBounce);
  }

  function openRickroll() {
    rrWindow.classList.add('active');
    posX = Math.random() * (window.innerWidth  - 440);
    posY = Math.random() * (window.innerHeight - 300);
    velX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 1.5);
    velY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 1.5);
    if (rrVideo) { rrVideo.currentTime = 0; rrVideo.play().catch(() => {}); }
    if (!bounceId) bounceId = requestAnimationFrame(stepBounce);
  }

  function closeRickroll() {
    rrWindow.classList.remove('active');
    if (rrVideo) rrVideo.pause();
    if (bounceId) { cancelAnimationFrame(bounceId); bounceId = null; }
    if (rrTilt && window.gsap) gsap.to(rrTilt, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' });
  }

  trollTrigger.addEventListener('click', openRickroll);
  if (rrClose) rrClose.addEventListener('click', closeRickroll);

  // Same 3-D cursor tilt as the other page windows. Lives on #rickroll-tilt
  // (a wrapper inside #rickroll-window) so it doesn't fight the bounce
  // animation's own transform on the outer element.
  if (rrTilt && window.gsap) {
    const maxTilt = 15;
    function handleRickrollTilt(event) {
      const rect    = rrTilt.getBoundingClientRect();
      const centerX = rect.left + rect.width  / 2;
      const centerY = rect.top  + rect.height / 2;
      const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
      const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
      gsap.to(rrTilt, {
        rotationX: ((clientY - centerY) / rect.height) * maxTilt,
        rotationY: -((clientX - centerX) / rect.width) * maxTilt,
        duration: 0.3, ease: 'power2.out', transformPerspective: 1000
      });
    }
    rrWindow.addEventListener('mousemove', handleRickrollTilt);
    rrWindow.addEventListener('touchmove', e => { e.preventDefault(); handleRickrollTilt(e); });
    rrWindow.addEventListener('mouseleave', () => gsap.to(rrTilt, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' }));
    rrWindow.addEventListener('touchend',   () => gsap.to(rrTilt, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' }));
  }
});


// ── Social link popup windows ────────────────────────────────────────────
// Discord/Roblox/Snapchat/Steam all send X-Frame-Options / CSP
// frame-ancestors headers that block iframe embedding, so instead of trying
// (and failing) to embed the page, each popup just shows the link with a
// copy button and an "Open Link" button that takes you straight there.
document.addEventListener('DOMContentLoaded', () => {
  const layer = document.getElementById('social-popup-layer');
  const triggers = document.querySelectorAll('.social-popup-trigger');
  if (!layer || !triggers.length) return;

  let openCount = 0; // used to cascade-offset multiple open popups

  function openSocialPopup(name, url, iconSrc) {
    const popup = document.createElement('div');
    popup.className = 'social-popup';

    const offset = (openCount % 5) * 28;
    const baseX = Math.max(24, (window.innerWidth  - 460) / 2 + offset);
    const baseY = Math.max(24, (window.innerHeight - 560) / 2 + offset);
    popup.style.left = `${baseX}px`;
    popup.style.top  = `${baseY}px`;
    openCount++;

    popup.innerHTML = `
      <div class="social-popup-titlebar">
        <span class="term-dot term-dot--red"   data-role="close"></span>
        <span class="term-dot term-dot--yellow"></span>
        <span class="term-dot term-dot--green"></span>
        <span class="social-popup-title">${name} — ${url.replace(/^https?:\/\//, '')}</span>
        <span class="social-popup-close" data-role="close">✕</span>
      </div>
      <div class="social-popup-body">
        <img src="${iconSrc}" alt="${name}">
        <div style="color:#fff; font-weight:600; font-size:14px;">${name}</div>
        <div class="social-popup-link-row">
          <span class="social-popup-link-text">${url}</span>
          <button type="button" class="social-popup-copy-btn" data-role="copy">Copy</button>
        </div>
        <button type="button" class="social-popup-open-btn" data-role="open">Open Link ↗</button>
      </div>
    `;

    layer.appendChild(popup);

    const copyBtn = popup.querySelector('[data-role="copy"]');
    const openBtn = popup.querySelector('[data-role="open"]');

    copyBtn.addEventListener('click', () => {
      const done = () => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => {
          // Fallback for browsers that reject clipboard writes (e.g. no
          // secure context) — select the text via a temp input instead.
          const tmp = document.createElement('textarea');
          tmp.value = url;
          tmp.style.position = 'fixed';
          tmp.style.opacity = '0';
          document.body.appendChild(tmp);
          tmp.select();
          try { document.execCommand('copy'); } catch {}
          document.body.removeChild(tmp);
          done();
        });
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = url;
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(tmp);
        done();
      }
    });

    openBtn.addEventListener('click', () => {
      window.open(url, '_blank', 'noopener');
    });

    function closePopup() {
      layer.contains(popup) && layer.removeChild(popup);
    }
    popup.querySelectorAll('[data-role="close"]').forEach(el => {
      el.addEventListener('click', closePopup);
    });

    // Drag by the titlebar (but not by the dots/close button).
    const titlebar = popup.querySelector('.social-popup-titlebar');
    let dragging = false, dragStartX = 0, dragStartY = 0, popupStartX = 0, popupStartY = 0;

    function onDragStart(event) {
      if (event.target.closest('[data-role="close"]')) return;
      dragging = true;
      const point = event.touches ? event.touches[0] : event;
      dragStartX = point.clientX;
      dragStartY = point.clientY;
      popupStartX = popup.offsetLeft;
      popupStartY = popup.offsetTop;
      popup.style.zIndex = String(10001 + openCount);
      event.preventDefault();
    }
    function onDragMove(event) {
      if (!dragging) return;
      const point = event.touches ? event.touches[0] : event;
      const dx = point.clientX - dragStartX;
      const dy = point.clientY - dragStartY;
      const w = popup.offsetWidth;
      const h = popup.offsetHeight;
      const nextLeft = Math.min(Math.max(popupStartX + dx, -w * 0.5), window.innerWidth  - w * 0.5);
      const nextTop  = Math.min(Math.max(popupStartY + dy, 0),         window.innerHeight - 36);
      popup.style.left = `${nextLeft}px`;
      popup.style.top  = `${nextTop}px`;
    }
    function onDragEnd() { dragging = false; }

    titlebar.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    titlebar.addEventListener('touchstart', onDragStart, { passive: false });
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);

    // Bring to front on click anywhere in the popup.
    popup.addEventListener('mousedown', () => {
      popup.style.zIndex = String(10001 + openCount);
    });

    // Same 3-D cursor tilt as the other page windows. The popup's own
    // position is driven by left/top (not transform), so layering GSAP's
    // rotationX/rotationY transform here doesn't conflict with dragging.
    if (window.gsap) {
      const maxTilt = 15;
      function handlePopupTilt(event) {
        if (dragging) return; // don't fight the drag while actively moving it
        const rect    = popup.getBoundingClientRect();
        const centerX = rect.left + rect.width  / 2;
        const centerY = rect.top  + rect.height / 2;
        const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
        const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
        gsap.to(popup, {
          rotationX: ((clientY - centerY) / rect.height) * maxTilt,
          rotationY: -((clientX - centerX) / rect.width) * maxTilt,
          duration: 0.3, ease: 'power2.out', transformPerspective: 1000
        });
      }
      popup.addEventListener('mousemove', handlePopupTilt);
      popup.addEventListener('touchmove', e => { e.preventDefault(); handlePopupTilt(e); });
      popup.addEventListener('mouseleave', () => gsap.to(popup, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' }));
      popup.addEventListener('touchend',   () => gsap.to(popup, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' }));
    }
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', (event) => {
      // Let modifier-clicks and middle-click behave normally (new tab, etc.)
      // rather than hijacking them into the popup flow.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const name = trigger.dataset.socialName || 'Link';
      const iconSrc = trigger.dataset.socialIcon || '';
      openSocialPopup(name, trigger.href, iconSrc);
    });
  });
});
