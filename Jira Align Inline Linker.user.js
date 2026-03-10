// ==UserScript==
// @name         Jira Align Inline Linker
// @namespace    http://tampermonkey.net/
// @version      2026-02-02
// @description  Voeg een subtiele link achter Align ID in Jira Cloud
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Jira%20Align%20Inline%20Linker.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Jira%20Align%20Inline%20Linker.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jiraalign.com
// @author       Robert
// @match        https://topicusfinance.atlassian.net/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function addInlineLinks() {
        const rows = document.querySelectorAll('tr');

        rows.forEach(row => {
            const thText = row.querySelector('th p')?.innerText.trim();
            const tdP = row.querySelector('td p');
            const tdText = tdP?.innerText.trim();

            if (tdText && tdText.startsWith('Align ID:') && !tdP.dataset.alignLinked) {
                const alignId = tdText.replace('Align ID:', '').trim();

                let url = null;
                if (thText === 'Epic') {
                    url = `https://topicus.jiraalign.com/RequestGrid?FirstTime=True&FeatureID=${alignId}`;
                } else if (thText === 'Initiative') {
                    url = `https://topicus.jiraalign.com/EpicGrid?FirstTime=True&EpicID=${alignId}`;
                }

                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.textContent = ' 🔗';
                    link.style.cssText = 'margin-left:5px; text-decoration:none; color:#0052CC; font-weight:bold;';
                    tdP.appendChild(link);

                    // Markeer als verwerkt om dubbele links te voorkomen
                    tdP.dataset.alignLinked = "true";
                }
            }
        });
    }

    // Observeer ALLE wijzigingen in de pagina (SPA compatible)
    const observer = new MutationObserver(() => {
        addInlineLinks();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
