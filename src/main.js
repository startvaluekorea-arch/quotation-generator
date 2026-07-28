import { calculateQuotation } from './calculator.js';
import { downloadExcelQuotation } from './excelExporter.js';

// DOM Elements
const form = document.getElementById('quotation-form');
const customerInput = document.getElementById('customerName');
const dateInput = document.getElementById('dateStr');
const titleInput = document.getElementById('title');
const quantityInput = document.getElementById('quantity');
const pagesInput = document.getElementById('pages');
const coverPaperInput = document.getElementById('coverPaper');
const innerPaperInput = document.getElementById('innerPaper');
const discountRateInput = document.getElementById('discountRate');

const kyungDiscountSelect = document.getElementById('kyungDiscount');
const kyungDiscountGroup = document.getElementById('group-kyung-discount');
const kyungCustomDiscountGroup = document.getElementById('group-kyung-custom-discount');
const kyungCustomDiscountInput = document.getElementById('kyungCustomDiscount');

const offsetPostprocessingGroup = document.getElementById('group-offset-postprocessing');
const optEpoxyCheck = document.getElementById('opt-epoxy');
const optFoilCheck = document.getElementById('opt-foil');

const offsetRatesGroup = document.getElementById('group-offset-rates');
const overheadRateInput = document.getElementById('overheadRate');
const profitRateInput = document.getElementById('profitRate');

const btnDownload = document.getElementById('btn-download-excel');

const previewBadge = document.getElementById('preview-type-badge');
const grandTotalEl = document.getElementById('summary-grand-total');
const supplyPriceEl = document.getElementById('summary-supply-price');
const vatEl = document.getElementById('summary-vat');

const tableBody = document.getElementById('preview-table-body');
const breakdownContainer = document.getElementById('breakdown-container');

// Set default date to today (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;

function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' 원';
}

function getSelectedRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

let lastType = '';
let lastSize = '';

// 사용자가 수동 수정한 단가 기억 객체
const userCustomPrices = {};

const kyungOptionsMap = {
  '10절': [
    { value: '3500', text: '조판생략감액3 (3,500원 차감)' },
    { value: '5150', text: '조판생략감액2 (5,150원 차감)' },
    { value: '6780', text: '조판생략감액1 (6,780원 차감)' },
    { value: '0', text: '감액 없음 (0원)' },
    { value: 'custom', text: '직접 입력' }
  ],
  '16절': [
    { value: '2380', text: '조판생략감액3 (2,380원 차감)' },
    { value: '3470', text: '조판생략감액2 (3,470원 차감)' },
    { value: '4620', text: '조판생략감액1 (4,620원 차감)' },
    { value: '0', text: '감액 없음 (0원)' },
    { value: 'custom', text: '직접 입력' }
  ]
};

function populateKyungDiscountOptions(size) {
  const options = kyungOptionsMap[size] || kyungOptionsMap['10절'];
  const currentValue = kyungDiscountSelect.value;
  
  kyungDiscountSelect.innerHTML = '';
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.text;
    kyungDiscountSelect.appendChild(el);
  });

  const exists = options.some(o => o.value === currentValue);
  if (exists) {
    kyungDiscountSelect.value = currentValue;
  } else {
    kyungDiscountSelect.value = options[0].value;
  }
}

function updateDefaultDiscountRate() {
  const type = getSelectedRadioValue('printType');
  const size = getSelectedRadioValue('printSize');

  if (type !== lastType || size !== lastSize) {
    if (type === '경인쇄') {
      discountRateInput.value = size === '10절' ? 75 : 80;
      populateKyungDiscountOptions(size);
    } else {
      discountRateInput.value = 85;
    }
    lastType = type;
    lastSize = size;
  }
}

function toggleModeOptions() {
  const type = getSelectedRadioValue('printType');
  if (type === '경인쇄') {
    kyungDiscountGroup.style.display = 'flex';
    offsetPostprocessingGroup.style.display = 'none';
    offsetRatesGroup.style.display = 'none';
    if (kyungDiscountSelect.value === 'custom') {
      kyungCustomDiscountGroup.style.display = 'flex';
    } else {
      kyungCustomDiscountGroup.style.display = 'none';
    }
  } else {
    kyungDiscountGroup.style.display = 'none';
    kyungCustomDiscountGroup.style.display = 'none';
    offsetPostprocessingGroup.style.display = 'flex';
    offsetRatesGroup.style.display = 'flex';
  }
}

