/**
 * 인쇄 견적 계산 엔진
 */

function round(val, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function roundUp(val, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.ceil(val * factor) / factor;
}

function getTruncation(val) {
  // 백원 이하 절사 (예: 123456 -> 456)
  const strVal = Math.floor(val).toString();
  if (strVal.length < 3) return 0;
  return parseInt(strVal.slice(-3), 10);
}

/**
 * 경인쇄 (10절 / 16절) 견적 계산
 */
export function calculateKyung(params) {
  const {
    size,
    quantity,
    pages,
    discountRate = 80,
    kyungDiscount = 3500,
    kyungCoverType = '컬러표지',
    kyungCoatingType = '무광코팅',
    coverPaper = '아트250',
    innerPaper = '미색80',
    optKyungCoverDesign = false,
    customPrices = {}
  } = params;

  const isColor = kyungCoverType === '컬러표지';
  const isMatte = kyungCoatingType === '무광코팅';

  const colorDegreeStr = isColor ? '4도' : '1도';
  const coatingStr = isMatte ? '무광코팅' : '코팅없음';
  const c16Text = `${colorDegreeStr}, ${coatingStr}`;

  let g16;
  if (size === '10절') {
    if (isColor && isMatte) g16 = 20;
    else if (isColor && !isMatte) g16 = 15;
    else if (!isColor && isMatte) g16 = 12.5;
    else g16 = 7.5;
  } else {
    // 16절
    if (isColor && isMatte) g16 = 18;
    else if (isColor && !isMatte) g16 = 13;
    else if (!isColor && isMatte) g16 = 10.5;
    else g16 = 5.5;
  }

  const d16 = 15370;
  const e16 = quantity > 50 ? quantity - 50 : 0;
  const h16Rate = discountRate / 100;

  const d17 = Number(kyungDiscount);
  const baseCost = size === '10절' ? (12150 - d17) : (8180 - d17);
  const extraRate = size === '10절' ? 157 : 101;
  const g17 = pages;

  // 16행 (표지 인쇄)
  const i16 = (d16 + (e16 / 10) * 183) * g16 * h16Rate;

  // 17행 (내지 1색, 양면)
  const f17 = quantity > 50 ? quantity - 50 : 0;
  const i17 = (baseCost + (f17 / 10) * extraRate) * g17 * h16Rate;

  // 18행 (표지디자인)
  const coverDesignPrice = customPrices.kyungCoverDesignPrice !== undefined ? Number(customPrices.kyungCoverDesignPrice) : 300000;
  const i18 = optKyungCoverDesign ? coverDesignPrice : 0;

  const discountNote = d17 > 0 ? ` (조판생략감액: ${d17.toLocaleString()}원 차감)` : '';

  const items = [
    { key: 'kyungCover', name: `표지 (${c16Text})`, qty: Number(g16).toFixed(1), unitPrice: d16, amount: round(i16), note: `${coverPaper}, ${discountRate}% 할인적용` },
    { key: 'kyungInner', name: `내지 (1색, 양면)${discountNote}`, qty: g17, unitPrice: d17, amount: round(i17), note: `${innerPaper}, ${discountRate}% 할인적용` }
  ];

  if (optKyungCoverDesign) {
    items.push({ key: 'kyungCoverDesignPrice', name: '표지디자인', qty: 1, unit: '식', unitPrice: coverDesignPrice, amount: coverDesignPrice, note: '', editable: true });
  }

  // 19행 (이미지컷작업)
  const numImageCutQty = Number(params.kyungImageCutQty) || 0;
  const imageCutPrice = customPrices.kyungImageCutPrice !== undefined ? Number(customPrices.kyungImageCutPrice) : 30000;
  if (numImageCutQty >= 1) {
    const i19 = numImageCutQty * imageCutPrice;
    items.push({
      key: 'kyungImageCutPrice',
      name: '컷작업',
      qty: numImageCutQty,
      unit: '컷',
      unitPrice: imageCutPrice,
      amount: round(i19),
      note: `${numImageCutQty}컷 × ${imageCutPrice.toLocaleString()}원`,
      editable: true
    });
  }

  const subTotal = items.reduce((acc, cur) => acc + cur.amount, 0);
  const totalMargin = round(subTotal * 1.0);
  const truncation = getTruncation(totalMargin);
  const supplyPrice = totalMargin - truncation;
  const vat = round(supplyPrice * 0.1);
  const grandTotal = supplyPrice + vat;

  return {
    type: '경인쇄',
    size,
    kyungCoverType,
    kyungCoatingType,
    c16Text,
    g16,
    discountRate,
    coverPaper,
    innerPaper,
    items,
    subTotal,
    totalMargin,
    truncation,
    supplyPrice,
    vat,
    grandTotal
  };
}

/**
 * 옵셋 인쇄 (10절 / 16절) 견적 계산 - 단가 가변 지정 및 종이 종류 반영
 */
export function calculateOffset(params) {
  const {
    size,
    quantity,
    pages,
    discountRate = 85,
    overheadRate = 10,
    profitRate = 20,
    optEpoxy = false,
    optFoil = false,
    coverPaper = '아트250',
    innerPaper = '미색80',
    customPrices = {}
  } = params;

  let f18, defaultH18, f19, defaultH19;

  if (size === '10절') {
    f18 = roundUp((quantity / 4 + 250) / 500, 1);
    defaultH18 = 155500;
    f19 = (roundUp(pages / 16, 1) * (quantity + 250)) / 500;
    defaultH19 = 51090;
  } else {
    f18 = roundUp((quantity / 8 + 250) / 500, 1);
    defaultH18 = 223850;
    f19 = (roundUp(pages / 32, 1) * (quantity + 250)) / 500;
    defaultH19 = 73550;
  }

  // 사용자 수동 단가 반영 (기본값 설정)
  const h18 = customPrices.coverPaperPrice !== undefined ? Number(customPrices.coverPaperPrice) : defaultH18;
  const h19 = customPrices.innerPaperPrice !== undefined ? Number(customPrices.innerPaperPrice) : defaultH19;
  const h20 = customPrices.coverDesignPrice !== undefined ? Number(customPrices.coverDesignPrice) : 266000;
  const h21 = customPrices.innerTypePrice !== undefined ? Number(customPrices.innerTypePrice) : round(10050 * 1.4);
  const h22 = customPrices.coverPlatePrice !== undefined ? Number(customPrices.coverPlatePrice) : 14000;
  const h23 = customPrices.innerPlatePrice !== undefined ? Number(customPrices.innerPlatePrice) : h22;
  const h24 = customPrices.coverPrintPrice !== undefined ? Number(customPrices.coverPrintPrice) : h23;
  const h25 = customPrices.innerPrintPrice !== undefined ? Number(customPrices.innerPrintPrice) : h24;
  const h27 = customPrices.epoxyPrice !== undefined ? Number(customPrices.epoxyPrice) : 400000;
  const h28 = customPrices.foilPrice !== undefined ? Number(customPrices.foilPrice) : 400000;
  const h30 = customPrices.coatingPrice !== undefined ? Number(customPrices.coatingPrice) : 180000;

  const j18 = round(f18 * h18);
  const j19 = round(f19 * h19);

  const f20 = 1;
  const j20 = round(f20 * h20);

  const f21 = pages;
  const j21 = round(f21 * h21);

  const offsetCoverType = params.offsetCoverType || '표지-단면-4도';
  let f22 = 4;
  let coverTypeLabel = '표지-단면-4도';
  if (offsetCoverType === '표지-양면-4도' || offsetCoverType === '표지양면4도') {
    f22 = 8;
    coverTypeLabel = '표지-양면-4도';
  } else if (offsetCoverType === '표지-양면4/1도' || offsetCoverType === '표지양면4/1도') {
    f22 = 5;
    coverTypeLabel = '표지-양면4/1도';
  }
  const j22 = round(f22 * h22);

  const f23 = roundUp(pages / 16, 0) * 4;
  const j23 = round(f23 * h23);

  const f24 = f22;
  const j24 = round(f24 * h24);

  const f25 = f23;
  const j25 = round(f25 * h25);

  // 무선제본 부수 구간별 단가 및 수량 계산
  let f26, bindingUnit, h26;
  if (customPrices.bindingPrice !== undefined) {
    h26 = Number(customPrices.bindingPrice);
    if (quantity < 100) {
      f26 = 1;
      bindingUnit = '식';
    } else {
      f26 = quantity;
      bindingUnit = '부';
    }
  } else {
    if (quantity < 100) {
      f26 = 1;
      bindingUnit = '식';
      h26 = 290000;
    } else if (quantity < 200) {
      f26 = quantity;
      bindingUnit = '부';
      h26 = 2900;
    } else if (quantity < 400) {
      f26 = quantity;
      bindingUnit = '부';
      h26 = 2400;
    } else if (quantity < 800) {
      f26 = quantity;
      bindingUnit = '부';
      h26 = 1900;
    } else if (quantity < 1000) {
      f26 = quantity;
      bindingUnit = '부';
      h26 = 1400;
    } else {
      f26 = quantity;
      bindingUnit = '부';
      h26 = 900;
    }
  }
  const j26 = round(f26 * h26);

  const f27 = optEpoxy ? 1 : 0;
  const j27 = round(f27 * h27);

  const f28 = optFoil ? 1 : 0;
  const j28 = round(f28 * h28);

  const f30 = roundUp(f18, 0);
  const j30 = round(f30 * h30);

  const items = [
    { key: 'coverPaperPrice', name: `용지대 (표지 ${coverPaper})`, qty: f18, unit: 'R', unitPrice: h18, amount: j18, editable: true },
    { key: 'innerPaperPrice', name: `용지대 (내지 ${innerPaper})`, qty: round(f19, 2), unit: 'R', unitPrice: h19, amount: j19, editable: true },
    { key: 'coverDesignPrice', name: '표지 디자인', qty: f20, unit: '식', unitPrice: h20, amount: j20, editable: true },
    { key: 'innerTypePrice', name: '내지 조판비', qty: f21, unit: 'P', unitPrice: h21, amount: j21, editable: true },
    { key: 'coverPlatePrice', name: `인쇄판비 (${coverTypeLabel})`, qty: f22, unit: '판', unitPrice: h22, amount: j22, editable: true },
    { key: 'innerPlatePrice', name: '인쇄판비 (내지)', qty: f23, unit: '판', unitPrice: h23, amount: j23, editable: true },
    { key: 'coverPrintPrice', name: `인쇄 (${coverTypeLabel})`, qty: f24, unit: '판', unitPrice: h24, amount: j24, editable: true },
    { key: 'innerPrintPrice', name: '인쇄 (내지)', qty: f25, unit: '판', unitPrice: h25, amount: j25, editable: true },
    { key: 'bindingPrice', name: '무선제본', qty: f26, unit: bindingUnit, unitPrice: h26, amount: j26, editable: true }
  ];

  if (optEpoxy) {
    items.push({ key: 'epoxyPrice', name: '에폭시 (후가공)', qty: f27, unit: '식', unitPrice: h27, amount: j27, editable: true });
  }
  if (optFoil) {
    items.push({ key: 'foilPrice', name: '박인쇄 (후가공)', qty: f28, unit: '식', unitPrice: h28, amount: j28, editable: true });
  }

  items.push({ key: 'coatingPrice', name: '코팅비', qty: f30, unit: 'R', unitPrice: h30, amount: j30, editable: true });

  const subTotal = items.reduce((acc, cur) => acc + cur.amount, 0);
  const overhead = round(subTotal * (overheadRate / 100));
  const profit = round((subTotal + overhead - j18 - j19) * (profitRate / 100));
  const rawSubTotal = subTotal + overhead + profit;

  const discountRatio = discountRate / 100;
  const discountedTotal = round(rawSubTotal * discountRatio);
  const truncation = getTruncation(discountedTotal);
  const supplyPrice = round(discountedTotal - truncation);
  const vat = round(supplyPrice * 0.1);
  const grandTotal = supplyPrice + vat;

  return {
    type: '옵셋',
    size,
    discountRate,
    overheadRate,
    profitRate,
    optEpoxy,
    optFoil,
    coverPaper,
    innerPaper,
    customPrices: {
      coverPaperPrice: h18,
      innerPaperPrice: h19,
      coverDesignPrice: h20,
      innerTypePrice: h21,
      coverPlatePrice: h22,
      innerPlatePrice: h23,
      coverPrintPrice: h24,
      innerPrintPrice: h25,
      bindingPrice: h26,
      epoxyPrice: h27,
      foilPrice: h28,
      coatingPrice: h30
    },
    items,
    subTotal,
    overhead,
    profit,
    rawSubTotal,
    discountedTotal,
    truncation,
    supplyPrice,
    vat,
    grandTotal
  };
}

/**
 * 디지털 인쇄 견적 계산
 */
export function calculateDigital(params) {
  const {
    quantity,
    pages,
    colorPages,
    coverPaper = '아트250',
    innerPaper = '미색80',
    optDigitalCoverType = false,
    optDigitalInnerEdit = false,
    optDigitalXBanner = false,
    digitalXBannerSize = '600x1800mm',
    digitalXBannerQty = 1,
    digitalXBannerStand = '거치대포함',
    optDigitalBanner = false,
    digitalBannerSize = '4000x900mm',
    digitalBannerQty = 1,
    optDigitalNameplate = false,
    digitalNameplateQty = 1,
    customPrices = {}
  } = params;

  const numQuantity = Number(quantity) || 1;
  const numTotalPages = Number(pages) || 1;

  // 컬러 면수 처리: 지정되지 않은 경우 기본적으로 총면수와 동일 처리
  const numColorPages = colorPages !== undefined ? Number(colorPages) : numTotalPages;
  const clampedColorPages = Math.min(numTotalPages, Math.max(0, numColorPages));
  const numBWPages = Math.max(0, numTotalPages - clampedColorPages);

  const numXBannerQty = Number(digitalXBannerQty) || 1;
  const numBannerQty = Number(digitalBannerQty) || 1;
  const numNameplateQty = Number(digitalNameplateQty) || 1;

  // 단가 설정 (사용자 수동 지정 또는 템플릿 기본값)
  const coverDesignPrice = customPrices.digitalCoverDesignPrice !== undefined ? Number(customPrices.digitalCoverDesignPrice) : 300000;
  const innerEditPrice = customPrices.digitalInnerEditPrice !== undefined ? Number(customPrices.digitalInnerEditPrice) : 10040;
  const colorPrintPrice = customPrices.digitalInnerPrintPrice !== undefined ? Number(customPrices.digitalInnerPrintPrice) : 300;
  const bwPrintPrice = customPrices.digitalBWPrintPrice !== undefined ? Number(customPrices.digitalBWPrintPrice) : 80;
  const bindingPrice = customPrices.digitalBindingPrice !== undefined ? Number(customPrices.digitalBindingPrice) : 4000;

  const xbannerDesignPrice = customPrices.digitalXBannerDesignPrice !== undefined ? Number(customPrices.digitalXBannerDesignPrice) : 60000;
  const defaultXBannerMakePrice = digitalXBannerStand === '거치대미포함' ? 40000 : 60000;
  const xbannerMakePrice = customPrices.digitalXBannerMakePrice !== undefined ? Number(customPrices.digitalXBannerMakePrice) : defaultXBannerMakePrice;

  const bannerDesignPrice = customPrices.digitalBannerDesignPrice !== undefined ? Number(customPrices.digitalBannerDesignPrice) : 60000;
  const bannerMakePrice = customPrices.digitalBannerMakePrice !== undefined ? Number(customPrices.digitalBannerMakePrice) : 50000;

  const nameplateDesignPrice = customPrices.digitalNameplateDesignPrice !== undefined ? Number(customPrices.digitalNameplateDesignPrice) : 50000;
  const nameplateMakePrice = customPrices.digitalNameplateMakePrice !== undefined ? Number(customPrices.digitalNameplateMakePrice) : 4500;

  const items = [];

  // 책자-표지조판 (선택 시만 가산)
  if (optDigitalCoverType) {
    const coverDesignAmount = round(1 * coverDesignPrice);
    items.push({ key: 'digitalCoverDesignPrice', name: '편집 (책자-표지조판)', qty: 1, unit: '식', unitPrice: coverDesignPrice, amount: coverDesignAmount, editable: true });
  }

  // 책자-내지편집 (선택 시만 가산)
  if (optDigitalInnerEdit) {
    const innerEditAmount = round(numTotalPages * innerEditPrice);
    items.push({ key: 'digitalInnerEditPrice', name: '책자-내지편집', qty: numTotalPages, unit: 'P', unitPrice: innerEditPrice, amount: innerEditAmount, editable: true });
  }

  // 내지 인쇄 (컬러)
  if (clampedColorPages > 0) {
    const colorPrintAmount = round(clampedColorPages * numQuantity * colorPrintPrice);
    items.push({ key: 'digitalInnerPrintPrice', name: '내지 인쇄 (컬러)', qty: `${clampedColorPages}P × ${numQuantity}부`, unit: '', unitPrice: colorPrintPrice, amount: colorPrintAmount, editable: true });
  }

  // 내지 인쇄 (흑백) - 총면수 > 컬러면수 일 때만 포함
  if (numBWPages > 0) {
    const bwPrintAmount = round(numBWPages * numQuantity * bwPrintPrice);
    items.push({ key: 'digitalBWPrintPrice', name: '내지 인쇄 (흑백)', qty: `${numBWPages}P × ${numQuantity}부`, unit: '', unitPrice: bwPrintPrice, amount: bwPrintAmount, editable: true });
  }

  // 제본 (기본 포함)
  const bindingAmount = round(numQuantity * bindingPrice);
  items.push({ key: 'digitalBindingPrice', name: '제본 (무선제본)', qty: numQuantity, unit: '부', unitPrice: bindingPrice, amount: bindingAmount, editable: true });

  // X배너
  if (optDigitalXBanner) {
    const xbDesignAmount = round(1 * xbannerDesignPrice);
    const xbMakeAmount = round(numXBannerQty * xbannerMakePrice);
    items.push({ key: 'digitalXBannerDesignPrice', name: 'X배너 (기본 디자인)', qty: 1, unit: '식', unitPrice: xbannerDesignPrice, amount: xbDesignAmount, editable: true });
    items.push({ key: 'digitalXBannerMakePrice', name: `X배너 (${digitalXBannerSize}) [${digitalXBannerStand}]`, qty: numXBannerQty, unit: '부', unitPrice: xbannerMakePrice, amount: xbMakeAmount, editable: true });
  }

  // 현수막
  if (optDigitalBanner) {
    const bDesignAmount = round(1 * bannerDesignPrice);
    const bMakeAmount = round(numBannerQty * bannerMakePrice);
    items.push({ key: 'digitalBannerDesignPrice', name: '현수막 (기본 디자인)', qty: 1, unit: '식', unitPrice: bannerDesignPrice, amount: bDesignAmount, editable: true });
    items.push({ key: 'digitalBannerMakePrice', name: `현수막 (${digitalBannerSize})`, qty: numBannerQty, unit: '부', unitPrice: bannerMakePrice, amount: bMakeAmount, editable: true });
  }

  // 명패
  if (optDigitalNameplate) {
    const npDesignAmount = round(1 * nameplateDesignPrice);
    const npMakeAmount = round(numNameplateQty * nameplateMakePrice);
    items.push({ key: 'digitalNameplateDesignPrice', name: '명패 (기본 디자인)', qty: 1, unit: '식', unitPrice: nameplateDesignPrice, amount: npDesignAmount, editable: true });
    items.push({ key: 'digitalNameplateMakePrice', name: '종이 삼각명패 (제작)', qty: numNameplateQty, unit: '부', unitPrice: nameplateMakePrice, amount: npMakeAmount, editable: true });
  }

  const supplyPrice = items.reduce((acc, cur) => acc + cur.amount, 0);
  const vat = round(supplyPrice * 0.1);
  const grandTotal = supplyPrice + vat;

  return {
    type: '디지털',
    colorPages: clampedColorPages,
    bwPages: numBWPages,
    optDigitalCoverType,
    optDigitalInnerEdit,
    optDigitalXBanner,
    digitalXBannerSize,
    digitalXBannerQty: numXBannerQty,
    digitalXBannerStand,
    optDigitalBanner,
    digitalBannerSize,
    digitalBannerQty: numBannerQty,
    optDigitalNameplate,
    digitalNameplateQty: numNameplateQty,
    quantity: numQuantity,
    pages: numTotalPages,
    coverPaper,
    innerPaper,
    customPrices: {
      digitalCoverDesignPrice: coverDesignPrice,
      digitalInnerEditPrice: innerEditPrice,
      digitalInnerPrintPrice: colorPrintPrice,
      digitalBWPrintPrice: bwPrintPrice,
      digitalBindingPrice: bindingPrice,
      digitalXBannerDesignPrice: xbannerDesignPrice,
      digitalXBannerMakePrice: xbannerMakePrice,
      digitalBannerDesignPrice: bannerDesignPrice,
      digitalBannerMakePrice: bannerMakePrice,
      digitalNameplateDesignPrice: nameplateDesignPrice,
      digitalNameplateMakePrice: nameplateMakePrice
    },
    items,
    subTotal: supplyPrice,
    supplyPrice,
    vat,
    grandTotal
  };
}

export function calculateQuotation(params) {
  const type = params.type || '옵셋';
  
  if (type === '경인쇄') {
    return calculateKyung(params);
  } else if (type === '디지털') {
    return calculateDigital(params);
  } else {
    return calculateOffset(params);
  }
}
