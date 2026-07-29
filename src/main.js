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
const discountRateGroup = document.getElementById('group-discount-rate');

const kyungCoverDesignGroup = document.getElementById('group-kyung-cover-design');
const optKyungCoverDesignCheck = document.getElementById('opt-kyung-cover-design');
const digitalOptionsGroup = document.getElementById('group-digital-options');
const optDigitalCoverTypeCheck = document.getElementById('opt-digital-cover-type');
const optDigitalInnerEditCheck = document.getElementById('opt-digital-inner-edit');

const optDigitalXBannerCheck = document.getElementById('opt-digital-xbanner');
const digitalXBannerGroup = document.getElementById('group-digital-xbanner-details');
const digitalXBannerSizeInput = document.getElementById('digitalXBannerSize');
const digitalXBannerQtyInput = document.getElementById('digitalXBannerQty');

const optDigitalBannerCheck = document.getElementById('opt-digital-banner');
const digitalBannerGroup = document.getElementById('group-digital-banner-details');
const digitalBannerSizeInput = document.getElementById('digitalBannerSize');
const digitalBannerQtyInput = document.getElementById('digitalBannerQty');

const optDigitalNameplateCheck = document.getElementById('opt-digital-nameplate');
const digitalNameplateGroup = document.getElementById('group-digital-nameplate-details');
const digitalNameplateQtyInput = document.getElementById('digitalNameplateQty');

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
      discountRateInput.value = 80;
      populateKyungDiscountOptions(size);
    } else if (type === '디지털') {
      discountRateInput.value = 100;
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
    kyungCoverDesignGroup.style.display = 'flex';
    kyungDiscountGroup.style.display = 'flex';
    digitalOptionsGroup.style.display = 'none';
    offsetPostprocessingGroup.style.display = 'none';
    offsetRatesGroup.style.display = 'none';
    if (discountRateGroup) discountRateGroup.style.display = 'flex';
    if (kyungDiscountSelect.value === 'custom') {
      kyungCustomDiscountGroup.style.display = 'flex';
    } else {
      kyungCustomDiscountGroup.style.display = 'none';
    }
  } else if (type === '디지털') {
    kyungCoverDesignGroup.style.display = 'none';
    kyungDiscountGroup.style.display = 'none';
    kyungCustomDiscountGroup.style.display = 'none';
    digitalOptionsGroup.style.display = 'flex';
    offsetPostprocessingGroup.style.display = 'none';
    offsetRatesGroup.style.display = 'none';
    if (discountRateGroup) discountRateGroup.style.display = 'none';
  } else {
    kyungCoverDesignGroup.style.display = 'none';
    kyungDiscountGroup.style.display = 'none';
    kyungCustomDiscountGroup.style.display = 'none';
    digitalOptionsGroup.style.display = 'none';
    offsetPostprocessingGroup.style.display = 'flex';
    offsetRatesGroup.style.display = 'flex';
    if (discountRateGroup) discountRateGroup.style.display = 'flex';
  }
}

function getActiveKyungDiscount() {
  if (kyungDiscountSelect.value === 'custom') {
    return parseInt(kyungCustomDiscountInput.value, 10) || 0;
  }
  return parseInt(kyungDiscountSelect.value, 10) || 0;
}

/**
 * 계산 결과를 기반으로 요약 카드 및 세부 Breakdown만 빠르게 갱신 (테이블 DOM 유지)
 */
