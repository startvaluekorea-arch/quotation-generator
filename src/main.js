import { calculateQuotation } from './calculator.js';
import { downloadExcelQuotation } from './excelExporter.js';
import { initLandingPage } from './landing.js';
import { getCurrentUser, signOutUser, onAuthStateChange } from './auth.js';

// DOM Containers
const landingApp = document.getElementById('landing-app');
const quotationApp = document.getElementById('quotation-app');
const userDisplayName = document.getElementById('user-display-name');
const btnLogout = document.getElementById('btn-logout');

// DOM Form Elements
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

const kyungCoverOptionsGroup = document.getElementById('group-kyung-cover-options');
const kyungCoverDesignGroup = document.getElementById('group-kyung-cover-design');
const optKyungCoverDesignCheck = document.getElementById('opt-kyung-cover-design');

const kyungImageCutGroup = document.getElementById('group-kyung-image-cut');
const optKyungImageCutCheck = document.getElementById('opt-kyung-image-cut');
const kyungImageCutQtyContainer = document.getElementById('container-kyung-image-cut-qty');
const kyungImageCutQtyInput = document.getElementById('kyungImageCutQty');

const digitalOptionsGroup = document.getElementById('group-digital-options');
const digitalColorPagesInput = document.getElementById('digitalColorPages');
const digitalBWPagesInput = document.getElementById('digitalBWPages');
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

const offsetCoverTypeGroup = document.getElementById('group-offset-cover-type');
const offsetCoverTypeSelect = document.getElementById('offsetCoverType');
const offsetDesignOptionsGroup = document.getElementById('group-offset-design-options');
const optOffsetCoverDesignCheck = document.getElementById('opt-offset-cover-design');
const optOffsetInnerEditCheck = document.getElementById('opt-offset-inner-edit');
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
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' 원';
}

function getSelectedRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

let lastType = '';
let lastSize = '';

// 사용자가 수동 수정한 단가 기억 객체 (인쇄방식별 독립 관리)
const userCustomPrices = {
  '경인쇄': {},
  '옵셋': {},
  '디지털': {}
};

function getCurrentCustomPrices() {
  const type = getSelectedRadioValue('printType') || '옵셋';
  if (!userCustomPrices[type]) {
    userCustomPrices[type] = {};
  }
  return userCustomPrices[type];
}

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
  if (!kyungDiscountSelect) return;
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
      if (discountRateInput) discountRateInput.value = 80;
      populateKyungDiscountOptions(size);
    } else if (type === '디지털') {
      if (discountRateInput) discountRateInput.value = 100;
    } else {
      if (discountRateInput) discountRateInput.value = 85;
    }
    lastType = type;
    lastSize = size;
  }
}

function toggleModeOptions() {
  const type = getSelectedRadioValue('printType');
  if (type === '경인쇄') {
    if (kyungCoverOptionsGroup) kyungCoverOptionsGroup.style.display = 'flex';
    if (kyungCoverDesignGroup) kyungCoverDesignGroup.style.display = 'flex';
    if (kyungImageCutGroup) kyungImageCutGroup.style.display = 'flex';
    if (kyungDiscountGroup) kyungDiscountGroup.style.display = 'flex';
    if (digitalOptionsGroup) digitalOptionsGroup.style.display = 'none';
    if (offsetCoverTypeGroup) offsetCoverTypeGroup.style.display = 'none';
    if (offsetPostprocessingGroup) offsetPostprocessingGroup.style.display = 'none';
    if (offsetRatesGroup) offsetRatesGroup.style.display = 'none';
    if (discountRateGroup) discountRateGroup.style.display = 'flex';
    if (kyungDiscountSelect && kyungDiscountSelect.value === 'custom') {
      if (kyungCustomDiscountGroup) kyungCustomDiscountGroup.style.display = 'flex';
    } else {
      if (kyungCustomDiscountGroup) kyungCustomDiscountGroup.style.display = 'none';
    }
  } else if (type === '디지털') {
    if (kyungCoverOptionsGroup) kyungCoverOptionsGroup.style.display = 'none';
    if (kyungCoverDesignGroup) kyungCoverDesignGroup.style.display = 'none';
    if (kyungImageCutGroup) kyungImageCutGroup.style.display = 'none';
    if (kyungDiscountGroup) kyungDiscountGroup.style.display = 'none';
    if (kyungCustomDiscountGroup) kyungCustomDiscountGroup.style.display = 'none';
    if (digitalOptionsGroup) digitalOptionsGroup.style.display = 'flex';
    if (offsetCoverTypeGroup) offsetCoverTypeGroup.style.display = 'none';
    if (offsetDesignOptionsGroup) offsetDesignOptionsGroup.style.display = 'none';
    if (offsetPostprocessingGroup) offsetPostprocessingGroup.style.display = 'none';
    if (offsetRatesGroup) offsetRatesGroup.style.display = 'none';
    if (discountRateGroup) discountRateGroup.style.display = 'none';
  } else {
    if (kyungCoverOptionsGroup) kyungCoverOptionsGroup.style.display = 'none';
    if (kyungCoverDesignGroup) kyungCoverDesignGroup.style.display = 'none';
    if (kyungImageCutGroup) kyungImageCutGroup.style.display = 'none';
    if (kyungDiscountGroup) kyungDiscountGroup.style.display = 'none';
    if (kyungCustomDiscountGroup) kyungCustomDiscountGroup.style.display = 'none';
    if (digitalOptionsGroup) digitalOptionsGroup.style.display = 'none';
    if (offsetCoverTypeGroup) offsetCoverTypeGroup.style.display = 'flex';
    if (offsetDesignOptionsGroup) offsetDesignOptionsGroup.style.display = 'flex';
    if (offsetPostprocessingGroup) offsetPostprocessingGroup.style.display = 'flex';
    if (offsetRatesGroup) offsetRatesGroup.style.display = 'flex';
    if (discountRateGroup) discountRateGroup.style.display = 'flex';
  }
}

