// ==UserScript==
// @name         Align - Verberg Backlog Rank knop
// @namespace    http://tampermonkey.net/
// @version      1.1
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

    // Functie om de knop te verbergen
    function hideButton() {
        const button = document.getElementById('backlog-kanban-view-button');
        if (button) {
            button.style.display = 'none';
            clearInterval(interval); // Stop met controleren als de knop is verborgen
        }
    }

    // Controleer elke 500 milliseconden of de knop beschikbaar is
    const interval = setInterval(hideButton, 500);
})();