function updateSummaryAndBreakdownOnly() {
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
  const optKyungCoverDesign = optKyungCoverDesignCheck.checked;
  const digitalColorType = getSelectedRadioValue('digitalColorType') || '컬러';
  const optDigitalCoverType = optDigitalCoverTypeCheck ? optDigitalCoverTypeCheck.checked : false;
  const optDigitalInnerEdit = optDigitalInnerEditCheck ? optDigitalInnerEditCheck.checked : false;
  const optDigitalXBanner = optDigitalXBannerCheck ? optDigitalXBannerCheck.checked : false;
  const digitalXBannerSize = digitalXBannerSizeInput ? digitalXBannerSizeInput.value : '600x1800mm';
  const digitalXBannerQty = digitalXBannerQtyInput ? digitalXBannerQtyInput.value : 1;
  const optDigitalBanner = optDigitalBannerCheck ? optDigitalBannerCheck.checked : false;
  const digitalBannerSize = digitalBannerSizeInput ? digitalBannerSizeInput.value : '4000x900mm';
  const digitalBannerQty = digitalBannerQtyInput ? digitalBannerQtyInput.value : 1;
  const optDigitalNameplate = optDigitalNameplateCheck ? optDigitalNameplateCheck.checked : false;
  const digitalNameplateQty = digitalNameplateQtyInput ? digitalNameplateQtyInput.value : 1;

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
    optKyungCoverDesign,
    digitalColorType,
    optDigitalCoverType,
    optDigitalInnerEdit,
    optDigitalXBanner,
    digitalXBannerSize,
    digitalXBannerQty,
    optDigitalBanner,
    digitalBannerSize,
    digitalBannerQty,
    optDigitalNameplate,
    digitalNameplateQty,
    customPrices: userCustomPrices
  });

  // Update Summary Cards
  grandTotalEl.textContent = formatCurrency(calc.grandTotal);
  supplyPriceEl.textContent = formatCurrency(calc.supplyPrice);
  vatEl.textContent = formatCurrency(calc.vat);

  // Update Item Amount Texts in Table without destroying Inputs
  calc.items.forEach(item => {
    const amountTd = tableBody.querySelector(`td[data-amount-key="${item.key}"]`);
    if (amountTd) {
      amountTd.textContent = formatCurrency(item.amount);
    }
  });

  // Update Detailed Breakdown
  if (calc.type === '경인쇄') {
    breakdownContainer.innerHTML = `
      <div class="breakdown-row"><span>항목 계 (합계):</span><span>${formatCurrency(calc.subTotal)}</span></div>
      <div class="breakdown-row"><span>이윤 (적용):</span><span>${formatCurrency(calc.totalMargin)}</span></div>
      <div class="breakdown-row"><span>절사액 (백원 이하):</span><span>-${formatCurrency(calc.truncation)}</span></div>
      <div class="breakdown-row highlight"><span>공급가액:</span><span>${formatCurrency(calc.supplyPrice)}</span></div>
      <div class="breakdown-row"><span>부가가치세 (10%):</span><span>${formatCurrency(calc.vat)}</span></div>
    `;
  } else if (calc.type === '디지털') {
    breakdownContainer.innerHTML = `
      <div class="breakdown-row"><span>항목 계 (합계):</span><span>${formatCurrency(calc.subTotal)}</span></div>
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

/**
 * 전체 프리뷰 표 및 컨트롤 업데이트 (항목 구성이나 인쇄방식 변경 시 호출)
 */
function updateFullPreview() {
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
  const optKyungCoverDesign = optKyungCoverDesignCheck.checked;
  const digitalColorType = getSelectedRadioValue('digitalColorType') || '컬러';
  const optDigitalCoverType = optDigitalCoverTypeCheck ? optDigitalCoverTypeCheck.checked : false;
  const optDigitalInnerEdit = optDigitalInnerEditCheck ? optDigitalInnerEditCheck.checked : false;
  const optDigitalXBanner = optDigitalXBannerCheck ? optDigitalXBannerCheck.checked : false;
  const digitalXBannerSize = digitalXBannerSizeInput ? digitalXBannerSizeInput.value : '600x1800mm';
  const digitalXBannerQty = digitalXBannerQtyInput ? digitalXBannerQtyInput.value : 1;
  const optDigitalBanner = optDigitalBannerCheck ? optDigitalBannerCheck.checked : false;
  const digitalBannerSize = digitalBannerSizeInput ? digitalBannerSizeInput.value : '4000x900mm';
  const digitalBannerQty = digitalBannerQtyInput ? digitalBannerQtyInput.value : 1;
  const optDigitalNameplate = optDigitalNameplateCheck ? optDigitalNameplateCheck.checked : false;
  const digitalNameplateQty = digitalNameplateQtyInput ? digitalNameplateQtyInput.value : 1;

  previewBadge.textContent = type === '디지털' ? `${type} 인쇄 (${digitalColorType})` : `${type} ${size} (${discountRate}% 할인)`;

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
    optKyungCoverDesign,
    digitalColorType,
    optDigitalCoverType,
    optDigitalInnerEdit,
    optDigitalXBanner,
    digitalXBannerSize,
    digitalXBannerQty,
    optDigitalBanner,
    digitalBannerSize,
    digitalBannerQty,
    optDigitalNameplate,
    digitalNameplateQty,
    customPrices: userCustomPrices
  });

  // Update Summary Cards
  grandTotalEl.textContent = formatCurrency(calc.grandTotal);
  supplyPriceEl.textContent = formatCurrency(calc.supplyPrice);
  vatEl.textContent = formatCurrency(calc.vat);

  // Re-render Table Body
  tableBody.innerHTML = '';
  calc.items.forEach(item => {
    const tr = document.createElement('tr');
    
    const qtyText = item.unit ? `${item.qty} ${item.unit}` : `${item.qty}`;
    const noteHtml = item.note ? `<span class="item-note">(${item.note})</span>` : '';

    let priceCellHtml = '';
    if (item.editable) {
      priceCellHtml = `<input type="text" inputmode="numeric" class="price-input" data-key="${item.key}" value="${item.unitPrice}" />`;
    } else {
      priceCellHtml = item.unitPrice ? formatCurrency(item.unitPrice) : '-';
    }

    tr.innerHTML = `
      <td>${item.name} ${noteHtml}</td>
      <td class="text-right">${qtyText}</td>
      <td class="text-right">${priceCellHtml}</td>
      <td class="text-right" data-amount-key="${item.key}">${formatCurrency(item.amount)}</td>
    `;
    tableBody.appendChild(tr);
  });

  // Bind Event Listeners on price inputs ONCE during table creation
  tableBody.querySelectorAll('input.price-input').forEach(inputEl => {
    const key = inputEl.getAttribute('data-key');

    inputEl.addEventListener('input', (e) => {
      // 숫자만 추출
      const rawVal = e.target.value.replace(/[^0-9]/g, '');
      const numVal = parseInt(rawVal, 10);
      
      if (!isNaN(numVal)) {
        userCustomPrices[key] = numVal;
      } else {
        userCustomPrices[key] = 0;
      }
      
      // 입력 중에도 요약 카드 및 해당 행 금액 인라인 갱신 (입력창 DOM은 절대 건드리지 않음!)
      updateSummaryAndBreakdownOnly();
    });
  });

  // Update Detailed Breakdown
  if (calc.type === '경인쇄') {
    breakdownContainer.innerHTML = `
      <div class="breakdown-row"><span>항목 계 (합계):</span><span>${formatCurrency(calc.subTotal)}</span></div>
      <div class="breakdown-row"><span>이윤 (적용):</span><span>${formatCurrency(calc.totalMargin)}</span></div>
      <div class="breakdown-row"><span>절사액 (백원 이하):</span><span>-${formatCurrency(calc.truncation)}</span></div>
      <div class="breakdown-row highlight"><span>공급가액:</span><span>${formatCurrency(calc.supplyPrice)}</span></div>
      <div class="breakdown-row"><span>부가가치세 (10%):</span><span>${formatCurrency(calc.vat)}</span></div>
    `;
  } else if (calc.type === '디지털') {
    breakdownContainer.innerHTML = `
      <div class="breakdown-row"><span>항목 계 (합계):</span><span>${formatCurrency(calc.subTotal)}</span></div>
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

// Form Event Listeners for Full Preview Update
[customerInput, dateInput, titleInput, quantityInput, pagesInput, coverPaperInput, innerPaperInput, discountRateInput, kyungDiscountSelect, kyungCustomDiscountInput, overheadRateInput, profitRateInput, digitalXBannerSizeInput, digitalXBannerQtyInput, digitalBannerSizeInput, digitalBannerQtyInput, digitalNameplateQtyInput].forEach(el => {
  if (el) {
    el.addEventListener('input', updateFullPreview);
    el.addEventListener('change', updateFullPreview);
  }
});

function toggleDigitalSubOptions() {
  if (optDigitalXBannerCheck && digitalXBannerGroup) {
    digitalXBannerGroup.style.display = optDigitalXBannerCheck.checked ? 'flex' : 'none';
  }
  if (optDigitalBannerCheck && digitalBannerGroup) {
    digitalBannerGroup.style.display = optDigitalBannerCheck.checked ? 'flex' : 'none';
  }
  if (optDigitalNameplateCheck && digitalNameplateGroup) {
    digitalNameplateGroup.style.display = optDigitalNameplateCheck.checked ? 'block' : 'none';
  }
}

[optEpoxyCheck, optFoilCheck, optKyungCoverDesignCheck, optDigitalCoverTypeCheck, optDigitalInnerEditCheck, optDigitalXBannerCheck, optDigitalBannerCheck, optDigitalNameplateCheck].forEach(el => {
  if (el) {
    el.addEventListener('change', () => {
      toggleDigitalSubOptions();
      updateFullPreview();
    });
  }
});

document.querySelectorAll('input[name="printType"]').forEach(el => {
  el.addEventListener('change', () => {
    updateDefaultDiscountRate();
    updateFullPreview();
  });
});

document.querySelectorAll('input[name="digitalColorType"]').forEach(el => {
  el.addEventListener('change', () => {
    delete userCustomPrices['digitalInnerPrintPrice'];
    updateFullPreview();
  });
});

document.querySelectorAll('input[name="printSize"]').forEach(el => {
  el.addEventListener('change', () => {
    const size = getSelectedRadioValue('printSize');
    populateKyungDiscountOptions(size);
    updateDefaultDiscountRate();
    updateFullPreview();
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
  const optKyungCoverDesign = optKyungCoverDesignCheck.checked;
  const digitalColorType = getSelectedRadioValue('digitalColorType') || '컬러';
  const optDigitalCoverType = optDigitalCoverTypeCheck ? optDigitalCoverTypeCheck.checked : false;
  const optDigitalInnerEdit = optDigitalInnerEditCheck ? optDigitalInnerEditCheck.checked : false;
  const optDigitalXBanner = optDigitalXBannerCheck ? optDigitalXBannerCheck.checked : false;
  const digitalXBannerSize = digitalXBannerSizeInput ? digitalXBannerSizeInput.value : '600x1800mm';
  const digitalXBannerQty = digitalXBannerQtyInput ? digitalXBannerQtyInput.value : 1;
  const optDigitalBanner = optDigitalBannerCheck ? optDigitalBannerCheck.checked : false;
  const digitalBannerSize = digitalBannerSizeInput ? digitalBannerSizeInput.value : '4000x900mm';
  const digitalBannerQty = digitalBannerQtyInput ? digitalBannerQtyInput.value : 1;
  const optDigitalNameplate = optDigitalNameplateCheck ? optDigitalNameplateCheck.checked : false;
  const digitalNameplateQty = digitalNameplateQtyInput ? digitalNameplateQtyInput.value : 1;

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
      optKyungCoverDesign,
      digitalColorType,
      optDigitalCoverType,
      optDigitalInnerEdit,
      optDigitalXBanner,
      digitalXBannerSize,
      digitalXBannerQty,
      optDigitalBanner,
      digitalBannerSize,
      digitalBannerQty,
      optDigitalNameplate,
      digitalNameplateQty,
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
updateFullPreview();