function getActiveKyungDiscount() {
  if (kyungDiscountSelect.value === 'custom') {
    return parseInt(kyungCustomDiscountInput.value, 10) || 0;
  }
  return parseInt(kyungDiscountSelect.value, 10) || 0;
}

function updatePreview(activeInputKey = null, activeCursorStart = null) {
  updateDefaultDiscountRate();
  toggleModeOptions();

  const customerName = customerInput.value.trim();
  const dateStr = dateInput.value;
  const title = titleInput.value.trim();
  const quantity = parseInt(quantityInput.value, 10) || 1;
  const pages = parseInt(pagesInput.value, 10) || 1;
  const coverPaper = coverPaperInput.value.trim() || '아트250';
  const innerPaper = innerPaperInput.value.trim() || '미색80';
  const type = getSelectedRadioValue('printType');
  const size = getSelectedRadioValue('printSize');
  const discountRate = parseInt(discountRateInput.value, 10) || 100;
  const kyungDiscount = getActiveKyungDiscount();
  const overheadRate = parseInt(overheadRateInput.value, 10) || 0;
  const profitRate = parseInt(profitRateInput.value, 10) || 0;
  const optEpoxy = optEpoxyCheck.checked;
  const optFoil = optFoilCheck.checked;

  previewBadge.textContent = `${type} ${size} (${discountRate}% 할인)`;

  const calc = calculateQuotation({
    type,
    size,
    customerName,
    title,
    dateStr,
    quantity,
    pages,
    coverPaper,
    innerPaper,
    discountRate,
    kyungDiscount,
    overheadRate,
    profitRate,
    optEpoxy,
    optFoil,
    customPrices: userCustomPrices
  });

  // Update Summary Cards
  grandTotalEl.textContent = formatCurrency(calc.grandTotal);
  supplyPriceEl.textContent = formatCurrency(calc.supplyPrice);
  vatEl.textContent = formatCurrency(calc.vat);

  // Update Table Body
  tableBody.innerHTML = '';
  calc.items.forEach(item => {
    const tr = document.createElement('tr');
    
    const qtyText = item.unit ? `${item.qty} ${item.unit}` : `${item.qty}`;
    const noteHtml = item.note ? `<span class="item-note">(${item.note})</span>` : '';

    let priceCellHtml = '';
    if (calc.type === '옵셋' && item.editable) {
      priceCellHtml = `<input type="number" class="price-input" data-key="${item.key}" value="${item.unitPrice}" min="0" step="100" />`;
    } else {
      priceCellHtml = item.unitPrice ? formatCurrency(item.unitPrice) : '-';
    }

    tr.innerHTML = `
      <td>${item.name} ${noteHtml}</td>
      <td class="text-right">${qtyText}</td>
      <td class="text-right">${priceCellHtml}</td>
      <td class="text-right">${formatCurrency(item.amount)}</td>
    `;
    tableBody.appendChild(tr);
  });

  // Add Event Listeners for editable price inputs in table
  tableBody.querySelectorAll('input.price-input').forEach(inputEl => {
    const key = inputEl.getAttribute('data-key');

    const handlePriceChange = (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        userCustomPrices[key] = val;
      } else if (e.target.value === '') {
        userCustomPrices[key] = 0;
      }
      const pos = e.target.selectionStart;
      updatePreview(key, pos);
    };

    inputEl.addEventListener('input', handlePriceChange);
    inputEl.addEventListener('change', handlePriceChange);
  });

  // Restore Focus and Cursor Position if user was typing in a price input
  if (activeInputKey) {
    const targetEl = tableBody.querySelector(`input.price-input[data-key="${activeInputKey}"]`);
    if (targetEl) {
      targetEl.focus();
      if (activeCursorStart !== null && targetEl.setSelectionRange) {
        try {
          targetEl.setSelectionRange(activeCursorStart, activeCursorStart);
        } catch (err) {
          // ignore selection range errors for number input types
        }
      }
    }
  }

  // Update Detailed Breakdown
  if (calc.type === '경인쇄') {
    breakdownContainer.innerHTML = `
      <div class="breakdown-row"><span>항목 계 (합계):</span><span>${formatCurrency(calc.subTotal)}</span></div>
      <div class="breakdown-row"><span>이윤 (적용):</span><span>${formatCurrency(calc.totalMargin)}</span></div>
      <div class="breakdown-row"><span>절사액 (백원 이하):</span><span>-${formatCurrency(calc.truncation)}</span></div>
      <div class="breakdown-row highlight"><span>공급가액:</span><span>${formatCurrency(calc.supplyPrice)}</span></div>
      <div class="breakdown-row"><span>부가가치세 (10%):</span><span>${formatCurrency(calc.vat)}</span></div>
    `;
  } else {
    breakdownContainer.innerHTML = `
      <div class="breakdown-row"><span>항목 계 (합계):</span><span>${formatCurrency(calc.subTotal)}</span></div>
      <div class="breakdown-row"><span>일반관리비 (${overheadRate}%):</span><span>${formatCurrency(calc.overhead)}</span></div>
      <div class="breakdown-row"><span>이윤 (${profitRate}%):</span><span>${formatCurrency(calc.profit)}</span></div>
      <div class="breakdown-row"><span>소계:</span><span>${formatCurrency(calc.rawSubTotal)}</span></div>
      <div class="breakdown-row"><span>할인/네고 적용금액 (${discountRate}%):</span><span>${formatCurrency(calc.discountedTotal)}</span></div>
      <div class="breakdown-row"><span>절사액 (백원 이하):</span><span>-${formatCurrency(calc.truncation)}</span></div>
      <div class="breakdown-row highlight"><span>공급가액:</span><span>${formatCurrency(calc.supplyPrice)}</span></div>
      <div class="breakdown-row"><span>부가가치세 (10%):</span><span>${formatCurrency(calc.vat)}</span></div>
    `;
  }
}

