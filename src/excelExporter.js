import JSZip from 'jszip';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * sheet1.xml 내의 특정 셀Ref(예: 'B4', 'A5', 'G10')에 값(value)을 주입
 */
function updateCellInSheetXml(sheetXml, cellRef, newValue, isString = false) {
  // Self-closing cell (<c ... r="cellRef" ... />)을 표준 닫는 태그(<c ...></c>) 형태로 정규화
  const selfClosingRegex = new RegExp(`(<c [^>]*r="${cellRef}"[^>]*)/>`, 's');
  if (selfClosingRegex.test(sheetXml)) {
    sheetXml = sheetXml.replace(selfClosingRegex, `$1></c>`);
  }

  const cellRegex = new RegExp(`(<c [^>]*r="${cellRef}"[^>]*>)(.*?)(</c>)`, 's');
  const match = sheetXml.match(cellRegex);

  if (match) {
    let openTag = match[1];
    let content = match[2];
    let closeTag = match[3];

    if (isString) {
      openTag = openTag.replace('t="s"', 't="inlineStr"');
      if (!openTag.includes('t="inlineStr"')) {
        openTag = openTag.replace('<c ', '<c t="inlineStr" ');
      }
      content = `<is><t>${escapeXml(newValue)}</t></is>`;
    } else {
      openTag = openTag.replace(/t="(s|inlineStr)"/, '');
      if (content.includes('<v>')) {
        content = content.replace(/<v>[^<]*<\/v>/, `<v>${newValue}</v>`);
      } else {
        content = `<v>${newValue}</v>` + content;
      }
    }
    return sheetXml.replace(cellRegex, `${openTag}${content}${closeTag}`);
  }
  return sheetXml;
}

/**
 * sheet1.xml 내의 특정 셀Ref의 수식(<f>...</f>)을 새 수식으로 업데이트
 */
function updateCellFormulaInSheetXml(sheetXml, cellRef, newFormula) {
  const selfClosingRegex = new RegExp(`(<c [^>]*r="${cellRef}"[^>]*)/>`, 's');
  if (selfClosingRegex.test(sheetXml)) {
    sheetXml = sheetXml.replace(selfClosingRegex, `$1></c>`);
  }

  const cellRegex = new RegExp(`(<c [^>]*r="${cellRef}"[^>]*>)(.*?)(</c>)`, 's');
  const match = sheetXml.match(cellRegex);

  if (match) {
    let openTag = match[1];
    let content = match[2];
    let closeTag = match[3];

    openTag = openTag.replace(/t="(s|inlineStr)"/, '');

    if (content.includes('<f')) {
      content = content.replace(/<f[^>]*>.*?<\/f>/, `<f>${escapeXml(newFormula)}</f>`);
    } else {
      content = `<f>${escapeXml(newFormula)}</f>` + content;
    }
    content = content.replace(/<v>[^<]*<\/v>/, '');
    return sheetXml.replace(cellRegex, `${openTag}${content}${closeTag}`);
  }
  return sheetXml;
}

/**
 * sheet1.xml 내의 특정 행(rowNum)의 숨김(hidden="1") 여부를 제어
 */
function setRowHiddenInSheetXml(sheetXml, rowNum, isHidden) {
  const rowRegex = new RegExp(`(<row [^>]*r="${rowNum}"[^>]*>)`, 's');
  const match = sheetXml.match(rowRegex);

  if (match) {
    let openTag = match[1];
    if (isHidden) {
      if (!openTag.includes('hidden=')) {
        openTag = openTag.replace('<row ', '<row hidden="1" ');
      } else {
        openTag = openTag.replace(/hidden="[^"]*"/, 'hidden="1"');
      }
    } else {
      openTag = openTag.replace(/\s*hidden="[^"]*"/, '');
    }
    return sheetXml.replace(rowRegex, openTag);
  }
  return sheetXml;
}

/**
 * styles.xml 내의 특정 styleIndex xf 태그에 상하좌우 가운데 정렬(<alignment horizontal="center" vertical="center"/>)과 맑은고딕 폰트를 적용
 */
