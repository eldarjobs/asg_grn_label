// ==UserScript==
// @name         AeroChef GRN Print Label - Native UI Auto-Calc (76x51mm) V1.2
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Uses native AeroChef UI components with perfected 76x51 thermal layout, now in English.
// @match        https://skycatering.aerochef.online/ASGProd/GeneralStores/Forms/FKMS_GNST_GRN_Details.aspx*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Helper function to escape HTML and prevent breaking input values
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

        const btnContainer = closeBtn.parentNode;
        if (document.getElementById('custom-print-label-btn')) return;

        const printBtnSpan = document.createElement('span');
        printBtnSpan.id = 'custom-print-label-btn';
        printBtnSpan.className = 'RadButton RadButton_Office2010Blue rbLinkButton btn acf-btn';
        printBtnSpan.style.cursor = 'pointer';
        printBtnSpan.style.marginLeft = '10px';
        printBtnSpan.style.backgroundColor = '#0056b3';
        printBtnSpan.style.color = '#fff';
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
            alert("Item data table not found on this page!");
            return;
        }

        const rows = grid.querySelectorAll('tr.acf-griddetail-normalrow, tr.acf-griddetail-alternaterow');
        const itemsData = [];

        rows.forEach((row, index) => {
            const itemDescElem = row.querySelector('[id$="lblItem_Description"]');
            const batchNoElem = row.querySelector('[id$="txtBatchNo"]');
            const expiryDateElem = row.querySelector('[id$="rdtExpiryDate_dateInput"]');
            const qtyElem = row.querySelector('[id$="txtLandedQty"]');
            const unitElem = row.querySelector('[id$="lblUnit_Description"]');

            const itemName = itemDescElem ? itemDescElem.innerText.trim() : '';
            if (itemName) {
                itemsData.push({
                    id: index,
                    name: itemName,
                    batch: batchNoElem ? batchNoElem.value.trim() : '',
                    expiry: expiryDateElem ? expiryDateElem.value.trim() : '',
                    qty: qtyElem ? qtyElem.value.trim() : '',
                    unit: unitElem ? unitElem.innerText.trim() : ''
                });
            }
        });

        if (itemsData.length === 0) {
            alert("No items found to print.");
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
                                        <th scope="col" style="width:5%;">
                                            <input type="checkbox" id="tm-select-all" checked style="transform: scale(1.3); cursor:pointer;" title="Select/Deselect All">
                                        </th>
                                        <th class="text-left" scope="col">Item Description</th>
                                        <th scope="col" style="width:9%;">Total Qty</th>
                                        <th scope="col" style="width:9%;">Label Qty</th>
                                        <th scope="col" style="width:5%;">Unit</th>
                                        <th scope="col" style="width:13%;">Batch No.</th>
                                        <th scope="col" style="width:13%;">Expiry Date</th>
                                        <th scope="col" style="width:7%;">Copies</th>
                                    </tr>

                                    ${items.map((i, idx) => {
                                        const rowClass = idx % 2 === 0 ? 'acf-griddetail-normalrow' : 'acf-griddetail-alternaterow';
                                        return `
                                        <tr class="${rowClass}" align="center">
                                            <td>
                                                <input type="checkbox" id="chk_${i.id}" class="tm-item-checkbox" checked style="transform: scale(1.3); cursor:pointer;">
                                            </td>
                                            <td align="left">
                                                <input type="text" id="name_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.name)}" style="width: 100%;">
                                            </td>
                                            <td align="right">
                                                <input type="text" id="totalqty_${i.id}" class="acf-form-ntextbox" value="${escapeHtml(i.qty)}" disabled style="width: 100%; text-align:right; background:#e9ecef;">
                                            </td>
                                            <td align="right">
                                                <input type="number" id="labelqty_${i.id}" class="acf-form-ntextbox tm-highlight-input" value="${escapeHtml(i.qty)}" step="any" style="width: 100%; text-align:right; background:#fff;">
                                            </td>
                                            <td align="left">
                                                <b>${escapeHtml(i.unit)}</b>
                                                <input type="hidden" id="unit_${i.id}" value="${escapeHtml(i.unit)}">
                                            </td>
                                            <td align="right">
                                                <input type="text" id="batch_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.batch)}" style="width: 100%;">
                                            </td>
                                            <td align="right">
                                                <input type="text" id="exp_${i.id}" class="acf-form-textbox" value="${escapeHtml(i.expiry)}" style="width: 100%;">
                                            </td>
                                            <td align="center">
                                                <input type="number" id="copy_${i.id}" class="acf-form-ntextbox" value="1" min="1" max="100" style="width: 100%; text-align:center; background:#fff;">
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="row" style="width: 100%; margin-top: 10px;">
                        <div class="col-12 text-center">
                            <a id="tm-print-selected-btn" class="btn acf-btn-bluedark ml-1" style="color: white; cursor: pointer;">
                                <i class="material-icons acf-material-btnicon">print</i> Print Labels
                            </a>
                            <a id="tm-cancel-btn" class="btn acf-btn-bluedark ml-1" style="color: white; cursor: pointer;">
                                <i class="material-icons acf-material-btnicon">close</i> Cancel
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Select All Logic
        const selectAllCheckbox = document.getElementById('tm-select-all');
        const itemCheckboxes = document.querySelectorAll('.tm-item-checkbox');

        selectAllCheckbox.addEventListener('change', function() {
            itemCheckboxes.forEach(chk => chk.checked = this.checked);
        });

        // Quantity Logic
        items.forEach(i => {
            const labelQtyInput = document.getElementById(`labelqty_${i.id}`);
            const totalQtyInput = document.getElementById(`totalqty_${i.id}`);
            const copyInput = document.getElementById(`copy_${i.id}`);

            labelQtyInput.addEventListener('input', function() {
                const total = parseFloat(totalQtyInput.value) || 0;
                const label = parseFloat(this.value) || 0;

                if (label > 0 && label < total) {
                    copyInput.value = Math.ceil(total / label);
                } else {
                    copyInput.value = 1;
                }
            });
        });

        const closeFunc = () => {
            const overlay = document.getElementById('tm-print-overlay');
            if (overlay) overlay.remove();
            const style = document.getElementById('tm-print-styles');
            if (style) style.remove();
        };

        document.getElementById('tm-close-modal').onclick = closeFunc;
        document.getElementById('tm-cancel-btn').onclick = closeFunc;

        document.getElementById('tm-print-overlay').onclick = (e) => {
            if (e.target.id === 'tm-print-overlay') closeFunc();
        };

        document.getElementById('tm-print-selected-btn').onclick = () => {
            executePrint(items, grnNo, grnDate);
        };
    }

    function executePrint(items, grnNo, grnDate) {
        let labelsHtml = '';
        const now = new Date();
        const printTimestamp = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        items.forEach(i => {
            const isChecked = document.getElementById(`chk_${i.id}`).checked;

            if (isChecked) {
                const name = escapeHtml(document.getElementById(`name_${i.id}`).value);
                const totalQty = parseFloat(document.getElementById(`totalqty_${i.id}`).value) || 0;
                const labelQty = parseFloat(document.getElementById(`labelqty_${i.id}`).value) || totalQty;
                const unit = escapeHtml(document.getElementById(`unit_${i.id}`).value);
                const batch = escapeHtml(document.getElementById(`batch_${i.id}`).value);
                const exp = escapeHtml(document.getElementById(`exp_${i.id}`).value);
                const copies = parseInt(document.getElementById(`copy_${i.id}`).value) || 1;

                let remainingQty = totalQty;

                for(let c = 0; c < copies; c++) {
                    let currentPrintQty = labelQty;

                    if (labelQty < totalQty && remainingQty > 0) {
                        currentPrintQty = parseFloat(Math.min(labelQty, remainingQty).toFixed(3));
                        remainingQty -= currentPrintQty;
                    } else if (remainingQty <= 0 && labelQty < totalQty) {
                        currentPrintQty = labelQty;
                    }

                    let displayQty = "";
                    if (labelQty < totalQty) {
                        displayQty = `${currentPrintQty} ${unit} <span style="font-size:10px; font-weight:normal; color:#444;">/ ${totalQty} ${unit}</span>`;
                    } else {
                        displayQty = `${totalQty} ${unit}`;
                    }

                    const singleLabelHtml = `
                        <div class="label-box">
                            <h2>SKY CATERING</h2>
                            <div class="info-row"><span class="label">GRN No:</span> <span class="val">${escapeHtml(grnNo)}</span></div>
                            <div class="info-row"><span class="label">Date:</span> <span class="val">${escapeHtml(grnDate)}</span></div>
                            <div class="info-row"><span class="label">Item:</span> <span class="val item-val">${name}</span></div>
                            <div class="info-row"><span class="label">Qty:</span> <span class="val qty-val">${displayQty}</span></div>
                            <div class="info-row"><span class="label">Batch:</span> <span class="val">${batch}</span></div>
                            <div class="info-row"><span class="label">Expiry:</span> <span class="val">${exp}</span></div>
                            <div class="timestamp">Printed: ${printTimestamp}</div>
                        </div>
                    `;

                    labelsHtml += singleLabelHtml;
                }
            }
        });

        if (labelsHtml === '') {
            alert("No items selected for printing!");
            return;
        }

        const printWindow = window.open('', '', 'width=400,height=400');

        printWindow.document.write(`
            <html>
            <head>
                <title>Print 76x51 Labels</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #000;
                    }
                    .label-box {
                        width: 76mm;
                        height: 51mm;
                        padding: 2mm 3mm;
                        box-sizing: border-box;
                        overflow: hidden;
                        page-break-after: always;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                    }
                    h2 {
                        margin: 0 0 2px 0;
                        font-size: 14px;
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 2px;
                        letter-spacing: 0.5px;
                        font-weight: 900;
                    }
                    .info-row {
                        font-size: 11px;
                        margin-bottom: 2px;
                        display: flex;
                        align-items: flex-start;
                        line-height: 1.1;
                    }
                    .label {
                        font-weight: normal;
                        width: 50px;
                        flex-shrink: 0;
                        color: #111;
                    }
                    .val {
                        font-weight: bold;
                        flex-grow: 1;
                        word-wrap: break-word;
                        white-space: normal;
                    }
                    .item-val {
                        font-size: 11px;
                        font-weight: 900;
                        line-height: 1.1;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .qty-val {
                        font-size: 12px;
                    }
                    .timestamp {
                        position: absolute;
                        bottom: 2mm;
                        right: 3mm;
                        font-size: 8px;
                        color: #222;
                    }

                    @media print {
                        @page { size: 76mm 51mm; margin: 0; }
                        body { width: 76mm; height: 51mm; margin: 0; padding: 0; }
                        .label-box { margin: 0; border: none; width: 76mm; height: 51mm; page-break-after: always; page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>${labelsHtml}</body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }

    window.addEventListener('load', function() {
        setTimeout(addPrintButton, 1500);
    });

})();
