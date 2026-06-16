// ==UserScript==
// @name         Align - Verberg Backlog Rank knop
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Verbergt de knop "Apply Backlog Rank" zodat je de FPS priolijst niet kan vernaggelen.
// @author       Robert
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Align%20-%20Hide%20Backlog%20Rank%20button.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Align%20-%20Hide%20Backlog%20Rank%20button.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jiraalign.com
// @match        https://*.jiraalign.com/ForecastMainPage*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // CSS toevoegen om de knop permanent te verbergen
    const style = document.createElement('style');
    style.textContent = `
        #backlog-kanban-view-button {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(style);
    console.log('CSS regel toegevoegd om knop te verbergen');

    // Functie om de knop te verbergen via JavaScript
    function hideButton() {
        const button = document.getElementById('backlog-kanban-view-button');
        if (button) {
            button.style.display = 'none !important';
            button.style.visibility = 'hidden';
            console.log('Button verborgen via JavaScript');
        }
    }

    // Voer de verbergfunctie uit
    hideButton();

    // Observeer wijzigingen in het DOM
    const observer = new MutationObserver(() => {
        hideButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('MutationObserver gestart - script is actief');
})();
