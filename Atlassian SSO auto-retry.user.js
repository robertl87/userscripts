// ==UserScript==
// @name         Atlassian SSO auto-retry
// @namespace    tf-atlassian-sso
// @version      1.1
// @description  SSO-(her)start en keer terug naar gevraagde pagina bij Atlassian Jira Cloud (multi-tenant)
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Atlassian%20SSO%20auto-retry.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Atlassian%20SSO%20auto-retry.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.net
// @author       Robert
// @match        https://*.atlassian.net/issues*
// @match        https://*.atlassian.net/jira/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* ================= CONFIG ================= */

    const MAX_RETRIES = 1;
    const POLL_INTERVAL_MS = 500;
    const POLL_TIMEOUT_MS = 20000;
    const SSO_MAX_WAIT_MS = 30000;

    const ERROR_TEXTS = [
        'Er is iets misgegaan aan onze kant',
        'Something went wrong on our end',
        'Something’s gone wrong',
        'We ran into a problem'
    ];

    const STORAGE_KEY = 'tf_sso_state';

    console.debug('[SSO] gestart:', location.href);

    /* ================= STATE ================= */

    function loadState() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null;
        } catch {
            return null;
        }
    }

    function saveState(state) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function clearState() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    function hasErrorText() {
        return document.body &&
            ERROR_TEXTS.some(t => document.body.innerText.includes(t));
    }

    function getTenantRoot() {
        return location.origin + '/';
    }

    /* ================= SSO TRIGGER ================= */

    function triggerSSO(manual = false) {
        const state = loadState();
        const retries = state?.retries ?? 0;

        if (retries >= MAX_RETRIES) {
            console.warn('[SSO] max retries bereikt');
            clearState();
            return;
        }

        console.warn(
            manual
                ? '[SSO] handmatige SSO gestart'
                : '[SSO] fout gedetecteerd, SSO gestart'
        );

        saveState({
            targetUrl: location.href,
            retries: retries + 1,
            ts: Date.now()
        });

        location.href = getTenantRoot();
    }

    /* ================= JIRA SPA INTERCEPT ================= */

    function interceptHistory(fnName) {
        const original = history[fnName];
        history[fnName] = function (...args) {
            const result = original.apply(this, args);

            const state = loadState();
            if (state?.targetUrl) {
                console.warn('[SSO] Jira navigatie gedetecteerd → terug naar target');
                clearState();
                location.href = state.targetUrl;
            }

            return result;
        };
    }

    interceptHistory('pushState');
    interceptHistory('replaceState');

    /* ================= FAIL-SAFE ================= */

    setTimeout(() => {
        const state = loadState();
        if (state?.targetUrl) {
            console.warn('[SSO] fail-safe redirect');
            clearState();
            location.href = state.targetUrl;
        }
    }, SSO_MAX_WAIT_MS);

    /* ================= FOUTDETECTIE ================= */

    window.addEventListener('load', () => {
        const start = Date.now();

        const timer = setInterval(() => {
            if (hasErrorText()) {
                clearInterval(timer);
                injectForceButton();
                triggerSSO(false);
            } else if (Date.now() - start > POLL_TIMEOUT_MS) {
                clearInterval(timer);
            }
        }, POLL_INTERVAL_MS);
    });

    /* ================= FORCEER KNOP ================= */

    function injectForceButton() {
        if (document.getElementById('tf-force-sso')) return;

        const btn = document.createElement('button');
        btn.id = 'tf-force-sso';
        btn.textContent = 'Forceer SSO';
        btn.onclick = () => triggerSSO(true);

        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            padding: '10px 16px',
            background: '#0052CC',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        });

        document.body.appendChild(btn);
    }

})();
