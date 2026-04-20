// ==UserScript==
// @name         Confluence Table to Excel
// @namespace    https://atlassian.net
// @version      1.4
// @description  Export all tables on a Confluence page to an Excel file
// @match        https://*.atlassian.net/wiki/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js
// ==/UserScript==

(function () {
    'use strict';

    function addButton() {
        if (document.getElementById('confluence-xlsx-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'confluence-xlsx-btn';
        btn.textContent = '📥 Tables to Excel';
        btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;padding:8px 16px;background:#0052CC;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.3);';
        btn.addEventListener('mouseenter', () => btn.style.background = '#0065FF');
        btn.addEventListener('mouseleave', () => btn.style.background = '#0052CC');
        btn.addEventListener('click', exportTables);
        document.body.appendChild(btn);
    }

    function getPageTitle() {
        // Confluence Cloud: title is typically in the document title as "PageTitle - Space - Confluence"
        // Try DOM elements first
        const selectors = [
            '[data-testid="title-text"] span',
            '#title-text',
            '#title-text .wiki-content',
            'h1#title-text',
            '[data-testid="page-title"]',
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent.trim()) return el.textContent.trim();
        }
        // Parse from document.title: "PageTitle - SpaceName - Confluence" or similar
        const dt = document.title;
        if (dt) {
            // Remove common suffixes
            const cleaned = dt.replace(/\s*[-–—]\s*Confluence\s*$/i, '')
                              .replace(/\s*[-–—]\s*[^-–—]+\s*$/, '') // remove space name
                              .trim();
            if (cleaned) return cleaned;
        }
        return 'Confluence_Export';
    }

    function expandConfluenceSections() {
        // Only target Confluence expand macro buttons, not arbitrary buttons
        document.querySelectorAll(
            '[data-testid="expand-container"] button[aria-expanded="false"], ' +
            '.expand-control[aria-expanded="false"], ' +
            '.expand-container .expand-control'
        ).forEach(btn => {
            try { btn.click(); } catch (e) {}
        });
    }

    function scrollFullPage() {
        return new Promise(resolve => {
            const totalHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );
            const viewportHeight = window.innerHeight;
            let currentPos = 0;

            if (totalHeight <= viewportHeight + 100) {
                resolve();
                return;
            }

            const interval = setInterval(() => {
                currentPos += viewportHeight * 0.8;
                window.scrollTo(0, currentPos);

                if (currentPos >= totalHeight) {
                    clearInterval(interval);
                    // Wait for lazy content to load, then scroll back
                    setTimeout(() => {
                        window.scrollTo(0, 0);
                        setTimeout(resolve, 500);
                    }, 800);
                }
            }, 150);
        });
    }

    function getCellText(cell) {
        let text = '';
        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (tag === 'br') {
                    text += '\n';
                } else if (['p', 'div', 'li'].includes(tag) && text.length > 0 && !text.endsWith('\n')) {
                    text += '\n';
                }
                for (const child of node.childNodes) {
                    walk(child);
                }
                if (['p', 'div', 'li'].includes(tag) && !text.endsWith('\n')) {
                    text += '\n';
                }
            }
        }
        walk(cell);
        return text.replace(/\n{2,}/g, '\n').trim();
    }

    async function exportTables() {
        const btn = document.getElementById('confluence-xlsx-btn');
        btn.textContent = '⏳ Laden...';
        btn.disabled = true;

        try {
            // Expand collapsed sections
            expandConfluenceSections();
            await new Promise(r => setTimeout(r, 300));

            // Scroll entire page to trigger lazy loading
            await scrollFullPage();

            // Expand again after lazy content loaded
            expandConfluenceSections();
            await new Promise(r => setTimeout(r, 500));

            doExport();
        } catch (err) {
            alert('Fout bij exporteren: ' + err.message);
        } finally {
            btn.textContent = '📥 Export Tables to Excel';
            btn.disabled = false;
        }
    }

    function doExport() {
        const allTables = document.querySelectorAll('table');

        const tables = Array.from(allTables).filter(table => {
            const cells = table.querySelectorAll('th, td');
            for (const c of cells) {
                if (c.innerText && c.innerText.trim().length > 0) return true;
            }
            return false;
        });

        if (tables.length === 0) {
            alert('Geen tabellen gevonden op deze pagina.');
            return;
        }

        const wb = XLSX.utils.book_new();

        tables.forEach((table, idx) => {
            const data = [];
            table.querySelectorAll('tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('th, td').forEach(cell => {
                    row.push(getCellText(cell));
                });
                data.push(row);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);

            // Apply wrap text and auto-size columns
            const colWidths = [];
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let R = range.s.r; R <= range.e.r; R++) {
                for (let C = range.s.c; C <= range.e.c; C++) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C });
                    if (ws[addr]) {
                        ws[addr].s = {
                            alignment: { wrapText: true, vertical: 'top' }
                        };
                        const val = String(ws[addr].v || '');
                        const maxLen = val.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
                        colWidths[C] = Math.min(80, Math.max(colWidths[C] || 8, maxLen + 2));
                    }
                }
            }
            ws['!cols'] = colWidths.map(w => ({ wch: w }));

            XLSX.utils.book_append_sheet(wb, ws, ('Table ' + (idx + 1)).substring(0, 31));
        });

        // Download with explicit filename
        const title = getPageTitle();
        const safeName = title.replace(/[\\/:*?"<>|]/g, '_');
        const filename = safeName + '.xlsx';

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function init() {
        if (document.readyState === 'complete') {
            addButton();
        } else {
            window.addEventListener('load', addButton);
        }
        const observer = new MutationObserver(() => addButton());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    init();
})();
