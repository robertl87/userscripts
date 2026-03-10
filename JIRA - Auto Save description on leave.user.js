// ==UserScript==
// @name         JIRA | Auto Save description on leave
// @version      2025-09-30
// @description  try to take over the world!
// @author       Martijn Heuvelink
// @match        https://*.atlassian.net/browse/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function sendAction(textarea) {
        console.log("Triggering Ctrl+Enter + Save...");

        // Fire synthetic Ctrl+Enter
        const ctrlEnter = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            ctrlKey: true,
            bubbles: true,
            cancelable: true
        });
        textarea.dispatchEvent(ctrlEnter);

        // Click save button
        const saveButton = document.querySelector('[data-testid="comment-save-button"]');
        if (saveButton) {
            saveButton.click();
            console.log("Save button clicked.");
        } else {
            console.warn("Save button not found!");
        }
    }

    function attachListeners(textarea) {
        if (textarea.dataset._listenersAttached) return; // prevent duplicates
        textarea.dataset._listenersAttached = "true";

        textarea.addEventListener("focusout", () => {
            if (document.querySelector('span[aria-controls="typeahaed_decoration_element_id"]') == null) sendAction(textarea)
        });

        window.addEventListener("blur", () => {
            if (document.activeElement === textarea) sendAction(textarea);
        });

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden" && document.activeElement === textarea) {
                sendAction(textarea);
            }
        });

        console.log("Listeners attached to textarea");
    }

    // Keep watching for textarea (doesn't stop after first detection)
    setInterval(() => {
        const textarea = document.querySelector("#ak-editor-textarea");
        if (textarea) attachListeners(textarea);
    }, 1000);
})();

