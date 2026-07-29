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
 * 선택된 조건에 맞는 원본 엑셀 템플릿을 읽어 입력을 주입한 후 손상 없이 다운로드
 */
export async function downloadExcelQuotation(params) {
  const {
    type,
    size,
    customerName,
    title,
    dateStr,
    quantity,
    pages,
    discountRate = 85,
    kyungDiscount = 3500,
    overheadRate = 10,
    profitRate = 20,
    optEpoxy = false,
    optFoil = false,
    optKyungCoverDesign = false,
    coverPaper = '아트250',
    innerPaper = '미색80',
    customPrices = {}
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

  // JSZip으로 원본 엑셀 바이너리를 로드
  const zip = await JSZip.loadAsync(arrayBuffer);

  let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  let workbookXml = await zip.file('xl/workbook.xml').async('string');

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

  const numQuantity = Number(quantity);
  const numPages = Number(pages);
  const numDiscountRate = Number(discountRate);
  const numKyungDiscount = Number(kyungDiscount);
  const numOverheadRate = Number(overheadRate);
  const numProfitRate = Number(profitRate);

  if (type === '경인쇄') {
    // 경인쇄 페이지 및 부수 주입
    sheetXml = updateCellInSheetXml(sheetXml, 'J10', numPages, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'F12', numQuantity, false);

    // G16: 표지 수량 (10절=20, 16절=18)
    const coverQty = size === '10절' ? 20 : 18;
    sheetXml = updateCellInSheetXml(sheetXml, 'G16', coverQty, false);

    // D17: 조판생략 감액 차감 금액
    sheetXml = updateCellInSheetXml(sheetXml, 'D17', numKyungDiscount, false);

    // K16: 표지 종이 종류 (예: 아트250)
    if (coverPaper) {
      sheetXml = updateCellInSheetXml(sheetXml, 'K16', coverPaper, true);
    }

    // K17: 내지 종이 종류 (예: 미색80)
    if (innerPaper) {
      sheetXml = updateCellInSheetXml(sheetXml, 'K17', innerPaper, true);
    }

    // H16, H17: 할인율 곱하는 텍스트 주입 (예: " * 75 %")
    const discountText = ` * ${numDiscountRate} %`;
    sheetXml = updateCellInSheetXml(sheetXml, 'H16', discountText, true);
    sheetXml = updateCellInSheetXml(sheetXml, 'H17', discountText, true);

    // I16, I17: 수식 내의 할인율 퍼센티지 동적 변경
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

    // 18행: 표지디자인 옵션 제어 (선택 시 18행 숨김 해제 및 D18 셀에 표지디자인 단가 입력, 미선택 시 18행 숨김 유지 및 0 입력)
    if (optKyungCoverDesign) {
      const kyungCoverDesignPrice = customPrices.kyungCoverDesignPrice !== undefined ? Number(customPrices.kyungCoverDesignPrice) : 300000;
      sheetXml = setRowHiddenInSheetXml(sheetXml, 18, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'D18', kyungCoverDesignPrice, false);
    } else {
      sheetXml = setRowHiddenInSheetXml(sheetXml, 18, true);
      sheetXml = updateCellInSheetXml(sheetXml, 'D18', 0, false);
    }
  } else if (type === '디지털') {
    const digitalColorType = params.digitalColorType || '컬러';
    const optDigitalCoverType = params.optDigitalCoverType || false;
    const optDigitalInnerEdit = params.optDigitalInnerEdit || false;
    const optDigitalXBanner = params.optDigitalXBanner || false;
    const digitalXBannerSize = params.digitalXBannerSize || '600x1800mm';
    const digitalXBannerQty = Number(params.digitalXBannerQty) || 1;
    const optDigitalBanner = params.optDigitalBanner || false;
    const digitalBannerSize = params.digitalBannerSize || '4000x900mm';
    const digitalBannerQty = Number(params.digitalBannerQty) || 1;
    const optDigitalNameplate = params.optDigitalNameplate || false;
    const digitalNameplateQty = Number(params.digitalNameplateQty) || 1;

    const defaultInnerPrintPrice = digitalColorType === '흑백' ? 80 : 300;
    const innerPrintPrice = customPrices.digitalInnerPrintPrice !== undefined ? Number(customPrices.digitalInnerPrintPrice) : defaultInnerPrintPrice;

    // 디지털 인쇄 부수(G14) 및 페이지수(H14) 주입
    sheetXml = updateCellInSheetXml(sheetXml, 'G14', numQuantity, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'H14', numPages, false);

    // 15행 (책자-표지조판) 옵션 제어
    if (optDigitalCoverType) {
      sheetXml = setRowHiddenInSheetXml(sheetXml, 15, false); // 숨김 해제
      sheetXml = updateCellInSheetXml(sheetXml, 'E15', 1, false); // E15 = 1
      sheetXml = setRowHiddenInSheetXml(sheetXml, 28, true); // 28행 숨김
    } else {
      sheetXml = setRowHiddenInSheetXml(sheetXml, 15, true); // 숨김 유지
      sheetXml = updateCellInSheetXml(sheetXml, 'E15', 0, false);
      sheetXml = setRowHiddenInSheetXml(sheetXml, 28, false); // 28행 숨김 해제
    }

    // 16행 (책자-내지편집) 옵션 제어
    if (optDigitalInnerEdit) {
      sheetXml = setRowHiddenInSheetXml(sheetXml, 16, false); // 숨김 해제
      sheetXml = updateCellFormulaInSheetXml(sheetXml, 'E16', 'H14'); // E16 = H14 셀 참조
      sheetXml = setRowHiddenInSheetXml(sheetXml, 29, true); // 29행 숨김
    } else {
      sheetXml = setRowHiddenInSheetXml(sheetXml, 16, true); // 숨김 유지
      sheetXml = updateCellInSheetXml(sheetXml, 'E16', 0, false);
      sheetXml = setRowHiddenInSheetXml(sheetXml, 29, false); // 29행 숨김 해제
    }

    // 19~21행 (X배너) 옵션 제어
    if (optDigitalXBanner) {
      for (let r = 19; r <= 21; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'E20', 1, false); // E20 = 1
      sheetXml = updateCellInSheetXml(sheetXml, 'E19', digitalXBannerSize, true); // E19 = 크기
      sheetXml = updateCellInSheetXml(sheetXml, 'G19', digitalXBannerQty, false); // G19 = 수량
      for (let r = 30; r <= 32; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true); // 30~32행 숨김
    } else {
      for (let r = 19; r <= 21; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
      sheetXml = updateCellInSheetXml(sheetXml, 'E20', 0, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'G19', 0, false);
      for (let r = 30; r <= 32; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
    }

    // 22~24행 (현수막) 옵션 제어
    if (optDigitalBanner) {
      for (let r = 22; r <= 24; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'E23', 1, false); // E23 = 1
      sheetXml = updateCellInSheetXml(sheetXml, 'E22', digitalBannerSize, true); // E22 = 크기
      sheetXml = updateCellInSheetXml(sheetXml, 'G22', digitalBannerQty, false); // G22 = 수량
      for (let r = 33; r <= 35; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true); // 33~35행 숨김
    } else {
      for (let r = 22; r <= 24; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
      sheetXml = updateCellInSheetXml(sheetXml, 'E23', 0, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'G22', 0, false);
      for (let r = 33; r <= 35; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
    }

    // 25~27행 (명패) 옵션 제어
    if (optDigitalNameplate) {
      for (let r = 25; r <= 27; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'E26', 1, false); // E26 = 1
      sheetXml = updateCellInSheetXml(sheetXml, 'G25', digitalNameplateQty, false); // G25 = 수량
      for (let r = 36; r <= 38; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true); // 36~38행 숨김
    } else {
      for (let r = 25; r <= 27; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, true);
      sheetXml = updateCellInSheetXml(sheetXml, 'E26', 0, false);
      sheetXml = updateCellInSheetXml(sheetXml, 'G25', 0, false);
      for (let r = 36; r <= 38; r++) sheetXml = setRowHiddenInSheetXml(sheetXml, r, false);
    }

    // D17: 내지 인쇄 색상 주입 ('컬러' 또는 '흑백')
    sheetXml = updateCellInSheetXml(sheetXml, 'D17', digitalColorType, true);

    // G17: 내지 인쇄 단가 주입 (컬러=300, 흑백=80 또는 수동 수정 단가)
    sheetXml = updateCellInSheetXml(sheetXml, 'G17', innerPrintPrice, false);

    // 커스텀 단가 주입 (G15: 표지 디자인, G16: 내지 편집, G18: 제본 등)
    if (customPrices.digitalCoverDesignPrice !== undefined) {
      sheetXml = updateCellInSheetXml(sheetXml, 'G15', Number(customPrices.digitalCoverDesignPrice), false);
    }
    if (customPrices.digitalInnerEditPrice !== undefined) {
      sheetXml = updateCellInSheetXml(sheetXml, 'G16', Number(customPrices.digitalInnerEditPrice), false);
    }
    if (customPrices.digitalBindingPrice !== undefined) {
      sheetXml = updateCellInSheetXml(sheetXml, 'G18', Number(customPrices.digitalBindingPrice), false);
    }
  } else {
    // 옵셋 (최신 수정 템플릿 기준)
    sheetXml = updateCellInSheetXml(sheetXml, 'G10', numQuantity, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'L13', numPages, false);

    // H12: 표지 종이 종류 (예: 아트250)
    if (coverPaper) {
      sheetXml = updateCellInSheetXml(sheetXml, 'H12', coverPaper, true);
    }
    // H13: 내지 종이 종류 (예: 미색80)
    if (innerPaper) {
      sheetXml = updateCellInSheetXml(sheetXml, 'H13', innerPaper, true);
    }

    // B20, B21: 항목 명칭 변경 ('표지 디자인', '내지 조판비')
    sheetXml = updateCellInSheetXml(sheetXml, 'B20', '표지 디자인', true);
    sheetXml = updateCellInSheetXml(sheetXml, 'B21', '내지 조판비', true);

    // G24, G25: 인쇄 단위 변경 ('대' -> '판')
    sheetXml = updateCellInSheetXml(sheetXml, 'G24', '판', true);
    sheetXml = updateCellInSheetXml(sheetXml, 'G25', '판', true);

    // L18: H12 셀을 참조하도록 수식 설정 (=H12)
    sheetXml = updateCellFormulaInSheetXml(sheetXml, 'L18', 'H12');

    // 사용자가 수정한 각 항목 단가(H18 ~ H30) 주입
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

    // 27행: 에폭시 옵션 제어 (선택 시 숨김 해제 및 수량 1, 미선택 시 숨김 유지 및 수량 0)
    sheetXml = setRowHiddenInSheetXml(sheetXml, 27, !optEpoxy);
    sheetXml = updateCellInSheetXml(sheetXml, 'F27', optEpoxy ? 1 : 0, false);

    // 28행: 박인쇄 옵션 제어 (선택 시 숨김 해제 및 수량 1, 미선택 시 숨김 유지 및 수량 0)
    sheetXml = setRowHiddenInSheetXml(sheetXml, 28, !optFoil);
    sheetXml = updateCellInSheetXml(sheetXml, 'F28', optFoil ? 1 : 0, false);

    // C32: 일반관리비 비율 (예: 0.10)
    sheetXml = updateCellInSheetXml(sheetXml, 'C32', numOverheadRate / 100, false);

    // C33: 이윤 비율 (예: 0.20)
    sheetXml = updateCellInSheetXml(sheetXml, 'C33', numProfitRate / 100, false);

    // G35: 할인율 / 네고 비율 (예: 0.85)
    const ratio = numDiscountRate / 100;
    sheetXml = updateCellInSheetXml(sheetXml, 'G35', ratio, false);
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