function setCellCenterAlignmentInStylesXml(stylesXml, styleIndex, targetFontId = null) {
  if (!stylesXml) return stylesXml;
  const cellXfsMatch = stylesXml.match(/(<cellXfs[^>]*>)(.*?)(<\/cellXfs>)/s);
  if (!cellXfsMatch) return stylesXml;

  const prefix = cellXfsMatch[1];
  const content = cellXfsMatch[2];
  const suffix = cellXfsMatch[3];

  const parts = content.split(/(?=<xf[\s>])/);

  if (parts[styleIndex]) {
    let targetXf = parts[styleIndex];

    if (!targetXf.includes('applyAlignment=')) {
      targetXf = targetXf.replace('<xf ', '<xf applyAlignment="1" ');
    } else {
      targetXf = targetXf.replace(/applyAlignment="[^"]*"/, 'applyAlignment="1"');
    }

    if (targetFontId !== null) {
      if (targetXf.includes('fontId=')) {
        targetXf = targetXf.replace(/fontId="[^"]*"/, `fontId="${targetFontId}"`);
      }
    }

    const alignTag = '<alignment horizontal="center" vertical="center"/>';
    if (targetXf.includes('<alignment')) {
      targetXf = targetXf.replace(/<alignment[^>]*\/>|<alignment[^>]*>.*?<\/alignment>/s, alignTag);
    } else if (targetXf.includes('/>')) {
      targetXf = targetXf.replace('/>', `>${alignTag}</xf>`);
    } else if (targetXf.includes('</xf>')) {
      targetXf = targetXf.replace('</xf>', `${alignTag}</xf>`);
    }

    parts[styleIndex] = targetXf;
    const newContent = parts.join('');
    return stylesXml.replace(cellXfsMatch[0], `${prefix}${newContent}${suffix}`);
  }
  return stylesXml;
}

function processKyungExcel(sheetXml, params, stylesXml) {
  const {
    size,
    quantity,
    pages,
    discountRate = 80,
    kyungDiscount = 3500,
    kyungCoverType = '컬러표지',
    kyungCoatingType = '무광코팅',
    optKyungCoverDesign = false,
    coverPaper = '아트250',
    innerPaper = '미색80',
    customPrices = {}
  } = params;

  const numQuantity = Number(quantity) || 1;
  const numPages = Number(pages) || 1;
  const numDiscountRate = Number(discountRate) || 80;
  const numKyungDiscount = Number(kyungDiscount) || 0;

  const isColor = kyungCoverType === '컬러표지';
  const isMatte = kyungCoatingType === '무광코팅';

  const colorDegreeStr = isColor ? '4도' : '1도';
  const coatingStr = isMatte ? '무광코팅' : '코팅없음';
  const c16Text = `${colorDegreeStr}, ${coatingStr}`;

  let coverQty;
  if (size === '10절') {
    if (isColor && isMatte) coverQty = 20;
    else if (isColor && !isMatte) coverQty = 15;
    else if (!isColor && isMatte) coverQty = 12.5;
    else coverQty = 7.5;
  } else {
    // 16절
    if (isColor && isMatte) coverQty = 18;
    else if (isColor && !isMatte) coverQty = 13;
    else if (!isColor && isMatte) coverQty = 10.5;
    else coverQty = 5.5;
  }

  sheetXml = updateCellInSheetXml(sheetXml, 'J10', numPages, false);
  sheetXml = updateCellInSheetXml(sheetXml, 'F12', numQuantity, false);

  // B16: "표지" 텍스트 고정 주입
  sheetXml = updateCellInSheetXml(sheetXml, 'B16', '표지', true);

  // C16: 표지 인쇄도수/코팅 텍스트 주입
  sheetXml = updateCellInSheetXml(sheetXml, 'C16', c16Text, true);

  // G16: 표지 수량 주입
  sheetXml = updateCellInSheetXml(sheetXml, 'G16', Number(coverQty).toFixed(1), false);

  sheetXml = updateCellInSheetXml(sheetXml, 'D17', numKyungDiscount, false);

  if (coverPaper) {
    sheetXml = updateCellInSheetXml(sheetXml, 'K16', coverPaper, true);
  }
  if (innerPaper) {
    sheetXml = updateCellInSheetXml(sheetXml, 'K17', innerPaper, true);
  }

  const discountText = ` * ${numDiscountRate} %`;
  sheetXml = updateCellInSheetXml(sheetXml, 'H16', discountText, true);
  sheetXml = updateCellInSheetXml(sheetXml, 'H17', discountText, true);

  let i16Formula, i17Formula;
  if (size === '10절') {
    i16Formula = `(D16+((E16/10)*183))*G16*${numDiscountRate}%`;
    i17Formula = `((12150-D17)+((F17/10)*157))*G17*${numDiscountRate}%`;
  } else {
    i16Formula = `(D16+((E16/10)*183))*G16*${numDiscountRate}%`;
    i17Formula = `((8180-D17)+((F17/10)*101))*G17*${numDiscountRate}%`;
  }

  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'I16', i16Formula);
  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'I17', i17Formula);

  if (optKyungCoverDesign) {
    const kyungCoverDesignPrice = customPrices.kyungCoverDesignPrice !== undefined ? Number(customPrices.kyungCoverDesignPrice) : 300000;
    sheetXml = setRowHiddenInSheetXml(sheetXml, 18, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'D18', kyungCoverDesignPrice, false);
  } else {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 18, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'D18', 0, false);
  }

  if (stylesXml) {
    // C16 (styleIndex: 49) 및 C17 (styleIndex: 50) 셀 스타일 상하좌우 가운데 정렬 & 맑은고딕(fontId: 11) 적용
    stylesXml = setCellCenterAlignmentInStylesXml(stylesXml, 49, 11);
    stylesXml = setCellCenterAlignmentInStylesXml(stylesXml, 50, 11);
  }

  return { sheetXml, stylesXml };
}

