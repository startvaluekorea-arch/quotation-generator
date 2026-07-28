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
  const { size, quantity, pages, discountRate = 75, kyungDiscount = 3500 } = params;

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
    { name: '표지 (4색, 단면)', qty: g16, unitPrice: d16, amount: round(i16), note: `아트250g, ${discountRate}% 할인적용` },
    { name: `내지 (1색, 양면)${discountNote}`, qty: g17, unitPrice: d17, amount: round(i17), note: `미색80g, ${discountRate}% 할인적용` },
    { name: '마스터판 및 기타', qty: pages, unitPrice: 500, amount: round(i18), note: `${pages}P * 500` }
  ];

  const subTotal = items.reduce((acc, cur) => acc + cur.amount, 0); // I28 = SUM(I16:J27)
  const totalMargin = round(subTotal * 1.0); // I29 = ROUND(I28 * D29, 0)
  const truncation = getTruncation(totalMargin); // I30 = VALUE(RIGHT(I29,3))
  const supplyPrice = totalMargin - truncation; // I31 = I29 - I30
  const vat = round(supplyPrice * 0.1); // I32 = I31 * 0.1
  const grandTotal = supplyPrice + vat; // I33 = I31 + I32

  return {
    type: '경인쇄',
    size,
    discountRate,
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
 * 옵셋 인쇄 (10절 / 16절) 견적 계산 - 최신 수정 템플릿 기준 (27/28행 단가 40만원 반영)
 */
export function calculateOffset(params) {
  const { size, quantity, pages, discountRate = 85, overheadRate = 10, profitRate = 20, optEpoxy = false, optFoil = false } = params;

  let f18, h18, f19, h19;

  if (size === '10절') {
    // 10절
    f18 = roundUp((quantity / 4 + 250) / 500, 1);
    h18 = 155500;
    f19 = (roundUp(pages / 16, 1) * (quantity + 250)) / 500;
    h19 = 51090;
  } else {
    // 16절
    f18 = roundUp((quantity / 8 + 250) / 500, 1);
    h18 = 223850;
    f19 = (roundUp(pages / 32, 1) * (quantity + 250)) / 500;
    h19 = 73550;
  }

  const j18 = round(f18 * h18); // 용지대(표지)
  const j19 = round(f19 * h19); // 용지대(내지)

  // 20행 표지 디자인
  const f20 = 1;
  const h20 = 266000;
  const j20 = f20 * h20;

  // 21행 내지 조판비
  const f21 = pages;
  const h21 = round(10050 * 1.4);
  const j21 = round(f21 * h21);

  // 22행 인쇄판비(표지)
  const f22 = 4;
  const h22 = 14000;
  const j22 = f22 * h22;

  // 23행 인쇄판비(내지)
  const f23 = roundUp(pages / 16, 0) * 4;
  const h23 = h22;
  const j23 = f23 * h23;

  // 24행 인쇄(표지)
  const f24 = 4;
  const h24 = h22;
  const j24 = f24 * h24;

  // 25행 인쇄(내지)
  const f25 = f23;
  const h25 = h24;
  const j25 = f25 * h25;

  // 26행 무선제본
  const f26 = 1;
  const h26 = 250000;
  const j26 = f26 * h26;

  // 27행 에폭시 (후가공) - 400,000원
  const f27 = optEpoxy ? 1 : 0;
  const h27 = 400000;
  const j27 = f27 * h27;

  // 28행 박인쇄 (후가공) - 400,000원
  const f28 = optFoil ? 1 : 0;
  const h28 = 400000;
  const j28 = f28 * h28;

  // 30행 코팅
  const f30 = roundUp(f18, 0);
  const h30 = 180000;
  const j30 = f30 * h30;

  const items = [
    { name: '용지대 (표지 아트250g)', qty: f18, unit: 'R', unitPrice: h18, amount: j18 },
    { name: '용지대 (내지 미색80g)', qty: round(f19, 2), unit: 'R', unitPrice: h19, amount: j19 },
    { name: '표지 디자인', qty: f20, unit: '식', unitPrice: h20, amount: j20 },
    { name: '내지 조판비', qty: f21, unit: 'P', unitPrice: h21, amount: j21 },
    { name: '인쇄판비 (표지 4도)', qty: f22, unit: '판', unitPrice: h22, amount: j22 },
    { name: '인쇄판비 (내지)', qty: f23, unit: '판', unitPrice: h23, amount: j23 },
    { name: '인쇄 (표지)', qty: f24, unit: '판', unitPrice: h24, amount: j24 },
    { name: '인쇄 (내지)', qty: f25, unit: '판', unitPrice: h25, amount: j25 },
    { name: '무선제본', qty: f26, unit: '식', unitPrice: h26, amount: j26 }
  ];

  if (optEpoxy) {
    items.push({ name: '에폭시 (후가공)', qty: f27, unit: '식', unitPrice: h27, amount: j27 });
  }
  if (optFoil) {
    items.push({ name: '박인쇄 (후가공)', qty: f28, unit: '식', unitPrice: h28, amount: j28 });
  }

  items.push({ name: '코팅비', qty: f30, unit: 'R', unitPrice: h30, amount: j30 });

  const subTotal = items.reduce((acc, cur) => acc + cur.amount, 0); // J31 = SUM(J18:K30)
  const overhead = round(subTotal * (overheadRate / 100)); // J32 = J31 * C32
  const profit = round((subTotal + overhead - j18 - j19) * (profitRate / 100)); // J33 = (J31 + J32 - J18 - J19) * C33
  const rawSubTotal = subTotal + overhead + profit; // J34 = SUM(J31:K33)

  const discountRatio = discountRate / 100;
  const discountedTotal = round(rawSubTotal * discountRatio); // J35 = ROUND(J34 * G35, 0)
  const truncation = getTruncation(discountedTotal); // J36 = VALUE(RIGHT(J35, 3))
  const supplyPrice = round(discountedTotal - truncation); // J37 = ROUND(J35 - J36, 0)
  const vat = round(supplyPrice * 0.1); // J38 = J37 * 0.1
  const grandTotal = supplyPrice + vat; // J39 = J37 + J38

  return {
    type: '옵셋',
    size,
    discountRate,
    overheadRate,
    profitRate,
    optEpoxy,
    optFoil,
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
