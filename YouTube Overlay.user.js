// ==UserScript==
// @name         YouTube Overlay
// @namespace    yt-overlay
// @version      1.7.4
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/YouTube%20Overlay.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/YouTube%20Overlay.user.js
// @description  MTV-style overlay for YouTube with a continuous ticker and logo images.
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        https://www.youtube.com/*
// @match        https://music.youtube.com/*
// @match        https://nestkastlive.nl/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  // ---------- CONFIG ----------
  const CONFIG = {
    yellow: "#FFDC00",
    black:  "#111111",
    text:   "#111111",
    textInv:"#FFFFFF",
    fontFamily: "Inter, Roboto, Arial, sans-serif",

    tickerLabel: "UPDATES",
    tickerSpeed: 60,
    tickerHeight: 44,
    fontSize: "18px",
    separator: " • ",
    repeatChunks: 2,

	// --- DEFAULT HEADLINES (fallback) ---
    headlines: [
      "Berichten laden...",
      "Tot die tijd: groetjes!",
    ],

	// Remote headline source
    remoteHeadlineUrl: "https://robertlindeboom.nl/werk/scroller/list.php",

    clockLocale: "nl-NL",
    clockTimezone: "Europe/Amsterdam",
    clockOptions: { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" },
    clockPrefix: "⏰",

    nowLabel: "PLAYING",
    showNowPlaying: true,
    artistFontWeight: 800,
    artistFontSize: "18px",
    titleFontWeight: 600,
    titleFontSize: "16px",

    nowPlayingLeftShiftPx: -13,

    // logoUrl: "https://logos-world.net/wp-content/uploads/2020/09/MTV-Emblem.png",
    logoUrl: "https://robertlindeboom.nl/werk/Topi/Topi-MTV.png",
    logoSize: 128,
    logoOpacity: 0.85,

    nowPlayingImgUrl: "https://robertlindeboom.nl/werk/Topi/Topi-DJ.png",
    nowPlayingImgSize: 128,
    nowPlayingImgOpacity: 0.95,

    // Per-device image profiles. Choose one locally via userscript menu.
    imageProfiles: {
      topitv: {
        logoUrl: "https://robertlindeboom.nl/werk/Topi/Topi-MTV.png",
        nowPlayingImgUrl: "https://robertlindeboom.nl/werk/Topi/Topi-DJ.png",
      },
      mtv: {
        logoUrl: "https://logos-world.net/wp-content/uploads/2020/09/MTV-Emblem.png",
        nowPlayingImgUrl: "https://robertlindeboom.nl/werk/Topi/Topi-DJ.png",
      },
      uil: {
        logoUrl: "https://robertlindeboom.nl/werk/Topi/Topi-nest.png",
        nowPlayingImgUrl: "https://robertlindeboom.nl/werk/Topi/Topi-metUil.png",
      },
      trein: {
        logoUrl: "https://robertlindeboom.nl/werk/Topi/Topi-treintje.png",
        nowPlayingImgUrl: "https://robertlindeboom.nl/werk/Topi/Topi-conducteur.png",
      },
      noimages: {
        logoUrl: "",
        nowPlayingImgUrl: "",
      },
    },
    defaultImageProfile: "topitv",

    bottomPadding: 10,
    leftPadding: 16,
    rightPadding: 16,
    cornerRadius: 6,
    showOnTheaterMode: false,
    maxNowPlayingWidthVW: 70,
  };

  // ---------- State ----------
  let ui = {
    root: null,
    track: null,
    spanA: null,
    spanB: null,
    nowWrap: null,
    artistEl: null,
    titleEl: null,
    rafId: null,
  };
  let posX = 0;
  let lastTs = 0;
  let widthA = 0;
  let widthB = 0;
  let currentArtist = "";
  let currentTitle  = "";
  let lastRefreshSuccess = 0;
  const IMAGE_PROFILE_STORAGE_KEY = "overlayImageProfile";

  function storageGet(key, fallback = "") {
    try {
      if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
    } catch {}
    try {
      return localStorage.getItem(key) || fallback;
    } catch {}
    return fallback;
  }

  function storageSet(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        GM_setValue(key, value);
        return;
      }
    } catch {}
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function getProfileNames() {
    return Object.keys(CONFIG.imageProfiles || {});
  }

  function getSelectedProfileName() {
    const names = getProfileNames();
    const fallback = CONFIG.defaultImageProfile;
    const stored = String(storageGet(IMAGE_PROFILE_STORAGE_KEY, fallback) || "").trim();
    if (names.includes(stored)) return stored;
    if (names.includes(fallback)) return fallback;
    return names[0] || "";
  }

  function applyImageProfile() {
    const selected = getSelectedProfileName();
    const profile = CONFIG.imageProfiles?.[selected];
    if (!profile) return;

    if (typeof profile.logoUrl === "string") CONFIG.logoUrl = profile.logoUrl;
    if (typeof profile.nowPlayingImgUrl === "string") CONFIG.nowPlayingImgUrl = profile.nowPlayingImgUrl;
  }

  function registerProfileMenu() {
    if (typeof GM_registerMenuCommand !== "function") return;

    GM_registerMenuCommand("Kies overlay-profiel", () => {
      const names = getProfileNames();
      if (!names.length) return;

      const current = getSelectedProfileName();
      const input = prompt(
        `Beschikbare profielen: ${names.join(", ")}\nHuidig profiel: ${current}\nVul profielnaam in:`,
        current
      );
      if (!input) return;

      const next = input.trim();
      if (!names.includes(next)) {
        alert(`Onbekend profiel: ${next}`);
        return;
      }

      storageSet(IMAGE_PROFILE_STORAGE_KEY, next);
      applyImageProfile();
      destroyUI();
      refreshOverlay();
      alert(`Overlay-profiel ingesteld op: ${next}`);
    });

    GM_registerMenuCommand("Toon overlay-profiel", () => {
      alert(`Actief overlay-profiel: ${getSelectedProfileName()}`);
    });
  }

  // ---------- REMOTE HEADLINES ----------
  function fetchHeadlinesFromServer() {
    return new Promise(resolve => {
      GM_xmlhttpRequest({
        method: "GET",
        url: CONFIG.remoteHeadlineUrl,
        timeout: 4000,
        onload: res => {
          try {
            const arr = JSON.parse(res.responseText);
            if (Array.isArray(arr) && arr.length > 0) {
              return resolve(arr);
            }
          } catch (e) {
            console.warn("JSON parse fout:", e, res.responseText);
          }
          resolve(null);
        },
        onerror: () => resolve(null),
        ontimeout: () => resolve(null)
      });
    });
  }


  async function refreshHeadlines() {
    const remote = await fetchHeadlinesFromServer();

    if (remote) {
      CONFIG.headlines = remote;
      lastRefreshSuccess = Date.now();
      console.log("Headlines ververst vanaf server:", remote);
    } else {
      console.warn("Falling back op lokale headlines.");
    }
  }

  // ---------- Helpers ----------
  const qs = (sel, root=document) => root.querySelector(sel);
  const isYouTubeMusicHost = () => /(^|\.)music\.youtube\.com$/i.test(location.hostname);
  const isNestkastHost = () => /(^|\.)nestkastlive\.nl$/i.test(location.hostname);
  const isVideoJsFullscreen = () => !!document.querySelector(".vjs-fullscreen");
  const isFullscreen = () => !!document.fullscreenElement;
  const shouldRenderNowPlaying = () => CONFIG.showNowPlaying && isYouTubeMusicHost();

  function getOverlayParent() {
    const fsEl = document.fullscreenElement;
    if (fsEl instanceof HTMLElement && fsEl.tagName !== "VIDEO") return fsEl;
    return document.body;
  }

  function attachRootToActiveParent() {
    if (!ui.root) return;
    const targetParent = getOverlayParent();
    if (ui.root.parentElement !== targetParent) {
      targetParent.appendChild(ui.root);
    }
  }

  function shouldShowOverlay() {
    if (isNestkastHost()) return isFullscreen() || isVideoJsFullscreen();
    return isFullscreen() || isVideoJsFullscreen();
  }

  function formatLocalTime() {
    try {
      const df = new Intl.DateTimeFormat(CONFIG.clockLocale, {
        ...CONFIG.clockOptions,
        timeZone: CONFIG.clockTimezone || undefined
      });
      return df.format(new Date()).replace(/\./g, "").toUpperCase();
    } catch {
      return new Date().toLocaleString().toUpperCase();
    }
  }

  function buildChunk() {
    const timeStr = `${CONFIG.clockPrefix} ${formatLocalTime()}`;
    const headStr = CONFIG.headlines.join(CONFIG.separator);
    const single = `${timeStr}${CONFIG.separator}${headStr}${CONFIG.separator}`;
    return Array(CONFIG.repeatChunks).fill(single).join("");
  }

  function getNowPlayingData() {
    const bar = qs("ytmusic-player-bar");
    const title =
      bar?.querySelector("yt-formatted-string.title")?.textContent?.trim() ||
      bar?.querySelector("#layout .content-info-wrapper .title")?.textContent?.trim() || "";
    const artist =
      bar?.querySelector(".byline .yt-simple-endpoint")?.textContent?.trim() ||
      bar?.querySelector(".byline")?.textContent?.trim() || "";
    return { artist, title };
  }

  // ---------- UI Builders ----------
  function makeBadge(label) {
    const b = document.createElement("div");
    b.textContent = label.toUpperCase();
    Object.assign(b.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: CONFIG.textInv,
      fontFamily: CONFIG.fontFamily,
      fontWeight: 900,
      fontSize: "12px",
      height: "44px",
      padding: "0 16px",
      background: CONFIG.black,
      clipPath: "polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%)",
    });
    return b;
  }

  function buildUI() {
    if (ui.root) return;

    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: "999999",
    });

    // ==== TICKER ====
    const ticker = document.createElement("div");
    Object.assign(ticker.style, {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: `${CONFIG.bottomPadding}px`,
      height: `${CONFIG.tickerHeight}px`,
      display: "flex",
      alignItems: "center",
      pointerEvents: "none",
    });

    const badge = makeBadge(CONFIG.tickerLabel);

    const band = document.createElement("div");
    Object.assign(band.style, {
      flex: "1 1 auto",
      background: CONFIG.yellow,
      borderRadius: `0 ${CONFIG.cornerRadius}px ${CONFIG.cornerRadius}px 0`,
      overflow: "hidden",
      scrollbarWidth: "none",      // Firefox
      msOverflowStyle: "none",     // IE / Edge Legacy
      position: "relative",
      height: "44px",
      display: "flex",
      alignItems: "center",
    });
    band.style.setProperty("-ms-overflow-style", "none");
    band.style.setProperty("scrollbar-width", "none");

    const track = document.createElement("div");
    Object.assign(track.style, {
      position: "absolute",
      left: 0,
      top: 0,
      height: "100%",
      whiteSpace: "nowrap",
      willChange: "transform",
      fontFamily: CONFIG.fontFamily,
      fontSize: CONFIG.fontSize,
      lineHeight: "44px",
      color: CONFIG.text,
    });

    const spanA = document.createElement("span");
    const spanB = document.createElement("span");
    spanA.textContent = buildChunk();
    spanB.textContent = buildChunk();

    track.appendChild(spanA);
    track.appendChild(spanB);
    band.appendChild(track);
    ticker.appendChild(badge);
    ticker.appendChild(band);

    root.appendChild(ticker);

    // ==== LOGO ====
    if (CONFIG.logoUrl) {
      const logo = document.createElement("img");
      logo.src = CONFIG.logoUrl;
      Object.assign(logo.style, {
        position: "fixed",
        top: `${CONFIG.leftPadding}px`,
        right: `${CONFIG.rightPadding}px`,
        width: `${CONFIG.logoSize}px`,
        height: `${CONFIG.logoSize}px`,
        objectFit: "contain",
        pointerEvents: "none",
        opacity: CONFIG.logoOpacity,
      });
      root.appendChild(logo);
    }

    // ==== NOW PLAYING IMAGE ====
    if (CONFIG.nowPlayingImgUrl) {
      const npimg = document.createElement("img");
      npimg.src = CONFIG.nowPlayingImgUrl;
      Object.assign(npimg.style, {
        position: "fixed",
        left: `${CONFIG.leftPadding + 10}px`,
        bottom: `${CONFIG.tickerHeight + CONFIG.bottomPadding + 50}px`,
        width: `${CONFIG.nowPlayingImgSize}px`,
        //height: `${CONFIG.nowPlayingImgSize}px`,
        objectFit: "contain",
        pointerEvents: "none",
        opacity: CONFIG.nowPlayingImgOpacity,
      });
      root.appendChild(npimg);
    }

    // ==== NOW PLAYING ====
    if (shouldRenderNowPlaying()) {
      const wrap = document.createElement("div");
      Object.assign(wrap.style, {
        position: "fixed",
        left: `${CONFIG.leftPadding + CONFIG.nowPlayingLeftShiftPx}px`,
        bottom: `${CONFIG.tickerHeight + CONFIG.bottomPadding + 10}px`,
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
        maxWidth: `${CONFIG.maxNowPlayingWidthVW}vw`,
      });

      const npBadge = makeBadge(CONFIG.nowLabel);

      const box = document.createElement("div");
      Object.assign(box.style, {
        background: CONFIG.yellow,
        padding: "0 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "44px",
        borderRadius: `0 ${CONFIG.cornerRadius}px ${CONFIG.cornerRadius}px 0`,
      });

      const artistEl = document.createElement("div");
      Object.assign(artistEl.style, {
        fontFamily: CONFIG.fontFamily,
        fontWeight: CONFIG.artistFontWeight,
        fontSize: CONFIG.artistFontSize,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });

      const titleEl = document.createElement("div");
      Object.assign(titleEl.style, {
        fontFamily: CONFIG.fontFamily,
        fontWeight: CONFIG.titleFontWeight,
        fontSize: CONFIG.titleFontSize,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginTop: "-2px",
      });

      box.appendChild(artistEl);
      box.appendChild(titleEl);
      wrap.appendChild(npBadge);
      wrap.appendChild(box);
      root.appendChild(wrap);

      ui.nowWrap  = wrap;
      ui.artistEl = artistEl;
      ui.titleEl  = titleEl;
    }

    document.body.appendChild(root);

    // Save refs
    ui.root = root;
    ui.track = track;
    ui.spanA = spanA;
    ui.spanB = spanB;

    requestAnimationFrame(() => {
      widthA = spanA.scrollWidth;
      widthB = spanB.scrollWidth;
      ui.spanB.style.transform = `translateX(${widthA}px)`;
      posX = 0;
      startScroll();
      initNowPlayingEarly();
    });
  }

  // ---------- Scrolling ----------
  async function startScroll() {
    lastTs = performance.now();

    const step = async ts => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      posX -= CONFIG.tickerSpeed * dt;
      ui.track.style.transform = `translateX(${posX}px)`;

      if (Math.abs(posX) >= widthA) {

        // ⭐⭐ HIER lijst verversen bij elk nummer ⭐⭐
        await refreshHeadlines();
        posX += widthA;
        const oldA = ui.spanA;
        ui.spanA = ui.spanB;
        ui.spanB = oldA;
        ui.spanB.textContent = buildChunk();
        widthA = ui.spanA.scrollWidth;
        widthB = ui.spanB.scrollWidth;
        ui.spanB.style.transform = `translateX(${widthA}px)`;
      }

      ui.rafId = requestAnimationFrame(step);
    };
    ui.rafId = requestAnimationFrame(step);
  }

  function stopScroll() {
    if (ui.rafId) cancelAnimationFrame(ui.rafId);
  }

  // ---------- NOW PLAYING FIX ----------
  // IMMEDIATE POLLING after UI creation to catch first track
  function initNowPlayingEarly() {
    let tries = 0;
    const interval = setInterval(() => {
      getNowPlaying();
      tries++;
      if (tries > 15) clearInterval(interval); // ~3 sec
    }, 200);
  }

  function getNowPlaying() {
    const { artist, title } = getNowPlayingData();
    if (!ui.artistEl || !ui.titleEl) return;

    if (artist && artist !== currentArtist) {
      currentArtist = artist;
      ui.artistEl.textContent = artist;
    }
    if (title && title !== currentTitle) {
      currentTitle = title;
      ui.titleEl.textContent = title;
    }
  }

  // ---------- Lifecycle ----------
  function refreshOverlay() {
    if (shouldShowOverlay()) {
      buildUI();
      attachRootToActiveParent();
    }
    else destroyUI();
  }

  function destroyUI() {
    stopScroll();
    if (ui.root) ui.root.remove();
    ui = { root:null, track:null, spanA:null, spanB:null, nowWrap:null, artistEl:null, titleEl:null, rafId:null };
  }

  document.addEventListener("fullscreenchange", refreshOverlay);
  document.addEventListener("webkitfullscreenchange", refreshOverlay);
  document.addEventListener("mozfullscreenchange", refreshOverlay);
  document.addEventListener("MSFullscreenChange", refreshOverlay);
  new MutationObserver(getNowPlaying).observe(document.documentElement, { childList:true, subtree:true });
  setInterval(getNowPlaying, 1000);
  setInterval(refreshOverlay, 1000);

  // ---- Regelmatige headline-refresh onafhankelijk van scroll ----
  setInterval(async () => {
      const old = JSON.stringify(CONFIG.headlines);
      const remote = await fetchHeadlinesFromServer();

      if (remote) {
          const newJson = JSON.stringify(remote);
          if (newJson !== old) {
              CONFIG.headlines = remote;

              // NIEUWE TEKST SETTEN
              if (ui.spanA) ui.spanA.textContent = buildChunk();
              if (ui.spanB) ui.spanB.textContent = buildChunk();

              // <<< BELANGRIJK: widths opnieuw meten >>>
              widthA = ui.spanA.scrollWidth;
              widthB = ui.spanB.scrollWidth;

              // <<< spanB terug op juiste beginpositie zetten >>>
              ui.spanB.style.transform = `translateX(${widthA}px)`;

              console.log("Headlines meteen ververst (interval).");
          }
      }
  }, 20000);

  applyImageProfile();
  registerProfileMenu();
  refreshOverlay();
})();
