// ==UserScript==
// @name         Atlassian auto click Doorgaan button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Klik automatisch op de "Doorgaan" knop op de Atlassian login pagina
// @author       ChatGPT
// @match        https://id.atlassian.com/login?continue*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Functie om de knop te vinden en erop te klikken
    function clickContinueButton() {
        const continueButton = document.querySelector('button[data-testid="remember-me-select-account-continue-button"]');
        if (continueButton) {
            console.log("Knop gevonden, klikken...");
            continueButton.click();
        } else {
            console.log("Knop niet gevonden, wacht op veranderingen...");
        }
    }

    // Observer om te wachten op veranderingen in de DOM
    const observer = new MutationObserver(clickContinueButton);
    observer.observe(document.body, { childList: true, subtree: true });

    // Probeer de knop te klikken bij het laden van de pagina
    window.addEventListener('load', clickContinueButton);
})();
