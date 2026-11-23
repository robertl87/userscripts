// ==UserScript==
// @name         AFAS InSite - Highlight Monday
// @namespace    https://your-namespace.example
// @version      2.2
// @description  Detecteer maandag vandaag en highlight de week + matrix
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/AFAS%20InSite%20-%20Highlight%20Monday.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/AFAS%20InSite%20-%20Highlight%20Monday.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=afas.nl
// @author       Robert
// @match        https://*.afasinsite.nl/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const datepickerStyles = new CSSStyleSheet();
  const selectedMondayWeek =
    ':host([selection-mode="week"]) .week[aria-selected="true"]:has(.day.is-today:is([aria-label^="Maandag," i], [aria-label^="Monday," i]))';
  datepickerStyles.replaceSync(`
    ${selectedMondayWeek},
    ${selectedMondayWeek} > .tile {
      background-color: red !important;
      color: white !important;
    }

    ${selectedMondayWeek} .day-number {
      color: white !important;
    }
  `);

  GM_addStyle(`
    /* Highlight volledige week in de kalender */
    .week.highlight-week {
      background-color: red !important;
    }

    /* Matrix highlight */
    .matrix-component.highlight-week .header > div span {
      color: red !important;
    }

    .matrix-component.highlight-week .matrix-component-header .matrix-cell-component-column-title .calendar-header-day-title span {
      color: red !important;
    }

    .matrix-component.highlight-week .valuecontrol input {
      background-color: #ff000040 !important;
    }
  `);

  function updateWeekHighlight() {
    document.querySelectorAll("afas-datepicker").forEach(picker => {
      const root = picker.shadowRoot;
      if (root && !root.adoptedStyleSheets.includes(datepickerStyles)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, datepickerStyles];
      }
    });

    const matrix = document.querySelector(".matrix-component");
    const today =
      matrix?.querySelector(".calendar-header-day-title .title__day-name.is-today") ||
      document.querySelector(".day.is-selected.is-today");
    if (!today) return clearAll();

    const dayName = today.matches(".title__day-name")
      ? today.textContent || ""
      : today.getAttribute("aria-label") || "";
    const matchesMonday = /maandag|monday/i.test(dayName);

    if (!matchesMonday) return clearAll(); // Vandaag is niet maandag → niks highlighten

    const weekRow = today.closest(".week");
    document.querySelectorAll(".week.highlight-week")
      .forEach(el => el.classList.remove("highlight-week"));

    if (weekRow) weekRow.classList.add("highlight-week");

    document.querySelectorAll(".matrix-component.highlight-week")
      .forEach(el => el.classList.remove("highlight-week"));

    if (matrix) matrix.classList.add("highlight-week");
  }

  function clearAll() {
    document.querySelectorAll(".highlight-week")
      .forEach(el => el.classList.remove("highlight-week"));
  }

  // Eerste check
  updateWeekHighlight();
  customElements.whenDefined("afas-datepicker").then(updateWeekHighlight);

  // Observer houdt dynamische updates bij
  const obs = new MutationObserver(updateWeekHighlight);
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["selected-date"],
  });
})();
