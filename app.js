(() => {
  // ---- Config ---------------------------------------------------------------
  const CONFIG = {
    songsBase: "Songs",
    links: {
      spotify: "https://open.spotify.com/playlist/3L4tNm4zVmdT8gRG0yhvNO?si=87815228dbe04802&nd=1&dlsi=d904b0ac7ed3436a",
      ytMusic: "", // add the YT Music playlist URL here; the button hides while empty
    },
    // Optional: URL returning JSON like {"online": 142} for a real counter.
    // Left empty, the counter is simulated in the browser.
    onlineEndpoint: "",
    // Song covers — each song gets one of these at random (reshuffled on every visit).
    covers: [
      "assets/covers/1.jpg",
      "assets/covers/2.jpg",
      "assets/covers/3.jpg",
      "assets/covers/4.jpg",
      "assets/covers/5.jpg",
    ],
  };

  const PLAYLIST = (window.PLAYLIST || []).filter((c) => c.tracks && c.tracks.length);

  // ---- Elements -------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const els = {
    cats: $("cats"),
    blurb: $("blurb"),
    art: $("art"),
    title: $("track-title"),
    artist: $("track-artist"),
    seek: $("seek"),
    cur: $("cur"),
    dur: $("dur"),
    play: $("play"),
    prev: $("prev"),
    next: $("next"),
    status: $("status"),
    list: $("tracklist"),
    listSummary: $("tracklist-summary"),
    online: $("online-count"),
  };

  // ---- Links ----------------------------------------------------------------
  [["link-spotify", CONFIG.links.spotify], ["link-ytmusic", CONFIG.links.ytMusic]].forEach(([id, url]) => {
    const a = $(id);
    if (url) a.href = url;
    else a.hidden = true;
  });

  if (!PLAYLIST.length) {
    els.title.textContent = "No songs yet";
    return;
  }

  // ---- Artwork (placeholder rangoli per category until real covers exist) ---
  const THEMES = {
    aagman:   { bg: "#6e1420", a: "#f4a93e", b: "#c1272d", glyph: "modak" },
    morning:  { bg: "#7f3510", a: "#ffd27a", b: "#f4a93e", glyph: "sun" },
    aarti:    { bg: "#5a0f18", a: "#f4a93e", b: "#e8622c", glyph: "diya" },
    evening:  { bg: "#34101d", a: "#e8622c", b: "#f4a93e", glyph: "moon" },
    thal:     { bg: "#66290e", a: "#f6c35b", b: "#c1272d", glyph: "thal" },
    garba:    { bg: "#48102f", a: "#f07a2e", b: "#f4c04e", glyph: "dandiya" },
    visarjan: { bg: "#231626", a: "#f4a93e", b: "#c1272d", glyph: "waves" },
  };
  const FALLBACK_THEME = { bg: "#52111b", a: "#f4a93e", b: "#c1272d", glyph: "modak" };

  const GLYPHS = {
    modak: (ink) =>
      `<path d="M100 76C92 88 80 96 80 108c0 12 10 18 20 18s20-6 20-18c0-12-12-20-20-32z" fill="${ink}"/>
       <path d="M100 80l-9 44M100 80v46M100 80l9 44" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>`,
    sun: (ink) =>
      `<circle cx="100" cy="100" r="11" fill="${ink}"/>` +
      Array.from({ length: 8 }, (_, i) =>
        `<rect x="98" y="76" width="4" height="10" rx="2" fill="${ink}" transform="rotate(${i * 45} 100 100)"/>`
      ).join(""),
    diya: (ink) =>
      `<path d="M72 104h56l-6 3c-4 11-12 17-22 17s-18-6-22-17z" fill="${ink}"/>
       <rect x="92" y="124" width="16" height="4" rx="2" fill="${ink}"/>
       <path d="M100 70c10 12 12 24 1 33h-2c-11-9-9-21 1-33z" fill="${ink}"/>`,
    moon: (ink, disk) =>
      `<circle cx="96" cy="100" r="22" fill="${ink}"/><circle cx="108" cy="94" r="19" fill="${disk}"/>`,
    thal: (ink) =>
      `<circle cx="100" cy="100" r="22" fill="none" stroke="${ink}" stroke-width="4"/>
       <circle cx="92" cy="96" r="5" fill="${ink}"/><circle cx="107" cy="94" r="5" fill="${ink}"/><circle cx="100" cy="108" r="5" fill="${ink}"/>`,
    dandiya: (ink, disk) =>
      `<g stroke="${ink}" stroke-width="5" stroke-linecap="round"><path d="M86 126l20-50M114 126l-20-50"/></g>
       <g stroke="${disk}" stroke-width="2.5"><path d="M87 115l5 2M99 85l5 2M113 115l-5 2M101 85l-5 2"/></g>`,
    waves: (ink) =>
      [90, 100, 110]
        .map((y) => `<path d="M78 ${y}q5.5-6 11 0t11 0t11 0t11 0" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`)
        .join(""),
  };

  function artworkSVG(cat) {
    const t = THEMES[cat.id] || FALLBACK_THEME;
    const disk = t.a;
    const ink = t.bg;
    const ring = (n, r, rx, ry, fill, offset = 0, opacity = 1) =>
      Array.from({ length: n }, (_, i) =>
        `<ellipse cx="100" cy="${100 - r}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}" transform="rotate(${(360 / n) * i + offset} 100 100)"/>`
      ).join("");
    const dots = (n, r, size, fill) =>
      Array.from({ length: n }, (_, i) => {
        const a = ((Math.PI * 2) / n) * i;
        return `<circle cx="${(100 + r * Math.cos(a)).toFixed(2)}" cy="${(100 + r * Math.sin(a)).toFixed(2)}" r="${size}" fill="${fill}"/>`;
      }).join("");

    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${t.bg}"/>
      <circle cx="100" cy="100" r="96" fill="${t.b}" opacity=".12"/>
      <g class="spin">
        ${dots(36, 90, 2, t.a)}
        ${ring(16, 56, 9, 24, t.b, 11.25, 0.9)}
        ${ring(16, 50, 8, 22, t.a)}
        ${ring(12, 36, 6, 14, t.b)}
        ${dots(24, 38, 1.6, t.a)}
      </g>
      <circle cx="100" cy="100" r="31" fill="${disk}"/>
      <circle cx="100" cy="100" r="31" fill="none" stroke="${t.b}" stroke-width="2" stroke-dasharray="2 4"/>
      ${GLYPHS[t.glyph](ink, disk)}
    </svg>`;
  }

  // ---- Random covers ----------------------------------------------------------
  // Shuffle once per visit and give each playlist a random starting point, so
  // covers feel random but the next song never repeats the current picture.
  const covers = CONFIG.covers.slice();
  for (let i = covers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [covers[i], covers[j]] = [covers[j], covers[i]];
  }
  const coverOffsets = PLAYLIST.map(() => Math.floor(Math.random() * Math.max(1, covers.length)));

  function coverFor(catIndex, trackIndex) {
    const n = covers.length;
    if (!n) return null;
    const len = PLAYLIST[catIndex].tracks.length;
    const i = ((trackIndex % len) + len) % len;
    let k = (coverOffsets[catIndex] + i) % n;
    // When the playlist loops, don't show the first song's cover on the last song too.
    if (n > 2 && len > 1 && i === len - 1 && k === coverOffsets[catIndex] % n) k = (k + 1) % n;
    return covers[k];
  }

  function renderArt(cat) {
    const src = coverFor(state.cat, state.track);
    if (!src) {
      els.art.innerHTML = artworkSVG(cat);
      return;
    }
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.onload = () => img.classList.add("loaded");
    img.onerror = () => { if (img.isConnected) els.art.innerHTML = artworkSVG(cat); };
    img.src = src;
    els.art.replaceChildren(img);
    // Warm up the next song's cover so it appears instantly.
    const next = coverFor(state.cat, state.track + 1);
    if (next && next !== src) new Image().src = next;
  }

  // ---- State ----------------------------------------------------------------
  const state = { cat: 0, track: 0 };
  let seeking = false;

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) return "0:00";
    s = Math.floor(s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  };

  const srcFor = (cat, track) =>
    [CONFIG.songsBase, cat.folder, track.file].map(encodeURIComponent).join("/");

  const current = () => {
    const cat = PLAYLIST[state.cat];
    return { cat, track: cat.tracks[state.track] };
  };

  // ---- Rendering ------------------------------------------------------------
  function renderCats() {
    els.cats.innerHTML = "";
    PLAYLIST.forEach((cat, i) => {
      const b = document.createElement("button");
      b.className = "cat";
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset.index = i;
      b.innerHTML = `${escapeHTML(cat.label)}<span class="n">${cat.tracks.length}</span>`;
      b.addEventListener("click", () => selectCategory(i, { play: true }));
      els.cats.appendChild(b);
    });
  }

  // Scroll only the chip row horizontally (never the page) to center the active chip.
  let chipsReady = false;
  function centerActiveChip(smooth) {
    const row = els.cats.parentElement;
    const b = els.cats.children[state.cat];
    if (!b) return;
    const left = b.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft
      - row.clientWidth / 2 + b.offsetWidth / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
  }

  function renderSelection() {
    const { cat, track } = current();

    [...els.cats.children].forEach((b, i) => {
      const on = i === state.cat;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    centerActiveChip(chipsReady);

    els.blurb.textContent = cat.blurb || "";
    renderArt(cat);
    els.title.textContent = track.title;
    els.artist.textContent = track.artist || cat.label;
    updateListSummary();

    els.list.innerHTML = "";
    cat.tracks.forEach((t, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      if (i === state.track) b.setAttribute("aria-current", "true");
      b.innerHTML = `<span class="num">${i + 1}</span><span class="txt"><span class="t">${escapeHTML(t.title)}</span><span class="a">${escapeHTML(t.artist || "")}</span></span>`;
      b.addEventListener("click", () => selectTrack(i, { play: true }));
      li.appendChild(b);
      els.list.appendChild(li);
    });

    document.title = `${track.title} · Ganpati Bappa`;
    updateMediaSession();
  }

  function updateListSummary() {
    const n = PLAYLIST[state.cat].tracks.length;
    const open = els.listSummary.closest("details").open;
    els.listSummary.textContent = open ? "Hide songs" : n === 1 ? "Show 1 song" : `Show all ${n} songs`;
  }
  els.listSummary.closest("details").addEventListener("toggle", updateListSummary);

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function setProgress(time, duration) {
    const pct = duration ? (time / duration) * 100 : 0;
    els.seek.style.setProperty("--progress", `${pct}%`);
    els.cur.textContent = fmt(time);
  }

  // ---- Playback -------------------------------------------------------------
  function load({ play }) {
    const { cat, track } = current();
    els.status.textContent = "";
    audio.src = srcFor(cat, track);
    els.seek.max = 0;
    els.seek.value = 0;
    els.dur.textContent = "0:00";
    setProgress(0, 0);
    renderSelection();
    if (play) playAudio();
  }

  function playAudio() {
    const p = audio.play();
    if (p && p.catch) p.catch(() => {}); // autoplay can be blocked until the user taps
  }

  function selectCategory(i, { play }) {
    if (i === state.cat && audio.src) {
      if (play && audio.paused) playAudio();
      return;
    }
    state.cat = i;
    state.track = 0;
    history.replaceState(null, "", `#${PLAYLIST[i].id}`);
    load({ play });
  }

  function selectTrack(i, { play }) {
    const n = PLAYLIST[state.cat].tracks.length;
    state.track = (i + n) % n;
    load({ play });
  }

  els.play.addEventListener("click", () => (audio.paused ? playAudio() : audio.pause()));
  els.next.addEventListener("click", () => selectTrack(state.track + 1, { play: true }));
  els.prev.addEventListener("click", () => {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else selectTrack(state.track - 1, { play: true });
  });

  audio.addEventListener("play", () => {
    document.body.classList.add("playing");
    els.play.setAttribute("aria-label", "Pause");
  });
  audio.addEventListener("pause", () => {
    document.body.classList.remove("playing");
    els.play.setAttribute("aria-label", "Play");
  });
  audio.addEventListener("loadedmetadata", () => {
    els.seek.max = audio.duration || 0;
    els.dur.textContent = fmt(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (seeking) return;
    els.seek.value = audio.currentTime;
    setProgress(audio.currentTime, audio.duration);
  });
  audio.addEventListener("ended", () => selectTrack(state.track + 1, { play: true }));
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;
    els.status.textContent = "Couldn't load this track — skipping…";
    const failed = audio.src;
    setTimeout(() => {
      if (audio.src === failed) selectTrack(state.track + 1, { play: true });
    }, 2000);
  });

  els.seek.addEventListener("input", () => {
    seeking = true;
    setProgress(Number(els.seek.value), audio.duration);
  });
  els.seek.addEventListener("change", () => {
    audio.currentTime = Number(els.seek.value);
    seeking = false;
  });

  // Touch: tap or drag anywhere on the bar (iOS range inputs only respond to the thumb).
  let dragId = null;
  const seekFromPointer = (e) => {
    const max = Number(els.seek.max);
    if (!max) return;
    const r = els.seek.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    els.seek.value = ratio * max;
    seeking = true;
    setProgress(Number(els.seek.value), max);
  };
  els.seek.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return; // native behaviour is fine with a mouse
    e.preventDefault();
    dragId = e.pointerId;
    els.seek.setPointerCapture(dragId);
    els.seek.classList.add("dragging");
    seekFromPointer(e);
  });
  els.seek.addEventListener("pointermove", (e) => {
    if (e.pointerId === dragId) seekFromPointer(e);
  });
  const endDrag = (e) => {
    if (e.pointerId !== dragId) return;
    dragId = null;
    els.seek.classList.remove("dragging");
    if (Number(els.seek.max)) audio.currentTime = Number(els.seek.value);
    seeking = false;
  };
  els.seek.addEventListener("pointerup", endDrag);
  els.seek.addEventListener("pointercancel", endDrag);

  // Arrow-key navigation between category tabs
  els.cats.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = PLAYLIST.length;
    const i = (state.cat + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    selectCategory(i, { play: !audio.paused });
    els.cats.children[i].focus();
  });

  // Space toggles play when not typing / on a control
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (["BUTTON", "INPUT", "TEXTAREA", "SUMMARY", "A"].includes(tag)) return;
    e.preventDefault();
    audio.paused ? playAudio() : audio.pause();
  });

  // Lock screen / notification controls
  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const { cat, track } = current();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || "",
      album: `Ganpati Bappa · ${cat.label}`,
      artwork: [{
        src: new URL(coverFor(state.cat, state.track) || "assets/cover-512.jpg", location.href).href,
        sizes: coverFor(state.cat, state.track) ? "480x480" : "512x512",
        type: "image/jpeg",
      }],
    });
  }
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    const handlers = {
      play: playAudio,
      pause: () => audio.pause(),
      previoustrack: () => selectTrack(state.track - 1, { play: true }),
      nexttrack: () => selectTrack(state.track + 1, { play: true }),
      seekto: (d) => { if (Number.isFinite(d.seekTime)) audio.currentTime = d.seekTime; },
    };
    for (const [action, fn] of Object.entries(handlers)) {
      try { ms.setActionHandler(action, fn); } catch { /* unsupported action */ }
    }
    const syncPosition = () => {
      if (!ms.setPositionState || !Number.isFinite(audio.duration)) return;
      try {
        ms.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate });
      } catch { /* ignore */ }
    };
    ["loadedmetadata", "seeked", "play", "pause"].forEach((ev) => audio.addEventListener(ev, syncPosition));
  }

  // ---- Initial category: #hash, otherwise by time of day -------------------
  function initialCategory() {
    const byId = (id) => PLAYLIST.findIndex((c) => c.id === id);
    const fromHash = byId(decodeURIComponent(location.hash.slice(1)).toLowerCase());
    if (fromHash >= 0) return fromHash;
    const h = new Date().getHours();
    const guess = h >= 4 && h < 12 ? "morning" : h >= 18 && h < 21 ? "aarti" : h >= 21 || h < 4 ? "evening" : "aagman";
    return Math.max(0, byId(guess));
  }

  window.addEventListener("hashchange", () => {
    const i = PLAYLIST.findIndex((c) => c.id === location.hash.slice(1).toLowerCase());
    if (i >= 0 && i !== state.cat) selectCategory(i, { play: !audio.paused });
  });

  renderCats();
  state.cat = initialCategory();
  load({ play: false });
  chipsReady = true;

  // Re-center once web fonts change chip widths, and after rotation / resize.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => centerActiveChip(false));
  window.addEventListener("load", () => centerActiveChip(false));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => centerActiveChip(false), 150);
  });

  // ---- Online counter -------------------------------------------------------
  function startCounter() {
    if (CONFIG.onlineEndpoint) {
      const tick = () =>
        fetch(CONFIG.onlineEndpoint)
          .then((r) => r.json())
          .then((d) => { if (Number.isFinite(d.online)) els.online.textContent = d.online; })
          .catch(() => {});
      tick();
      setInterval(tick, 15000);
      return;
    }
    // Simulated: busier in the morning and evening aarti hours, drifts gently.
    const h = new Date().getHours();
    const base = [40, 28, 20, 18, 22, 48, 90, 130, 150, 120, 95, 85, 80, 78, 82, 95, 120, 160, 210, 240, 220, 170, 110, 65][h];
    let n = Math.round(base * (0.9 + Math.random() * 0.2));
    const show = () => (els.online.textContent = n);
    show();
    (function drift() {
      n = Math.max(3, n + Math.round((Math.random() - 0.5) * 6 + (base - n) * 0.05));
      show();
      setTimeout(drift, 3000 + Math.random() * 5000);
    })();
  }
  startCounter();
})();
