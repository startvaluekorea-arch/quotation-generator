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
  const { size, quantity, pages, discountRate = 75, kyungDiscount = 3500, coverPaper = '아트250', innerPaper = '미색80' } = params;

  const d16 = 15370;
  const e16 = quantity > 50 ? quantity - 50 : 0;
  const h16Rate = discountRate / 100;
  
  let g16, d17, baseCost, extraRate, g17;

  if (size === '10절') {
    g16 = 20;
    d17 = Number(kyungDiscount);
    baseCost = 12150 - d17;
    extraRate = 157;
    g17 = pages;
  } else {
    g16 = 18;
    d17 = Number(kyungDiscount);
    baseCost = 8180 - d17;
    extraRate = 101;
    g17 = pages;
  }

  // 16행 (표지 4색, 단면)
  const i16 = (d16 + (e16 / 10) * 183) * g16 * h16Rate;

  // 17행 (내지 1색, 양면)
  const f17 = quantity > 50 ? quantity - 50 : 0;
  const i17 = (baseCost + (f17 / 10) * extraRate) * g17 * h16Rate;

  // 18행 (마스터판)
  const i18 = pages * 500;

  const discountNote = d17 > 0 ? ` (조판생략감액: ${d17.toLocaleString()}원 차감)` : '';

  const items = [
    { key: 'kyungCover', name: `표지 (4색, 단면)`, qty: g16, unitPrice: d16, amount: round(i16), note: `${coverPaper}, ${discountRate}% 할인적용` },
    { key: 'kyungInner', name: `내지 (1색, 양면)${discountNote}`, qty: g17, unitPrice: d17, amount: round(i17), note: `${innerPaper}, ${discountRate}% 할인적용` },
    { key: 'kyungMaster', name: '마스터판 및 기타', qty: pages, unitPrice: 500, amount: round(i18), note: `${pages}P * 500` }
  ];

  const subTotal = items.reduce((acc, cur) => acc + cur.amount, 0);
  const totalMargin = round(subTotal * 1.0);
  const truncation = getTruncation(totalMargin);
  const supplyPrice = totalMargin - truncation;
  const vat = round(supplyPrice * 0.1);
  const grandTotal = supplyPrice + vat;

  return {
    type: '경인쇄',
    size,
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
  const h26 = customPrices.bindingPrice !== undefined ? Number(customPrices.bindingPrice) : 250000;
  const h27 = customPrices.epoxyPrice !== undefined ? Number(customPrices.epoxyPrice) : 400000;
  const h28 = customPrices.foilPrice !== undefined ? Number(customPrices.foilPrice) : 400000;
  const h30 = customPrices.coatingPrice !== undefined ? Number(customPrices.coatingPrice) : 180000;

  const j18 = round(f18 * h18);
  const j19 = round(f19 * h19);

  const f20 = 1;
  const j20 = round(f20 * h20);

  const f21 = pages;
  const j21 = round(f21 * h21);

  const f22 = 4;
  const j22 = round(f22 * h22);

  const f23 = roundUp(pages / 16, 0) * 4;
  const j23 = round(f23 * h23);

  const f24 = 4;
  const j24 = round(f24 * h24);

  const f25 = f23;
  const j25 = round(f25 * h25);

  const f26 = 1;
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
    { key: 'coverPlatePrice', name: '인쇄판비 (표지 4도)', qty: f22, unit: '판', unitPrice: h22, amount: j22, editable: true },
    { key: 'innerPlatePrice', name: '인쇄판비 (내지)', qty: f23, unit: '판', unitPrice: h23, amount: j23, editable: true },
    { key: 'coverPrintPrice', name: '인쇄 (표지)', qty: f24, unit: '판', unitPrice: h24, amount: j24, editable: true },
    { key: 'innerPrintPrice', name: '인쇄 (내지)', qty: f25, unit: '판', unitPrice: h25, amount: j25, editable: true },
    { key: 'bindingPrice', name: '무선제본', qty: f26, unit: '식', unitPrice: h26, amount: j26, editable: true }
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

export function calculateQuotation(params) {
  const { type } = params;
  if (type === '경인쇄') {
    return calculateKyung(params);
  } else {
    return calculateOffset(params);
  }
}
