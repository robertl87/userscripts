// ==UserScript==
// @name         AFAS Matrix Sticky Header
// @namespace    afas-matrix
// @version      1.6
// @description  Fix the days of week above the matrix and add lines next to the columns.
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/AFAS%20Matrix%20Sticky%20Header.user.js
// @downloadURL  https://github.com/robertl87/userscripts/raw/refs/heads/main/AFAS%20Matrix%20Sticky%20Header.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=afas.nl
// @author       Robert
// @match        https://*.afasinsite.nl/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
"use strict";

GM_addStyle(`

.matrix-row-component.header-row{
    background:#fff !important;
    z-index:999999 !important;
}

/* kolomlijnen */
.matrix-cell-component{
    border-right:1px solid #e0e0e0 !important;
}

.matrix-cell-component-column-title{
    border-right:2px solid #bdbdbd !important;
}

`);

function initSticky(){

    const header = document.querySelector(".matrix-row-component.header-row");
    if(!header) return;

    const rect = header.getBoundingClientRect();
    const startTop = rect.top + window.scrollY;

    window.addEventListener("scroll", () => {

        //const mainMenu = document.querySelector(".mainmenu");
        const mainMenu = document.querySelector(".mainmenu.header.expandbig.visible");
        const menuHeight = mainMenu ? mainMenu.getBoundingClientRect().height : 0;

        const matrixContainer = header.closest(".matrix-component");

        matrixContainer.addEventListener("scroll", () => {
            header.style.transform = `translateX(-${matrixContainer.scrollLeft}px)`;
        });

        if(window.scrollY > startTop - menuHeight){

            header.style.position = "fixed";
            header.style.top = menuHeight + "px";
            header.style.left = rect.left + "px";
            header.style.width = rect.width + "px";
            header.style.zIndex = "999999";

        } else {

            header.style.position = "";
            header.style.top = "";
            header.style.left = "";
            header.style.width = "";

        }

    });

}

/* AFAS laadt dynamisch */
const observer = new MutationObserver(() => {

    const header = document.querySelector(".matrix-row-component.header-row");

    if(header){
        initSticky();
        observer.disconnect();
    }

});

observer.observe(document.body,{
    childList:true,
    subtree:true
});

})();
