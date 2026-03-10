
// ==UserScript==
// @name         Jira Cloud Linked Issue Shift+Click Fix
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Open Jira linked issues in new window on Shift+Click or Ctrl+Shift+Click
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Jira%20Cloud%20Linked%20Issue%20Shift+Click%20Fix.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Jira%20Cloud%20Linked%20Issue%20Shift+Click%20Fix.user.js
// @icon         https://www.pngall.com/wp-content/uploads/15/Jira-Logo-Transparent-180x180.png
// @author       Robert
// @match        https://*.atlassian.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('click', function(e) {
        // Zoek naar een link met data-is-router-link="true"
        const link = e.target.closest('a[data-is-router-link="true"]');
        if (!link) return;

        // Alleen ingrijpen bij Shift+klik
        if (e.shiftKey) {
            e.preventDefault();
            const url = link.href;

            if (url) {
                // Opties voor nieuw venster
                const features = 'noopener,noreferrer,width=1200,height=800';
                const newWindow = window.open(url, '_blank', features);

                // Als Ctrl ook ingedrukt is → focus op het nieuwe venster
                if (e.ctrlKey && newWindow) {
                    newWindow.focus();
                }
            }
        }
        // Ctrl+klik laten zoals Jira het zelf doet (werkt al)
    }, true);
})();
