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
      // 숨김 해제: hidden 속성 제거
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
  const { type, size, customerName, title, dateStr, quantity, pages, discountRate = 85, kyungDiscount = 3500, overheadRate = 10, profitRate = 20, optEpoxy = false, optFoil = false } = params;

  let filename = '';
  if (type === '경인쇄') {
    filename = size === '10절' ? '경인쇄 10절.xlsx' : '경인쇄 16절.xlsx';
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
  } else {
    // 옵셋 (최신 수정 템플릿 기준)
    sheetXml = updateCellInSheetXml(sheetXml, 'G10', numQuantity, false);
    sheetXml = updateCellInSheetXml(sheetXml, 'L13', numPages, false);

    // B20, B21: 항목 명칭 변경 ('표지 디자인', '내지 조판비')
    sheetXml = updateCellInSheetXml(sheetXml, 'B20', '표지 디자인', true);
    sheetXml = updateCellInSheetXml(sheetXml, 'B21', '내지 조판비', true);

    // G24, G25: 인쇄 단위 변경 ('대' -> '판')
    sheetXml = updateCellInSheetXml(sheetXml, 'G24', '판', true);
    sheetXml = updateCellInSheetXml(sheetXml, 'G25', '판', true);

    // L18: H12 셀을 참조하도록 수식 설정 (=H12)
    sheetXml = updateCellFormulaInSheetXml(sheetXml, 'L18', 'H12');

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
