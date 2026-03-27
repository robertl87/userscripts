// ==UserScript==
// @name         Atlassian auto click Doorgaan button
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Klik automatisch op de "Doorgaan" knop op de Atlassian login pagina
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Atlassian%20auto%20click%20Doorgaan%20button.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Atlassian%20auto%20click%20Doorgaan%20button.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.com
// @author       Robert
// @match        https://id.atlassian.com/login?continue*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let hasClicked = false; // Flag om dubbel klikken te voorkomen
    let observer;

    function clickContinueButton() {
        if (hasClicked) return; // Stop als we al geklikt hebben
        
        const continueButton = document.querySelector('button[data-testid="remember-me-select-account-continue-button"]');
        if (continueButton) {
            console.log("Knop gevonden, klikken...");
            hasClicked = true; // Markeer dat we geklikt hebben
            observer.disconnect(); // Stop de observer
            continueButton.click();
        } else {
            console.log("Knop niet gevonden, wacht op veranderingen...");
        }
    }

    // Observer om te wachten op veranderingen in de DOM
    observer = new MutationObserver(clickContinueButton);
    observer.observe(document.body, { childList: true, subtree: true });

    // Probeer de knop te klikken bij het laden van de pagina
    window.addEventListener('load', clickContinueButton);
})();
