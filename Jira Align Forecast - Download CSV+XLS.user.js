// ==UserScript==
// @name         Jira Align Forecast – Download CSV / XLS
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Adds "Download CSV" and "Download XLS" buttons to the Forecast page header so you can export all loaded epic rows with their team allocations.
// @author       Robert
// @updateURL    https://github.com/robertl87/userscripts/raw/refs/heads/main/Jira%20Align%20Forecast%20-%20Download%20CSV+XLS.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/Jira%20Align%20Forecast%20-%20Download%20CSV+XLS.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jiraalign.com
// @match        *://*.jiraalign.com/ForecastSort*
// @match        *://*.jiraalign.com/ForecastMainPage*
// @match        *://*.jiraalign.com/Forecast*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────

    /** Build a YYYYMMDD-HHMM timestamp string from the current local time. */
    function timestamp() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return (
            d.getFullYear() +
            pad(d.getMonth() + 1) +
            pad(d.getDate()) +
            '-' +
            pad(d.getHours()) +
            pad(d.getMinutes())
        );
    }

    /** Trigger a browser file download from a Blob. */
    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        // Cleanup after a short delay to let the download start.
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 500);
    }

    /** Escape a single cell value for RFC-4180 CSV: wrap in quotes, escape embedded quotes. */
    function csvCell(value) {
        const s = (value === null || value === undefined) ? '' : String(value).trim();
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    /** Convert a 2-D array of strings into a CSV string. */
    function toCSV(rows) {
        return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    }

    /**
     * Convert a 2-D array of strings into an Excel-compatible HTML table
     * that Excel / LibreOffice will open directly as a spreadsheet when
     * given the vnd.ms-excel MIME type.
     */
    function toXLSHtml(rows) {
        const esc = (s) =>
            String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

        const headerRow = rows[0]
            .map((h) => `<th>${esc(h)}</th>`)
            .join('');

        const dataRows = rows
            .slice(1)
            .map((row) => '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>')
            .join('\n');

        return (
            '<html xmlns:o="urn:schemas-microsoft-com:office:office"' +
            ' xmlns:x="urn:schemas-microsoft-com:office:excel"' +
            ' xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><meta charset="UTF-8">' +
            '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>' +
            '<x:ExcelWorksheet><x:Name>Forecast</x:Name>' +
            '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
            '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
            '</head><body>' +
            '<table border="1"><thead><tr>' + headerRow + '</tr></thead><tbody>' +
            dataRows +
            '</tbody></table></body></html>'
        );
    }

    /** Wait helper for async DOM refresh flows. */
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ─────────────────────────────────────────────────────────────
    // Data extraction
    // ─────────────────────────────────────────────────────────────

    /**
     * Read team header info from the DOM.
     * Returns an ordered array of { teamId, teamName } objects
     * that matches the left-to-right order of team columns in every data row.
     */
    function readTeamHeaders() {
        const teams = [];
        // Each team header wrapper carries data-team-id and data-release-id;
        // the team name is in the <p class="css-vertical-text"> child.
        document.querySelectorAll('.teamNameWrapperWidth[data-team-id]').forEach((wrapper) => {
            const teamId = wrapper.getAttribute('data-team-id');
            // Avoid duplicates (same team can appear in multiple releases).
            if (teams.some((t) => t.teamId === teamId)) return;
            const p = wrapper.querySelector('p.css-vertical-text');
            const teamName = p ? p.title.replace(/^\d+:\s*/, '') : teamId;
            teams.push({ teamId, teamName });
        });
        return teams;
    }

    /**
     * Read the fixed (non-team) column headers from the first table header region found.
     * Returns { piLabel, programLabel, teamLabel }.
     */
    function readFixedHeaders() {
        const piEl = document.querySelector('.column.piForecasts');
        const programEl = document.querySelector('.column.programForecasts');
        const teamEl = document.querySelector('.column.teamForecasts');
        return {
            piLabel: piEl ? piEl.textContent.trim() : 'Heartbeat estimate',
            programLabel: programEl ? programEl.textContent.trim() : 'Train estimate',
            teamLabel: teamEl ? teamEl.textContent.trim() : 'Team estimate',
        };
    }

    /**
     * Determine the release ID for an epic row from its id attribute.
     * E.g., "1_10269_28_val" → releaseId = "28".
     */
    function releaseIdFromRowId(rowId) {
        // format: {type}_{epicId}_{releaseId}_val
        const parts = rowId.split('_');
        // parts[2] is the releaseId when format is exactly 4 parts
        return parts.length >= 4 ? parts[parts.length - 2] : null;
    }

    /**
     * Main extraction function.
     * Returns a 2-D array: first row = headers, subsequent rows = data.
     */
    function extractData() {
        const teams = readTeamHeaders();
        const { piLabel, programLabel, teamLabel } = readFixedHeaders();

        // Column headers
        const headers = [
            'Release',
            'Epic ID',
            'Epic Name',
            piLabel,
            programLabel,
            teamLabel,
            ...teams.map((t) => t.teamName),
        ];

        const dataRows = [];

        // Epic rows: selector targets actual epic items (have workitemid attr),
        // excluding the summary/totals rows (epic-general-row has no workitemid).
        const epicRows = document.querySelectorAll(
            'div.table-epic.clsTREpic[workitemid]'
        );

        // Pre-build a map of release labels from .releasesName .SMT spans
        const releaseLabels = {};
        document.querySelectorAll('.objectGrid[id^="table_"]').forEach((grid) => {
            const releaseId = grid.id.replace('table_', '');
            const smtEl = grid.querySelector('.releasesName .SMT');
            releaseLabels[releaseId] = smtEl ? smtEl.textContent.trim() : releaseId;
        });

        epicRows.forEach((row) => {
            const epicId = row.getAttribute('workitemid') || '';
            const epicName = row.getAttribute('title') || '';
            const rowId = row.id || '';
            const releaseId = releaseIdFromRowId(rowId);
            const releaseLabel = releaseId ? (releaseLabels[releaseId] || releaseId) : '';

            // Fixed estimate columns — values are inside <span> elements
            const piSpan = row.querySelector('.column.piForecasts span');
            const programSpan = row.querySelector('.column.programForecasts span');
            const teamSpan = row.querySelector('.column.teamForecasts span');

            const piVal = piSpan ? piSpan.textContent.trim() : '';
            const programVal = programSpan ? programSpan.textContent.trim() : '';
            const teamVal = teamSpan ? teamSpan.textContent.trim() : '';

            // Team allocation columns — input[id^="txtTW_1_{epicId}_{teamId}_{releaseId}"]
            const teamValues = teams.map(({ teamId }) => {
                // Build the precise input id to avoid ambiguity between epics
                const inputId = `txtTW_1_${epicId}_${teamId}_${releaseId}`;
                const input = row.querySelector(`input#${CSS.escape(inputId)}`);
                // Fallback: search within the row by data attribute if exact id not found
                if (input) return input.value;
                const fallback = row.querySelector(
                    `[data-capacity-column-${releaseId}-${teamId}] input.txtTW`
                );
                return fallback ? fallback.value : '';
            });

            dataRows.push([
                releaseLabel,
                epicId,
                epicName,
                piVal,
                programVal,
                teamVal,
                ...teamValues,
            ]);
        });

        return { rows: [headers, ...dataRows], count: dataRows.length };
    }

    /** Read current epic row count from the loaded grid. */
    function epicRowCount() {
        return document.querySelectorAll('div.table-epic.clsTREpic[workitemid]').length;
    }

    /**
     * Click "Load More" before export to ensure additional rows are loaded.
     * Repeats while the button is available and new rows keep appearing.
     */
    async function ensureAllRowsLoaded() {
        const maxClicks = 40;
        for (let i = 0; i < maxClicks; i += 1) {
            const btn = document.getElementById('btnLoadMore');
            if (!btn) break;
            if (btn.offsetParent === null || btn.hidden || btn.disabled) break;

            const before = epicRowCount();
            btn.click();

            // Wait for either more rows or a settled timeout.
            let changed = false;
            for (let t = 0; t < 24; t += 1) {
                await sleep(250);
                const after = epicRowCount();
                if (after > before) {
                    changed = true;
                    break;
                }

                const stillThere = document.getElementById('btnLoadMore');
                if (!stillThere || stillThere.offsetParent === null || stillThere.hidden || stillThere.disabled) {
                    break;
                }
            }

            // If no new rows appeared, stop to avoid infinite loops.
            if (!changed) break;
        }

        // Small settle delay after final load.
        await sleep(300);
    }

    // ─────────────────────────────────────────────────────────────
    // Download handlers
    // ─────────────────────────────────────────────────────────────

    let exportInProgress = false;

    async function downloadCSV() {
        if (exportInProgress) return;
        exportInProgress = true;
        try {
            await ensureAllRowsLoaded();

            const { rows, count } = extractData();
            if (count === 0) {
                alert('No epic rows found on this page yet. Please wait for the page to finish loading then try again.');
                return;
            }
            const csv = toCSV(rows);
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            triggerDownload(blob, 'table-export-' + timestamp() + '.csv');
        } finally {
            exportInProgress = false;
        }
    }

    async function downloadXLS() {
        if (exportInProgress) return;
        exportInProgress = true;
        try {
            await ensureAllRowsLoaded();

            const { rows, count } = extractData();
            if (count === 0) {
                alert('No epic rows found on this page yet. Please wait for the page to finish loading then try again.');
                return;
            }
            const html = toXLSHtml(rows);
            const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            triggerDownload(blob, 'table-export-' + timestamp() + '.xls');
        } finally {
            exportInProgress = false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Button injection
    // ─────────────────────────────────────────────────────────────

    function makeButton(label, iconClass, clickHandler) {
        const btn = document.createElement('div');
        btn.className = 'btn btn-text forecast-sort-report';
        btn.title = label;
        btn.style.cssText = 'cursor:pointer;';
        btn.innerHTML = `<i class="icon ${iconClass}"></i> ${label}`;
        btn.addEventListener('click', clickHandler);
        return btn;
    }

    let injected = false;

    function injectButtons() {
        if (injected) return;
        const container = document.getElementById('header-menu-strSubNavButtons');
        if (!container) return;

        injected = true;

        // Insert a thin separator first
        const sep = document.createElement('span');
        sep.style.cssText = 'display:inline-block;width:1px;background:#ccc;height:20px;margin:0 4px;vertical-align:middle;';
        container.appendChild(sep);

        container.appendChild(makeButton('Download CSV', 'icon-download', downloadCSV));
        container.appendChild(makeButton('Download XLS', 'icon-download', downloadXLS));
    }

    // ─────────────────────────────────────────────────────────────
    // Entry point: handle both static and AJAX-loaded pages
    // ─────────────────────────────────────────────────────────────

    function init() {
        // Try immediately (works for the static ForecastSort page).
        injectButtons();

        // For AJAX-driven pages (ForecastMainPage) the toolbar may not exist yet.
        // Watch for it with a MutationObserver that stops once injection succeeds.
        if (!injected) {
            const observer = new MutationObserver(() => {
                injectButtons();
                if (injected) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });

            // Safety net: stop watching after 30 s to avoid memory leaks.
            setTimeout(() => observer.disconnect(), 30000);
        }
    }

    // Run after DOM is fully idle.
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
