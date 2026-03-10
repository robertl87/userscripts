// ==UserScript==
// @name         Jira Backlog Search Fix
// @namespace    http://tampermonkey.net/
// @version      2025-11-10
// @description  Zorgt dat Ctrl+F direct werkt in Jira backlog zonder eerst te scrollen, met visuele melding.
// @author       Robert
// @match        https://*.atlassian.net/jira/software/c/projects/*/boards/*/backlog*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function showNotice(message, type = "info") {
        const div = document.createElement("div");
        div.textContent = message;
        div.style.position = "fixed";
        div.style.bottom = "16px";
        div.style.right = "16px";
        div.style.zIndex = 99999;
        div.style.padding = "10px 16px";
        div.style.borderRadius = "8px";
        div.style.fontSize = "14px";
        div.style.fontFamily = "Arial, sans-serif";
        div.style.color = "white";
        div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        div.style.backgroundColor = type === "success" ? "#36B37E" : "#6554C0";
        div.textContent = message;

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3500);
    }

    function adjustScroll() {
        console.log("⏳ Scroll fix gestart...");
        showNotice("Scroll fix gestart...");

        if (document.getElementById("scrollable")) {
            console.log("✅ Scrollable container bestaat al.");
            showNotice("Scroll fix al actief", "success");
            return;
        }

        const boardScroll = document.querySelector('[data-testid="platform-board-kit.ui.board.scroll.board-scroll"]');
        const backlogScroll = document.querySelector('[data-testid="software-backlog.backlog-content.scrollable"]');
        const container = boardScroll ?? backlogScroll;

        if (!container) {
            console.log("❌ Geen scrollcontainer gevonden.");
            showNotice("Geen scrollcontainer gevonden", "error");
            return;
        }

        const totalHeight = [...container.childNodes]
            .map(node => node.offsetHeight || 0)
            .reduce((sum, h) => sum + h, 0) + 48;

        if (boardScroll) boardScroll.style.maxHeight = "unset";
        if (backlogScroll) backlogScroll.style.overflowY = "hidden";

        container.style.height = `${totalHeight}px`;
        container.style.maxHeight = "unset";

        window.dispatchEvent(new Event("resize"));

        setTimeout(() => {
            const wrapper = document.createElement("div");
            wrapper.id = "scrollable";
            wrapper.style.height = "100%";
            wrapper.style.width = "100%";
            wrapper.style.overflowY = "scroll";

            container.parentNode.insertBefore(wrapper, container);
            wrapper.appendChild(container);
            container.style.height = "unset";

            console.log("✅ Scroll fix toegepast.");
            showNotice("Scroll fix toegepast ✅", "success");
        }, 0);
    }

    function waitForContainer() {
        let tries = 0;
        const checkInterval = setInterval(() => {
            const board = document.querySelector('[data-testid="platform-board-kit.ui.board.scroll.board-scroll"]');
            const backlog = document.querySelector('[data-testid="software-backlog.backlog-content.scrollable"]');

            if (board || backlog) {
                clearInterval(checkInterval);
                console.log("✅ Backlog-container gevonden, wacht nog even tot rendering klaar is...");
                setTimeout(adjustScroll, 1000);
            }

            if (++tries > 30) {
                clearInterval(checkInterval);
                console.log("⚠️ Backlog-container niet gevonden binnen tijdslimiet.");
            }
        }, 500);
    }

    // Start observer + fallback
    const observer = new MutationObserver(() => {
        const board = document.querySelector('[data-testid="platform-board-kit.ui.board.scroll.board-scroll"]');
        const backlog = document.querySelector('[data-testid="software-backlog.backlog-content.scrollable"]');
        if (board || backlog) {
            observer.disconnect();
            setTimeout(adjustScroll, 1000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback-polling
    waitForContainer();
})();
