// ==UserScript==
// @name         GRN Print Label
// @namespace    http://tampermonkey.net/
// @version      2.3
// @author       Eldar Eyvazlı
// @match        https://skycatering.aerochef.online/ASGProd/GeneralStores/Forms/FKMS_GNST_GRN_Details.aspx*
// @updateURL    https://github.com/eldarjobs/asg_grn_label/raw/refs/heads/main/label.user.js
// @downloadURL  https://github.com/eldarjobs/asg_grn_label/raw/refs/heads/main/label.user.js
// @copyright    10.06.2026
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const escapeHtml = (unsafe) => {
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    function addPrintButton() {
        const closeBtn = document.getElementById('ctl00_CphMaster_rbtnClose');
        if (!closeBtn) return;
        if (document.getElementById('custom-print-label-btn')) return;

        const btnContainer = closeBtn.parentNode;
        const printBtnSpan = document.createElement('span');
        printBtnSpan.id = 'custom-print-label-btn';
        printBtnSpan.className = 'RadButton RadButton_Office2010Blue rbLinkButton btn acf-btn';
        printBtnSpan.style.cssText = 'cursor:pointer; margin-left:10px; background-color:#0056b3; color:#fff; display:inline-flex; align-items:center;';
        printBtnSpan.tabIndex = 0;
        printBtnSpan.innerHTML = '<i class="material-icons acf-material-btnicon">print</i>Print Label';

        printBtnSpan.onclick = function(e) {
            e.preventDefault();
            openEditModal();
        };

        btnContainer.appendChild(printBtnSpan);
    }

    function openEditModal() {
        const oldOverlay = document.getElementById('tm-print-overlay');
        if (oldOverlay) oldOverlay.remove();

        const grnNoElem = document.getElementById('ctl00_CphMaster_txtGRNNo');
        const grnDateElem = document.getElementById('ctl00_CphMaster_rdpGRNDate_dateInput');
        const grnNo = grnNoElem ? grnNoElem.value : 'N/A';
        const grnDate = grnDateElem ? grnDateElem.value : 'N/A';

        const grid = document.getElementById('ctl00_CphMaster_dgvItemDetails');
        if (!grid) {
            alert("Item data table not found!");
            return;
        }

        const rows = grid.querySelectorAll('tr.acf-griddetail-normalrow, tr.acf-griddetail-alternaterow');
        const itemsData = [];

        rows.forEach((row, idx) => {
            const nameSpan = row.querySelector('[id$="lblItem_Description"]');
            if (!nameSpan) return; 

            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return;

            const code = cells[11] ? cells[11].innerText.trim() : '';
            let name = nameSpan.innerText.trim();

            let brand = '';
            const brandSelect = row.querySelector('select');
            if (brandSelect) {
                brand = brandSelect.options[brandSelect.selectedIndex]?.text.trim() || '';
            } else {
                const brandInput = row.querySelector('input[id$="rcbgridItemBrand_Input"], .rcbInput');
                if (brandInput) {
                    brand = brandInput.value.trim();
                }
            }
            
            if (brand && !brand.toLowerCase().includes('select') && !brand.startsWith('---')) {
                name = `${name} ${brand}`;
            }
            // ----------------------------------------------------

            if (!name) return;

            const unitSpan = row.querySelector('[id$="lblUnit_Description"]');
            const unit = unitSpan ? unitSpan.innerText.trim() : (cells[4] ? cells[4].innerText.trim() : '');

            let qty = '';
            const qtyInput = row.querySelector('[id$="txtLandedQty"]');
            if (qtyInput) qty = qtyInput.value;
            else if (cells[6]) qty = cells[6].innerText.trim();

            const batchInput = row.querySelector('[id$="txtBatchNo"]');
            const batch = batchInput ? batchInput.value.trim() : '';

            const expiryInput = row.querySelector('[id$="rdtExpiryDate_dateInput"]');
            const expiry = expiryInput ? expiryInput.value.trim() : '';

            itemsData.push({
                id: idx,
                code: code,
                name: name,
                unit: unit,
                qty: qty,
                batch: batch,
                expiry: expiry
            });
        });

        if (itemsData.length === 0) {
            alert("No items found!");
            return;
        }

        createModalUI(itemsData, grnNo, grnDate);
    }

    function createModalUI(items, grnNo, grnDate) {
        const modalStyles = `
            #tm-print-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.6); z-index: 99999;
                display: flex; justify-content: center; align-items: center;
            }
            #tm-native-modal-wrapper {
                background: #fff; max-height: 90vh; overflow-y: auto; padding-bottom: 20px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 5px;
            }
            .tm-highlight-input { border: 2px solid #0056b3 !important; font-weight: bold; color: #0056b3; }
        `;
        const styleTag = document.createElement('style');
        styleTag.id = 'tm-print-styles';
        styleTag.innerHTML = modalStyles;
        document.head.appendChild(styleTag);

        const modalHtml = `
            <div id="tm-print-overlay">
                <div class="row acf-round-div" id="tm-native-modal-wrapper" style="width: 900px; max-width: 95vw; margin: 0;">
                    <div class="col-12 text-center" style="padding: 0;">
                        <div class="row" style="margin: 0;">
                            <div class="col-12 acf-section-strip text-left" style="padding: 10px 15px;">
                                Label Print Settings <span style="font-weight:normal; font-size:13px;">(GRN: ${escapeHtml(grnNo)})</span>
                                <div class="float-right">
                                    <a style="cursor:pointer;" id="tm-close-modal"><i class="material-icons acf-material-closepopup">close</i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row" style="width: 100%; margin: 15px 0;">
                        <div class="col-12">
                            <table class="acf-griddetail-common table-responsive-lg m-auto" cellspacing="0" cellpadding="3" rules="all" border="1" style="width: 98%; border-collapse: collapse;">
                                <tbody>
                                    <tr class="acf-griddetail-header" align="center">
                                        <th scope="col" style="width:5%;"><input type="checkbox" id="tm-select-all" checked style="transform: scale(1.3); cursor:pointer;"></th>
                                        <th class="text-left" scope="col">Item Description</th>
                                        <th scope="col" style="width:8%;">Item Code</th>
                                        <th scope="col" style="width:8%;">Total Qty</th>
                                        <th scope="col" style="width:8%;">Label Qty</th>
                                        <th scope="col" style="width:5%;">Unit</th>
                                        <th scope="col" style="width:12%;">Batch No.</th>
                                        <th scope="col" style="width:12%;">Expiry Date</th>
                                        <th scope="col" style="width:7%;">Copies</th>
                                    </tr>
                                    ${items.map((i, idx) => {
                                        const rowClass = idx % 2 === 0 ? 'acf-griddetail-normalrow' : 'acf-griddetail-alternaterow';
                                        return `
                                        <tr class="${rowClass}" align="center">
                                            <td><input type="checkbox" id="chk_${i.id}" class="tm-item-checkbox" checked style="transform: scale(1.3);"></td>
                                            <td align="left"><input type="text" id="name_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.name)}" style="width: 100%;"></td>
                                            <td align="left"><input type="text" id="code_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.code)}" style="width: 100%;"></td>
                                            <td align="right"><input type="text" id="totalqty_${i.id}" class="acf-form-ntextbox" value="${escapeHtml(i.qty)}" disabled style="width:100%; text-align:right; background:#e9ecef;"></td>
                                            <td align="right"><input type="number" id="labelqty_${i.id}" class="acf-form-ntextbox tm-highlight-input" value="${escapeHtml(i.qty)}" step="any" style="width:100%; text-align:right;"></td>
                                            <td align="center">${escapeHtml(i.unit)}<input type="hidden" id="unit_${i.id}" value="${escapeHtml(i.unit)}"></td>
                                            <td align="right"><input type="text" id="batch_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.batch)}" style="width:100%;"></td>
                                            <td align="right"><input type="text" id="exp_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.expiry)}" style="width:100%;"></td>
                                            <td align="center"><input type="number" id="copy_${i.id}" class="acf-form-ntextbox" value="1" min="1" max="100" style="width:80px; text-align:center;"></td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="row" style="width: 100%; margin-top: 10px;">
                        <div class="col-12 text-center">
                            <select id="tm-label-size" style="padding: 6px; border-radius: 4px; margin-right: 15px; border: 1px solid #ccc; outline: none; cursor: pointer;">
                                <option value="80x40" selected>80x40 mm</option>
                                <option value="90x40">90x40 mm</option>
                            </select>
                            <a id="tm-print-selected-btn" class="btn acf-btn-bluedark ml-1" style="color: white; cursor: pointer; background:#0056b3; padding:6px 15px; border-radius:4px;">
                                <i class="material-icons acf-material-btnicon">print</i> Print Labels
                            </a>
                            <a id="tm-cancel-btn" class="btn acf-btn-bluedark ml-1" style="color: white; cursor: pointer; background:#6c757d; padding:6px 15px; border-radius:4px; margin-left:10px;">
                                <i class="material-icons acf-material-btnicon">close</i> Cancel
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const selectAll = document.getElementById('tm-select-all');
        const itemChecks = document.querySelectorAll('.tm-item-checkbox');
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                itemChecks.forEach(chk => chk.checked = selectAll.checked);
            });
        }

        items.forEach(i => {
            const labelQty = document.getElementById(`labelqty_${i.id}`);
            const totalQty = document.getElementById(`totalqty_${i.id}`);
            const copies = document.getElementById(`copy_${i.id}`);
            if (labelQty && totalQty && copies) {
                labelQty.addEventListener('input', () => {
                    const total = parseFloat(totalQty.value) || 0;
                    const label = parseFloat(labelQty.value) || 0;
                    copies.value = (label > 0 && label < total) ? Math.ceil(total / label) : 1;
                });
            }
        });

        const closeModal = () => {
            const ov = document.getElementById('tm-print-overlay');
            if (ov) ov.remove();
            const st = document.getElementById('tm-print-styles');
            if (st) st.remove();
        };

        document.getElementById('tm-close-modal').onclick = closeModal;
        document.getElementById('tm-cancel-btn').onclick = closeModal;
        document.getElementById('tm-print-overlay').onclick = (e) => {
            if (e.target.id === 'tm-print-overlay') closeModal();
        };
        document.getElementById('tm-print-selected-btn').onclick = () => executePrint(items, grnNo, grnDate);
    }

    function executePrint(items, grnNo, grnDate) {
        let labelsHtml = '';
        const now = new Date();
        const printTimestamp = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const selectedSize = document.getElementById('tm-label-size').value;
        const labelWidth = selectedSize.split('x')[0] + 'mm';
        const labelHeight = selectedSize.split('x')[1] + 'mm';

        items.forEach(i => {
            const isChecked = document.getElementById(`chk_${i.id}`)?.checked;
            if (!isChecked) return;

            const name = escapeHtml(document.getElementById(`name_${i.id}`)?.value || '');
            const code = escapeHtml(document.getElementById(`code_${i.id}`)?.value || '');
            const totalQty = parseFloat(document.getElementById(`totalqty_${i.id}`)?.value) || 0;
            let labelQty = parseFloat(document.getElementById(`labelqty_${i.id}`)?.value) || totalQty;
            const unit = escapeHtml(document.getElementById(`unit_${i.id}`)?.value || '');
            const batch = escapeHtml(document.getElementById(`batch_${i.id}`)?.value || '');
            const exp = escapeHtml(document.getElementById(`exp_${i.id}`)?.value || '');
            let copies = parseInt(document.getElementById(`copy_${i.id}`)?.value) || 1;

            if (labelQty > totalQty) labelQty = totalQty;

            let remaining = totalQty;
            for (let c = 0; c < copies; c++) {
                let currentQty = labelQty;
                if (labelQty < totalQty && remaining > 0) {
                    currentQty = Math.min(labelQty, remaining);
                    remaining -= currentQty;
                }
                const displayQty = (labelQty < totalQty)
                    ? `${currentQty} ${unit} <span style="font-size:10px; font-weight:normal; color:#444;">/ ${totalQty} ${unit}</span>`
                    : `${totalQty} ${unit}`;

                labelsHtml += `
                    <div class="label-box">
                        <h2>SKY CATERING</h2>
                        <div class="info-row"><span class="label">GRN No:</span> <span class="val">${escapeHtml(grnNo)}</span></div>
                        <div class="info-row"><span class="label">Date:</span> <span class="val">${escapeHtml(grnDate)}</span></div>
                        <div class="info-row"><span class="label">Item:</span> <span class="val item-val">${code} - ${name}</span></div>
                        <div class="info-row"><span class="label">Qty:</span> <span class="val qty-val">${displayQty}</span></div>
                        <div class="info-row"><span class="label">Batch:</span> <span class="val">${batch}</span></div>
                        <div class="info-row"><span class="label">Expiry:</span> <span class="val">${exp}</span></div>
                        <div class="timestamp">Printed: ${printTimestamp}</div>
                    </div>
                `;
            }
        });

        if (!labelsHtml) {
            alert("No items selected!");
            return;
        }

        const win = window.open('', '_blank', 'width=450,height=400');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Print ${selectedSize} Labels</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family: Arial, sans-serif; background: white; color: #000; }
                .label-box {
                    width: ${labelWidth}; height: ${labelHeight};
                    padding: 4mm 4mm 1mm 4mm;
                    box-sizing: border-box; page-break-after: always;
                    position: relative; display: flex; flex-direction: column;
                    overflow: hidden;
                }
                h2 {
                    margin: 0 0 3px 0; font-size: 14px; text-align: center;
                    border-bottom: 2px solid #000; padding-bottom: 2px;
                    letter-spacing: 0.5px; font-weight: 900;
                }
                .info-row {
                    font-size: 12px; margin-bottom: 2px;
                    display: flex; align-items: flex-start; line-height: 1.1;
                }
                .label {
                    font-weight: normal; width: 55px; flex-shrink: 0; color: #111;
                }
                .val {
                    font-weight: bold; flex-grow: 1; word-wrap: break-word;
                }
                .item-val {
                    font-size: 12px; font-weight: 900;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                }
                .qty-val { font-size: 12px; }
                .timestamp {
                    font-weight: bold; flex-grow: 1; word-wrap: break-word;
                    position: absolute; bottom: 0.5mm; right: 4mm;
                    font-size: 10px; color: #222;
                }
                @media print {
                    @page { size: ${labelWidth} ${labelHeight}; margin: 0; }
                    body { width: ${labelWidth}; height: ${labelHeight}; margin: 0; padding: 0; }
                    .label-box { margin: 0; border: none; width: ${labelWidth}; height: ${labelHeight}; page-break-after: always; }
                }
            </style>
            </head>
            <body>${labelsHtml}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 300);
    }

    function init() {
        addPrintButton();

        if (typeof window.Sys !== 'undefined' && window.Sys.WebForms && window.Sys.WebForms.PageRequestManager) {
            const prm = window.Sys.WebForms.PageRequestManager.getInstance();
            prm.add_endRequest(function () {
                setTimeout(addPrintButton, 200);
            });
        }

        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.addedNodes.length) {
                    if (document.getElementById('ctl00_CphMaster_rbtnClose') && !document.getElementById('custom-print-label-btn')) {
                        addPrintButton();
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