function processDigitalExcel(sheetXml, params) {
  const {
    size,
    quantity,
    pages,
    colorPages,
    optDigitalCoverType = false,
    optDigitalInnerEdit = false,
    optDigitalXBanner = false,
    digitalXBannerSize = '600x1800mm',
    digitalXBannerQty = 1,
    optDigitalBanner = false,
    digitalBannerSize = '4000x900mm',
    digitalBannerQty = 1,
    optDigitalNameplate = false,
    digitalNameplateQty = 1,
    customPrices = {}
  } = params;

  const numQuantity = Number(quantity) || 1;
  const numPages = Number(pages) || 1;
  const numColorPages = colorPages !== undefined ? Number(colorPages) : numPages;
  const numXBannerQty = Number(digitalXBannerQty) || 1;
  const numBannerQty = Number(digitalBannerQty) || 1;
  const numNameplateQty = Number(digitalNameplateQty) || 1;

  const colorPrintPrice = customPrices.digitalInnerPrintPrice !== undefined ? Number(customPrices.digitalInnerPrintPrice) : 300;
  const bwPrintPrice = customPrices.digitalBWPrintPrice !== undefined ? Number(customPrices.digitalBWPrintPrice) : 80;

  sheetXml = updateCellInSheetXml(sheetXml, 'E14', numQuantity, false);
  sheetXml = updateCellInSheetXml(sheetXml, 'G14', numPages, false);
  sheetXml = updateCellInSheetXml(sheetXml, 'K14', size, true);

  sheetXml = updateCellInSheetXml(sheetXml, 'E17', numColorPages, false);
  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'F17', 'E14');

  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'E18', 'G14-E17');
  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'F18', 'E14');

  if (numColorPages <= 0) {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 17, true);
  } else {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 17, false);
  }

  if (numColorPages >= numPages) {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 18, true);
  } else {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 18, false);
  }

  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'E19', 'E14');

  if (optDigitalCoverType) {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 15, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'E15', 1, false);
    sheetXml = setRowHiddenInSheetXml(sheetXml, 29, true);
  } else {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 15, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'E15', 0, false);
    sheetXml = setRowHiddenInSheetXml(sheetXml, 29, false);
  }

  if (optDigitalInnerEdit) {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 16, false);
    sheetXml = updateCellFormulaInSheetXml(sheetXml, 'E16', 'G14');
    sheetXml = setRowHiddenInSheetXml(sheetXml, 30, true);
  } else {
    sheetXml = setRowHiddenInSheetXml(sheetXml, 16, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'E16', 0, false);
    sheetXml = setRowHiddenInSheetXml(sheetXml, 30, false);
  }

  if (optDigitalXBanner) {
    const digitalXBannerStand = params.digitalXBannerStand || '거치대포함';
    const defaultXBannerMakePrice = digitalXBannerStand === '거치대미포함' ? 40000 : 60000;
    const xbannerMakePrice = customPrices.digitalXBannerMakePrice !== undefined ? Number(customPrices.digitalXBannerMakePrice) : defaultXBannerMakePrice;

    for (let r = 20; r <= 22; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'E21', 1, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'E20', digitalXBannerSize, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'G20', numXBannerQty, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'K22', digitalXBannerStand, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'G22', xbannerMakePrice, false);
    for (let r = 31; r <= 33; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
  } else {
    for (let r = 20; r <= 22; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'E21', 0, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'G20', 0, false);
    for (let r = 31; r <= 33; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
  }

  if (optDigitalBanner) {
    const defaultBannerMakePrice = 50000;
    const bannerMakePrice = customPrices.digitalBannerMakePrice !== undefined ? Number(customPrices.digitalBannerMakePrice) : defaultBannerMakePrice;

    for (let r = 23; r <= 25; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'E24', 1, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'E23', digitalBannerSize, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'G23', numBannerQty, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'G25', bannerMakePrice, false);
    for (let r = 34; r <= 36; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
  } else {
    for (let r = 23; r <= 25; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'E24', 0, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'G23', 0, false);
    for (let r = 34; r <= 36; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
  }

  if (optDigitalNameplate) {
    const defaultNameplateMakePrice = 4500;
    const nameplateMakePrice = customPrices.digitalNameplateMakePrice !== undefined ? Number(customPrices.digitalNameplateMakePrice) : defaultNameplateMakePrice;

    for (let r = 26; r <= 28; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'E27', 1, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'G26', numNameplateQty, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'G28', nameplateMakePrice, false);
    for (let r = 37; r <= 39; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
  } else {
    for (let r = 26; r <= 28; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'E27', 0, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'G26', 0, false);
    for (let r = 37; r <= 39; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
  }

  if (customPrices.digitalCoverDesignPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'G15', Number(customPrices.digitalCoverDesignPrice), false);
  }
  if (customPrices.digitalInnerEditPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'G16', Number(customPrices.digitalInnerEditPrice), false);
  }
  sheetXml = updateCellInSheetXml(sheetXml, 'G17', colorPrintPrice, false);
  sheetXml = updateCellInSheetXml(sheetXml, 'G18', bwPrintPrice, false);

  if (customPrices.digitalBindingPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'G19', Number(customPrices.digitalBindingPrice), false);
  }
  if (customPrices.digitalXBannerDesignPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'G21', Number(customPrices.digitalXBannerDesignPrice), false);
  }
  if (customPrices.digitalBannerDesignPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'G24', Number(customPrices.digitalBannerDesignPrice), false);
  }
  if (customPrices.digitalNameplateDesignPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'G27', Number(customPrices.digitalNameplateDesignPrice), false);
  }

  return sheetXml;
}

