// ==UserScript==
// @name         Redirect to Archive.is
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Redirect specific domain links to Archive.is
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Newspaper%20paywall%20to%20Archive.is.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Newspaper%20paywall%20to%20Archive.is.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dpgmediagroup.com
// @author       Robert
// @include      *://*.ad.nl/*
// @include      *://*.tubantia.nl/*
// @include      *://*.destentor.nl/*
// @match        *://*.ad.nl/*
// @match        *://*.tubantia.nl/*
// @match        *://*.destentor.nl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // De huidige URL
    const currentUrl = window.location.href;
    console.log("Huidige URL:", currentUrl); // Log de huidige URL

    // Reguliere expressie om te controleren of de huidige URL de homepage is
    const homepagePattern = /^(https?:\/\/(www\.)?([a-z]*\.(nl|com))\/?)$/;

    // Controleer of de huidige URL de homepage is
    const isHomepage = homepagePattern.test(currentUrl);

    if (!isHomepage) {
        // Bouw de nieuwe URL voor Archive.is
        const archiveUrl = `https://archive.is/search/?q=${encodeURIComponent(currentUrl)}`;
        console.log("Archive URL:", archiveUrl); // Log de Archive.is URL

        // Redirect naar de nieuwe URL
        window.location.href = archiveUrl;
    } else {
        console.log("Geen redirect, huidige URL is homepage.");
    }
})();
