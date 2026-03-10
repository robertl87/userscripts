
// ==UserScript==
// @name         Jira Cloud Linked Issue Shift+Click Fix
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Open Jira linked issues in new window on Shift+Click or Ctrl+Shift+Click
// @author       Robret
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