function processOffsetExcel(sheetXml, params) {
  const {
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

  const numQuantity = Number(quantity) || 1;
  const numPages = Number(pages) || 1;
  const numDiscountRate = Number(discountRate) || 85;
  const numOverheadRate = Number(overheadRate) || 10;
  const numProfitRate = Number(profitRate) || 20;

  sheetXml = updateCellInSheetXml(sheetXml, 'G10', numQuantity, false);
  sheetXml = updateCellInSheetXml(sheetXml, 'L13', numPages, false);

  if (coverPaper) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H12', coverPaper, true);
  }
  if (innerPaper) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H13', innerPaper, true);
  }

  sheetXml = updateCellInSheetXml(sheetXml, 'B20', '표지 디자인', true);
  sheetXml = updateCellInSheetXml(sheetXml, 'B21', '내지 조판비', true);

  sheetXml = updateCellInSheetXml(sheetXml, 'G24', '판', true);
  sheetXml = updateCellInSheetXml(sheetXml, 'G25', '판', true);

  sheetXml = updateCellFormulaInSheetXml(sheetXml, 'L18', 'H12');

  if (customPrices.coverPaperPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H18', Number(customPrices.coverPaperPrice), false);
  }
  if (customPrices.innerPaperPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H19', Number(customPrices.innerPaperPrice), false);
  }
  if (customPrices.coverDesignPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H20', Number(customPrices.coverDesignPrice), false);
  }
  if (customPrices.innerTypePrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H21', Number(customPrices.innerTypePrice), false);
  }
  if (customPrices.coverPlatePrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H22', Number(customPrices.coverPlatePrice), false);
  }
  if (customPrices.innerPlatePrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H23', Number(customPrices.innerPlatePrice), false);
  }
  if (customPrices.coverPrintPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H24', Number(customPrices.coverPrintPrice), false);
  }
  if (customPrices.innerPrintPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H25', Number(customPrices.innerPrintPrice), false);
  }
  if (customPrices.bindingPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H26', Number(customPrices.bindingPrice), false);
  }
  if (customPrices.epoxyPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H27', Number(customPrices.epoxyPrice), false);
  }
  if (customPrices.foilPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H28', Number(customPrices.foilPrice), false);
  }
  if (customPrices.coatingPrice !== undefined) {
    sheetXml = updateCellInSheetXml(sheetXml, 'H30', Number(customPrices.coatingPrice), false);
  }

  sheetXml = setRowHiddenInSheetXml(sheetXml, 27, !optEpoxy);
  sheetXml = updateCellInSheetXml(sheetXml, 'F27', optEpoxy ? 1 : 0, false);

  sheetXml = setRowHiddenInSheetXml(sheetXml, 28, !optFoil);
  sheetXml = updateCellInSheetXml(sheetXml, 'F28', optFoil ? 1 : 0, false);

  sheetXml = updateCellInSheetXml(sheetXml, 'C32', numOverheadRate / 100, false);
  sheetXml = updateCellInSheetXml(sheetXml, 'C33', numProfitRate / 100, false);

  const ratio = numDiscountRate / 100;
  sheetXml = updateCellInSheetXml(sheetXml, 'G35', ratio, false);

  return sheetXml;
}

