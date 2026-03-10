// ==UserScript==
// @name         AFAS InSite - Highlight volledige week (NL/EN Monday support, Firefox compatible)
// @namespace    https://your-namespace.example
// @version      2.0
// @description  Detecteer Monday/Maandag vandaag en highlight de volledige week + matrix, zonder :has().
// @match        https://*.afasinsite.nl/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    /* Highlight volledige week in de kalender */
    .week.highlight-week {
      background-color: red !important;
    }

    /* Matrix highlight */
    .matrix-component.highlight-week .header > div span {
      color: red !important;
    }

    .matrix-component.highlight-week .valuecontrol input {
      background-color: #ff000040 !important;
    }
  `);

  function updateWeekHighlight() {
    // Zoek de geselecteerde dag
    const today = document.querySelector(".day.is-selected.is-today");
    if (!today) return clearAll();

    const aria = today.getAttribute("aria-label") || "";

    // Ondersteunt zowel NL als EN dagnaam
    const matchesMonday =
      aria.includes("Maandag") || aria.includes("Monday");

    if (!matchesMonday) return clearAll(); // Vandaag is niet maandag → niks highlighten

    // De week-row waarop de dag staat
    const weekRow = today.closest(".week");
    if (!weekRow) return clearAll();

    // Highlight de week
    document.querySelectorAll(".week.highlight-week")
      .forEach(el => el.classList.remove("highlight-week"));

    weekRow.classList.add("highlight-week");

    // Highlight de passende matrix-component
    highlightMatrix();
  }

  function highlightMatrix() {
    // Alle matrix componenten eerst cleanen
    document.querySelectorAll(".matrix-component.highlight-week")
      .forEach(el => el.classList.remove("highlight-week"));

    // Zoek de panel-structuur waarin vandaag staat
    const sidePanel = document.querySelector(".webGrid-side-panel");
    if (!sidePanel) return;

    const today = sidePanel.querySelector(".day.is-selected.is-today");
    if (!today) return;

    // De matrix-component staat er vlak voor
    const matrix = sidePanel.previousElementSibling;
    if (!matrix || !matrix.classList.contains("matrix-component")) return;

    matrix.classList.add("highlight-week");
  }

  function clearAll() {
    document.querySelectorAll(".highlight-week")
      .forEach(el => el.classList.remove("highlight-week"));
  }

  // Eerste check
  updateWeekHighlight();

  // Observer houdt dynamische updates bij
  const obs = new MutationObserver(updateWeekHighlight);
  obs.observe(document.body, { childList: true, subtree: true });
})();
