// ==UserScript==
// @name         Confluence Ctrl+F Browser Override
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Force browser find instead of Confluence find/replace in edit mode, with compact toggle button
// @author       Robert
// @match        https://*.atlassian.net/wiki/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let overrideEnabled = true;
    let toggleBtn = null;

    // Maak compacte toggle-knop
    function createToggleButton() {
        toggleBtn = document.createElement('div');
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.bottom = '5px';
        toggleBtn.style.right = '5px';
        toggleBtn.style.zIndex = '9999';
        toggleBtn.style.width = '28px';
        toggleBtn.style.height = '28px';
        toggleBtn.style.borderRadius = '4px'; // Vierkant met lichte afronding
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '14px';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        toggleBtn.style.fontWeight = 'bold';
        toggleBtn.style.userSelect = 'none';
        updateButtonStyle();

        toggleBtn.title = 'Toggle Ctrl+F Override';
        toggleBtn.textContent = 'F';

        toggleBtn.addEventListener('click', () => {
            overrideEnabled = !overrideEnabled;
            updateButtonStyle();
        });

        document.body.appendChild(toggleBtn);
    }

    function updateButtonStyle() {
        if (!toggleBtn) return;
        toggleBtn.style.background = overrideEnabled ? '#36B37E' : '#FF5630'; // Groen = aan, rood = uit
    }

    // Detectie edit mode
    function isEditMode() {
        return window.location.href.includes('/edit') || document.querySelector('[data-testid="editor-container"]');
    }

    // Event listener voor Ctrl+F
    document.addEventListener('keydown', function(e) {
        if (!isEditMode() || !overrideEnabled) return;

        const isCtrlF = (e.ctrlKey && e.key.toLowerCase() === 'f') || (e.metaKey && e.key.toLowerCase() === 'f');
        if (isCtrlF) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            // Geen preventDefault → browser zoekfunctie blijft werken
        }
    }, true);

    // Observeer DOM voor edit mode en toggle-knop
    const observer = new MutationObserver(() => {
        if (isEditMode()) {
            if (!toggleBtn) createToggleButton();
        } else {
            if (toggleBtn) {
                toggleBtn.remove();
                toggleBtn = null;
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