// Event Listeners for Live Update
[customerInput, dateInput, titleInput, quantityInput, pagesInput, coverPaperInput, innerPaperInput, discountRateInput, kyungDiscountSelect, kyungCustomDiscountInput, overheadRateInput, profitRateInput, optEpoxyCheck, optFoilCheck].forEach(el => {
  el.addEventListener('input', () => updatePreview());
  el.addEventListener('change', () => updatePreview());
});

document.querySelectorAll('input[name="printType"]').forEach(el => {
  el.addEventListener('change', () => {
    updateDefaultDiscountRate();
    updatePreview();
  });
});

document.querySelectorAll('input[name="printSize"]').forEach(el => {
  el.addEventListener('change', () => {
    const size = getSelectedRadioValue('printSize');
    populateKyungDiscountOptions(size);
    updateDefaultDiscountRate();
    updatePreview();
  });
});

// Download Button Click
btnDownload.addEventListener('click', async () => {
  const customerName = customerInput.value.trim();
  const dateStr = dateInput.value;
  const title = titleInput.value.trim();
  const quantity = parseInt(quantityInput.value, 10) || 1;
  const pages = parseInt(pagesInput.value, 10) || 1;
  const coverPaper = coverPaperInput.value.trim() || '아트250';
  const innerPaper = innerPaperInput.value.trim() || '미색80';
  const type = getSelectedRadioValue('printType');
  const size = getSelectedRadioValue('printSize');
  const discountRate = parseInt(discountRateInput.value, 10) || 100;
  const kyungDiscount = getActiveKyungDiscount();
  const overheadRate = parseInt(overheadRateInput.value, 10) || 0;
  const profitRate = parseInt(profitRateInput.value, 10) || 0;
  const optEpoxy = optEpoxyCheck.checked;
  const optFoil = optFoilCheck.checked;

  btnDownload.disabled = true;
  const originalText = btnDownload.innerHTML;
  btnDownload.innerHTML = '⏳ 엑셀 파일 생성 중...';

  try {
    await downloadExcelQuotation({
      type,
      size,
      customerName,
      title,
      dateStr,
      quantity,
      pages,
      coverPaper,
      innerPaper,
      discountRate,
      kyungDiscount,
      overheadRate,
      profitRate,
      optEpoxy,
      optFoil,
      customPrices: userCustomPrices
    });
  } catch (err) {
    alert('엑셀 다운로드 중 오류가 발생했습니다: ' + err.message);
    console.error(err);
  } finally {
    btnDownload.disabled = false;
    btnDownload.innerHTML = originalText;
  }
});

// Initial Setup
populateKyungDiscountOptions(getSelectedRadioValue('printSize'));
updatePreview();