function getActiveKyungDiscount() {
  if (!kyungDiscountSelect) return 0;
  if (kyungDiscountSelect.value === 'custom') {
    return parseInt(kyungCustomDiscountInput.value, 10) || 0;
  }
  return parseInt(kyungDiscountSelect.value, 10) || 0;
}

function getQuotationParams() {
  const type = getSelectedRadioValue('printType') || '옵셋';
  const size = getSelectedRadioValue('printSize') || '10절';
  const customerName = customerInput ? customerInput.value.trim() : '';
  const dateStr = dateInput ? dateInput.value : '';
  const title = titleInput ? titleInput.value.trim() : '';
  const quantity = quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1;
  const pages = pagesInput ? parseInt(pagesInput.value, 10) || 1 : 1;
  const coverPaper = coverPaperInput ? coverPaperInput.value.trim() || '아트250' : '아트250';
  const innerPaper = innerPaperInput ? innerPaperInput.value.trim() || '미색80' : '미색80';

  const customPrices = getCurrentCustomPrices();

  const baseParams = {
    type,
    size,
    customerName,
    title,
    dateStr,
    quantity,
    pages,
    coverPaper,
    innerPaper,
    customPrices
  };

  if (type === '경인쇄') {
    const discountRate = discountRateInput ? parseInt(discountRateInput.value, 10) || 80 : 80;
    const kyungDiscount = getActiveKyungDiscount();
    const optKyungCoverDesign = optKyungCoverDesignCheck ? optKyungCoverDesignCheck.checked : false;
    const optKyungImageCut = optKyungImageCutCheck ? optKyungImageCutCheck.checked : false;
    const kyungImageCutQty = optKyungImageCut ? (kyungImageCutQtyInput ? parseInt(kyungImageCutQtyInput.value, 10) || 1 : 1) : 0;
    const kyungCoverType = getSelectedRadioValue('kyungCoverType') || '컬러표지';
    const kyungCoatingType = getSelectedRadioValue('kyungCoatingType') || '무광코팅';

    return {
      ...baseParams,
      discountRate,
      kyungDiscount,
      optKyungCoverDesign,
      optKyungImageCut,
      kyungImageCutQty,
      kyungCoverType,
      kyungCoatingType
    };
  } else if (type === '디지털') {
    const colorPages = digitalColorPagesInput ? parseInt(digitalColorPagesInput.value, 10) : pages;
    const optDigitalCoverType = optDigitalCoverTypeCheck ? optDigitalCoverTypeCheck.checked : false;
    const optDigitalInnerEdit = optDigitalInnerEditCheck ? optDigitalInnerEditCheck.checked : false;

    const optDigitalXBanner = optDigitalXBannerCheck ? optDigitalXBannerCheck.checked : false;
    const digitalXBannerSize = digitalXBannerSizeInput ? digitalXBannerSizeInput.value : '600x1800mm';
    const digitalXBannerQty = digitalXBannerQtyInput ? parseInt(digitalXBannerQtyInput.value, 10) || 1 : 1;
    const digitalXBannerStand = getSelectedRadioValue('digitalXBannerStand') || '거치대포함';

    const optDigitalBanner = optDigitalBannerCheck ? optDigitalBannerCheck.checked : false;
    const digitalBannerSize = digitalBannerSizeInput ? digitalBannerSizeInput.value : '4000x900mm';
    const digitalBannerQty = digitalBannerQtyInput ? parseInt(digitalBannerQtyInput.value, 10) || 1 : 1;

    const optDigitalNameplate = optDigitalNameplateCheck ? optDigitalNameplateCheck.checked : false;
    const digitalNameplateQty = digitalNameplateQtyInput ? parseInt(digitalNameplateQtyInput.value, 10) || 1 : 1;

    return {
      ...baseParams,
      discountRate: 100,
      colorPages,
      optDigitalCoverType,
      optDigitalInnerEdit,
      optDigitalXBanner,
      digitalXBannerSize,
      digitalXBannerQty,
      digitalXBannerStand,
      optDigitalBanner,
      digitalBannerSize,
      digitalBannerQty,
      optDigitalNameplate,
      digitalNameplateQty
    };
  } else {
    // 옵셋 인쇄
    const discountRate = discountRateInput ? parseInt(discountRateInput.value, 10) || 85 : 85;
    const overheadRate = overheadRateInput ? parseInt(overheadRateInput.value, 10) || 10 : 10;
    const profitRate = profitRateInput ? parseInt(profitRateInput.value, 10) || 20 : 20;
    const optEpoxy = optEpoxyCheck ? optEpoxyCheck.checked : false;
    const optFoil = optFoilCheck ? optFoilCheck.checked : false;
    const offsetCoverType = offsetCoverTypeSelect ? offsetCoverTypeSelect.value : '표지-단면-4도';
    const optOffsetCoverDesign = optOffsetCoverDesignCheck ? optOffsetCoverDesignCheck.checked : true;
    const optOffsetInnerEdit = optOffsetInnerEditCheck ? optOffsetInnerEditCheck.checked : true;

    return {
      ...baseParams,
      discountRate,
      overheadRate,
      profitRate,
      optEpoxy,
      optFoil,
      offsetCoverType,
      optOffsetCoverDesign,
      optOffsetInnerEdit
    };
  }
}

