// ==UserScript==
// @name         Jira Exit Criteria Helper
// @namespace    Jira
// @version      1.0
// @description  Exit criteria per workflowkolom
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=afas.nl
// @author       Robert
// @match        https://*.atlassian.net/jira/software/c/projects/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const EXIT_CRITERIA = {

        "Selected for Next": [
            "Confluence page has been created with first context",
            "Item is prioritized by CSC for further analysis",
            "Leading architect, Business Owner and Business analyst are known",
            "Epic fields in Align are filled in (projectnumber, customers concerned, …)"
        ],

        "Provide business and technical": [
            "Epic is ready up till the red line",
            "The business scope is known",
            "The technical scope is known",
            "High over impact is added",
            "The Focus Area's affected are known",
            "Risk assessment strategy is added",
            "Approval of PO on slicing"
        ],

        "Collect impact and align with": [
            "Kick-off with (at least frontrunners in uphill team) has taken place",
            "Impact has been communicated to customers and approved if necessary"
        ],

        "Uphill in team": [
            "The epic page on Confluence has been completely filled in",
            "Impact is provided by the team",
            "The epic & storymap has been reviewed by CSC and architecture"
        ],

        "Impact check": [
            "The high-over impact has been compared with the team's TW impact",
            "Any discrepancies have been communicated and aligned with the customers and the CSC",
            "The implementation strategy is known"
        ],

        "In analysis & pokering": [
            "All stories have been pokered",
            "The team estimation has been updated to the final expected impact"
        ]
    };

    let popup;
    let pinned = false;

    function createPopup() {

        if (popup) return;

        popup = document.createElement('div');

        popup.style.cssText = `
            position: fixed;
            display: none;
            width: 420px;
            max-width: 420px;
            background: white;
            border: 1px solid #DFE1E6;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 8px 24px rgba(9,30,66,.25);
            z-index: 999999;
            font-family: Atlassian Sans, sans-serif;
            font-size: 13px;
            color: #172B4D;
        `;

        document.body.appendChild(popup);

        popup.addEventListener('mouseenter', () => {
            pinned = true;
        });

        popup.addEventListener('mouseleave', () => {
            pinned = false;
            hidePopup();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                pinned = false;
                hidePopup();
            }
        });
    }

    function showPopup(icon, columnName) {

        const rect = icon.getBoundingClientRect();

        popup.innerHTML = `
            <div style="
                font-size:15px;
                font-weight:600;
                margin-bottom:10px;
            ">
                ${columnName}
            </div>

            <div style="
                font-size:12px;
                color:#44546F;
                margin-bottom:8px;
            ">
                Exit criteria
            </div>

            <ul style="
                margin:0;
                padding-left:18px;
                line-height:1.65;
            ">
                ${EXIT_CRITERIA[columnName]
                    .map(item => `<li>${item}</li>`)
                    .join('')}
            </ul>

            <div style="
                margin-top:12px;
                font-size:11px;
                color:#6B778C;
            ">
                Hover over this window to keep it open. Press ESC to close.
            </div>
        `;

        popup.style.left = `${Math.max(10, rect.left - 20)}px`;
        popup.style.top = `${rect.bottom + 10}px`;
        popup.style.display = 'block';
    }

    function hidePopup() {
        if (!pinned) {
            popup.style.display = 'none';
        }
    }

    function injectIcons() {

        Object.keys(EXIT_CRITERIA).forEach(columnName => {

            const titleElement =
                [...document.querySelectorAll('[title]')]
                    .find(el => el.getAttribute('title') === columnName);

            if (!titleElement) return;

            const container = titleElement.parentElement;

            if (!container) return;

            if (container.querySelector(`[data-exit-icon="${columnName}"]`)) {
                return;
            }

            const icon = document.createElement('span');

            icon.dataset.exitIcon = columnName;
            icon.textContent = '🫷🏻';

            icon.style.cssText = `
                display:inline-block;
                margin-left:6px;
                cursor:help;
                font-size:15px;
                user-select:none;
                vertical-align:middle;
            `;

            icon.addEventListener('mouseenter', () => {
                showPopup(icon, columnName);
            });

            icon.addEventListener('mouseleave', () => {
                setTimeout(hidePopup, 200);
            });

            container.appendChild(icon);
        });
    }

    createPopup();

    setInterval(injectIcons, 1000);

})();