/**
 * 선택된 조건에 맞는 원본 엑셀 템플릿을 읽어 입력을 주입한 후 손상 없이 다운로드
 */
export async function downloadExcelQuotation(params) {
  const {
    type,
    size,
    customerName,
    title,
    dateStr
  } = params;

  let filename = '';
  if (type === '경인쇄') {
    filename = size === '10절' ? '경인쇄 10절.xlsx' : '경인쇄 16절.xlsx';
  } else if (type === '디지털') {
    filename = '디지털.xlsx';
  } else {
    filename = size === '10절' ? '옵셋10절(현재화).xlsx' : '옵셋16절(현재화).xlsx';
  }

  const sampleUrl = `/sample/${encodeURIComponent(filename)}`;

  const response = await fetch(sampleUrl);
  if (!response.ok) {
    throw new Error(`템플릿 파일을 불러올 수 없습니다: ${filename}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  let workbookXml = await zip.file('xl/workbook.xml').async('string');
  let stylesXml = zip.file('xl/styles.xml') ? await zip.file('xl/styles.xml').async('string') : null;

  // 작성일자 (B4)
  if (dateStr) {
    sheetXml = updateCellInSheetXml(sheetXml, 'B4', dateStr, true);
  }

  // 고객명 (A5)
  if (customerName) {
    sheetXml = updateCellInSheetXml(sheetXml, 'A5', customerName, true);
  }

  // 건명/제목 (B10)
  if (title) {
    sheetXml = updateCellInSheetXml(sheetXml, 'B10', title, true);
  }

  // 인쇄방식별 독립 서브 헬퍼 함수로 완전 격리 처리
  if (type === '경인쇄') {
    const res = processKyungExcel(sheetXml, params, stylesXml);
    if (typeof res === 'object' && res.sheetXml) {
      sheetXml = res.sheetXml;
      if (res.stylesXml) stylesXml = res.stylesXml;
    } else {
      sheetXml = res;
    }
  } else if (type === '디지털') {
    sheetXml = processDigitalExcel(sheetXml, params);
  } else {
    sheetXml = processOffsetExcel(sheetXml, params);
  }

  // 수식 셀(<f>...</f>)에 남아있는 이전 캐시값(<v>옛날값</v>) 제거하여 엑셀 오픈 시 재계산 강제
  sheetXml = sheetXml.replace(/(<f[^>]*>.*?<\/f>)\s*<v>[^<]*<\/v>/gs, '$1');

  // xl/workbook.xml 내의 calcPr에 fullCalcOnLoad="1" forceFullCalc="1" 플래그 주입
  if (workbookXml.includes('<calcPr')) {
    workbookXml = workbookXml.replace(/<calcPr([^/>]*)>/g, '<calcPr$1 fullCalcOnLoad="1" forceFullCalc="1">');
    workbookXml = workbookXml.replace(/<calcPr([^/>]*)\/>/g, '<calcPr$1 fullCalcOnLoad="1" forceFullCalc="1"/>');
  } else {
    workbookXml = workbookXml.replace('</workbook>', '<calcPr fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
  }

  // 수정된 xml 저장
  zip.file('xl/worksheets/sheet1.xml', sheetXml);
  zip.file('xl/workbook.xml', workbookXml);
  if (stylesXml) {
    zip.file('xl/styles.xml', stylesXml);
  }

  // 최종 엑셀 바이너리 Blob 생성
  const zipBuffer = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE'
  });

  const downloadUrl = URL.createObjectURL(zipBuffer);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const cleanTitle = (title || '견적서').replace(/[/\\?%*:|"<>]/g, '_');
  const cleanCustomer = (customerName || '고객').replace(/[/\\?%*:|"<>]/g, '_');
  a.download = `견적서_${cleanCustomer}_${cleanTitle}_${type}_${size}.xlsx`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