function updateSummaryAndBreakdownOnly() {
  const params = getQuotationParams();
  const calc = calculateQuotation(params);

  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(calc.grandTotal);
  if (supplyPriceEl) supplyPriceEl.textContent = formatCurrency(calc.supplyPrice);
  if (vatEl) vatEl.textContent = formatCurrency(calc.vat);

  if (tableBody) {
    calc.items.forEach(item => {
      const amountTd = tableBody.querySelector(`td[data-amount-key="${item.key}"]`);
      if (amountTd) {
        amountTd.textContent = formatCurrency(item.amount);
      }
    });
  }

  if (breakdownContainer) {
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
        <div class="breakdown-row"><span>일반관리비 (${params.overheadRate}%):</span><span>${formatCurrency(calc.overhead)}</span></div>
        <div class="breakdown-row"><span>이윤 (${params.profitRate}%):</span><span>${formatCurrency(calc.profit)}</span></div>
        <div class="breakdown-row"><span>소계:</span><span>${formatCurrency(calc.rawSubTotal)}</span></div>
        <div class="breakdown-row"><span>할인/네고 적용금액 (${params.discountRate}%):</span><span>${formatCurrency(calc.discountedTotal)}</span></div>
        <div class="breakdown-row"><span>절사액 (백원 이하):</span><span>-${formatCurrency(calc.truncation)}</span></div>
        <div class="breakdown-row highlight"><span>공급가액:</span><span>${formatCurrency(calc.supplyPrice)}</span></div>
        <div class="breakdown-row"><span>부가가치세 (10%):</span><span>${formatCurrency(calc.vat)}</span></div>
      `;
    }
  }
}

function updateFullPreview() {
  updateDefaultDiscountRate();
  toggleModeOptions();

  const params = getQuotationParams();
  if (previewBadge) {
    previewBadge.textContent = params.type === '디지털' ? `${params.type} 인쇄` : `${params.type} ${params.size} (${params.discountRate}% 할인)`;
  }

  const calc = calculateQuotation(params);

  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(calc.grandTotal);
  if (supplyPriceEl) supplyPriceEl.textContent = formatCurrency(calc.supplyPrice);
  if (vatEl) vatEl.textContent = formatCurrency(calc.vat);

  if (tableBody) {
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

    tableBody.querySelectorAll('input.price-input').forEach(inputEl => {
      const key = inputEl.getAttribute('data-key');
      inputEl.addEventListener('input', (e) => {
        const rawVal = e.target.value.replace(/[^0-9]/g, '');
        const numVal = parseInt(rawVal, 10);
        const currentPrices = getCurrentCustomPrices();
        
        if (!isNaN(numVal)) {
          currentPrices[key] = numVal;
        } else {
          currentPrices[key] = 0;
        }
        updateSummaryAndBreakdownOnly();
      });
    });
  }

  if (breakdownContainer) {
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
        <div class="breakdown-row"><span>일반관리비 (${params.overheadRate}%):</span><span>${formatCurrency(calc.overhead)}</span></div>
        <div class="breakdown-row"><span>이윤 (${params.profitRate}%):</span><span>${formatCurrency(calc.profit)}</span></div>
        <div class="breakdown-row"><span>소계:</span><span>${formatCurrency(calc.rawSubTotal)}</span></div>
        <div class="breakdown-row"><span>할인/네고 적용금액 (${params.discountRate}%):</span><span>${formatCurrency(calc.discountedTotal)}</span></div>
        <div class="breakdown-row"><span>절사액 (백원 이하):</span><span>-${formatCurrency(calc.truncation)}</span></div>
        <div class="breakdown-row highlight"><span>공급가액:</span><span>${formatCurrency(calc.supplyPrice)}</span></div>
        <div class="breakdown-row"><span>부가가치세 (10%):</span><span>${formatCurrency(calc.vat)}</span></div>
      `;
    }
  }
}

// Form Event Listeners
[customerInput, dateInput, titleInput, quantityInput, pagesInput, digitalColorPagesInput, digitalBWPagesInput, coverPaperInput, innerPaperInput, discountRateInput, kyungDiscountSelect, kyungCustomDiscountInput, overheadRateInput, profitRateInput, digitalXBannerSizeInput, digitalXBannerQtyInput, digitalBannerSizeInput, digitalBannerQtyInput, digitalNameplateQtyInput].forEach(el => {
  if (el) {
    el.addEventListener('change', updateFullPreview);
  }
});

if (pagesInput) {
  pagesInput.addEventListener('input', () => {
    const totalPages = parseInt(pagesInput.value, 10) || 1;
    if (digitalColorPagesInput && digitalBWPagesInput) {
      let bwPages = parseInt(digitalBWPagesInput.value, 10);
      if (isNaN(bwPages)) bwPages = 0;
      bwPages = Math.max(0, Math.min(totalPages, bwPages));
      digitalBWPagesInput.value = bwPages;
      digitalColorPagesInput.value = totalPages - bwPages;
    }
    updateFullPreview();
  });
}

if (digitalColorPagesInput) {
  digitalColorPagesInput.addEventListener('input', () => {
    const totalPages = parseInt(pagesInput.value, 10) || 1;
    let colorPages = parseInt(digitalColorPagesInput.value, 10);
    if (isNaN(colorPages)) colorPages = totalPages;
    colorPages = Math.max(0, Math.min(totalPages, colorPages));
    digitalColorPagesInput.value = colorPages;
    if (digitalBWPagesInput) {
      digitalBWPagesInput.value = totalPages - colorPages;
    }
    updateFullPreview();
  });
}

if (digitalBWPagesInput) {
  digitalBWPagesInput.addEventListener('input', () => {
    const totalPages = parseInt(pagesInput.value, 10) || 1;
    let bwPages = parseInt(digitalBWPagesInput.value, 10);
    if (isNaN(bwPages)) bwPages = 0;
    bwPages = Math.max(0, Math.min(totalPages, bwPages));
    digitalBWPagesInput.value = bwPages;
    if (digitalColorPagesInput) {
      digitalColorPagesInput.value = totalPages - colorPages;
    }
    updateFullPreview();
  });
}

function toggleSubOptions() {
  if (optDigitalXBannerCheck && digitalXBannerGroup) {
    digitalXBannerGroup.style.display = optDigitalXBannerCheck.checked ? 'flex' : 'none';
  }
  if (optDigitalBannerCheck && digitalBannerGroup) {
    digitalBannerGroup.style.display = optDigitalBannerCheck.checked ? 'flex' : 'none';
  }
  if (optDigitalNameplateCheck && digitalNameplateGroup) {
    digitalNameplateGroup.style.display = optDigitalNameplateCheck.checked ? 'block' : 'none';
  }
  if (optKyungImageCutCheck && kyungImageCutQtyContainer) {
    kyungImageCutQtyContainer.style.display = optKyungImageCutCheck.checked ? 'flex' : 'none';
  }
}

[optEpoxyCheck, optFoilCheck, optKyungCoverDesignCheck, optKyungImageCutCheck, optOffsetCoverDesignCheck, optOffsetInnerEditCheck, optDigitalCoverTypeCheck, optDigitalInnerEditCheck, optDigitalXBannerCheck, optDigitalBannerCheck, optDigitalNameplateCheck].forEach(el => {
  if (el) {
    el.addEventListener('change', () => {
      toggleSubOptions();
      updateFullPreview();
    });
  }
});

if (kyungImageCutQtyInput) {
  kyungImageCutQtyInput.addEventListener('input', updateFullPreview);
}

if (offsetCoverTypeSelect) {
  offsetCoverTypeSelect.addEventListener('change', updateFullPreview);
}

document.querySelectorAll('input[name="kyungCoverType"], input[name="kyungCoatingType"]').forEach(el => {
  el.addEventListener('change', updateFullPreview);
});

document.querySelectorAll('input[name="printType"]').forEach(el => {
  el.addEventListener('change', () => {
    updateDefaultDiscountRate();
    updateFullPreview();
  });
});

document.querySelectorAll('input[name="digitalColorType"]').forEach(el => {
  el.addEventListener('change', () => {
    if (userCustomPrices['디지털']) delete userCustomPrices['디지털']['digitalInnerPrintPrice'];
    updateFullPreview();
  });
});

document.querySelectorAll('input[name="digitalXBannerStand"]').forEach(el => {
  el.addEventListener('change', () => {
    if (userCustomPrices['디지털']) delete userCustomPrices['디지털']['digitalXBannerMakePrice'];
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

if (btnDownload) {
  btnDownload.addEventListener('click', async () => {
    const params = getQuotationParams();

    btnDownload.disabled = true;
    const originalText = btnDownload.innerHTML;
    btnDownload.innerHTML = '⏳ 엑셀 파일 생성 중...';

    try {
      await downloadExcelQuotation(params);
    } catch (err) {
      alert('엑셀 다운로드 중 오류가 발생했습니다: ' + err.message);
      console.error(err);
    } finally {
      btnDownload.disabled = false;
      btnDownload.innerHTML = originalText;
    }
  });
}


// ==================== AUTH GUARD & NAVIGATION LOGIC ==================== //

async function renderAppForSession(session) {
  if (session && session.user) {
    // 로그인 완료 -> 견적서 앱 표시
    landingApp.style.display = 'none';
    quotationApp.style.display = 'flex';

    const displayName = session.user.user_metadata?.display_name || session.user.email.split('@')[0];
    if (userDisplayName) {
      userDisplayName.textContent = displayName;
    }

    // 견적서 초기 렌더링
    populateKyungDiscountOptions(getSelectedRadioValue('printSize'));
    if (pagesInput && digitalColorPagesInput && digitalBWPagesInput) {
      const initPages = parseInt(pagesInput.value, 10) || 62;
      digitalColorPagesInput.value = initPages;
      digitalBWPagesInput.value = 0;
    }
    updateFullPreview();
  } else {
    // 미인증 상태 -> 랜딩 페이지 표시
    quotationApp.style.display = 'none';
    landingApp.style.display = 'flex';
  }
}

// 로그아웃 버튼
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOutUser();
    }
  });
}

// 앱 초기화 함수
async function init() {
  initLandingPage();

  // Supabase Auth 상태 실시간 감지
  onAuthStateChange((event, session) => {
    renderAppForSession(session);
  });

  // 초기 세션 체크
  const user = await getCurrentUser();
  const session = user ? { user } : null;
  renderAppForSession(session);
}

// Start App
init();
