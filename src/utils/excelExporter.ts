import * as XLSX from 'xlsx';
import { Table, Column } from './ddlParser';
import { ExportMetadata } from '@/types/excel';

// 키 타입 계산 (PK, FK 등 조합)
function getKeyType(column: Column): string {
  const keys: string[] = [];
  if (column.key) keys.push(column.key);
  if (column.isForeignKey) keys.push('FK');
  return keys.join(', ');
}

// 데이터 타입에서 길이 추출
function extractLength(dataType: string): string {
  const match = dataType.match(/\((\d+(?:,\d+)?)\)/);
  return match ? match[1] : '-';
}

// 데이터 타입에서 기본 타입만 추출
function extractBaseType(dataType: string): string {
  return dataType.replace(/\(.*\)/, '').toLowerCase();
}

// 표지 시트 생성
function createCoverSheet(metadata: ExportMetadata): XLSX.WorkSheet {
  const data: (string | null)[][] = [
    // 빈 행들 (상단 여백)
    [null, null, null, null, null, null, null, null],
    // 시스템명 (병합될 영역)
    [metadata.systemName, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    // 테이블정의서 제목
    [null, '테이블정의서', null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    // 문서 정보
    [null, '문   서   명', '테이블정의서', null, null, '작성자', metadata.author, null],
    [null, '문 서 번 호', metadata.documentNumber || '', null, null, null, null, null],
    [null, '작   성   자', metadata.author, null, null, null, null, null],
    [null, '작   성   일', metadata.createdDate || '', '버전', metadata.version || 'v1.0', null, null, null],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 셀 병합 설정
  worksheet['!merges'] = [
    // 시스템명 병합 (A2:H4)
    { s: { r: 1, c: 0 }, e: { r: 3, c: 7 } },
    // 테이블정의서 제목 병합 (B5:G5)
    { s: { r: 4, c: 1 }, e: { r: 4, c: 6 } },
    // 문서정보 영역 병합
    { s: { r: 20, c: 2 }, e: { r: 20, c: 4 } }, // 테이블정의서
    { s: { r: 21, c: 2 }, e: { r: 21, c: 4 } }, // 문서번호
    { s: { r: 22, c: 2 }, e: { r: 22, c: 4 } }, // 작성자
  ];

  // 열 너비 설정
  worksheet['!cols'] = [
    { wch: 5 },   // A
    { wch: 15 },  // B
    { wch: 25 },  // C
    { wch: 10 },  // D
    { wch: 10 },  // E
    { wch: 10 },  // F
    { wch: 20 },  // G
    { wch: 5 },   // H
  ];

  return worksheet;
}

// 개정이력 시트 생성
function createRevisionHistorySheet(metadata: ExportMetadata): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [
    // 헤더
    ['테이블 정의서 개정 이력', null, null, null, null, null],
    ['NO', null, '변경내용', '등록일', null, '등록자'],
    // 첫 번째 행 (최초작성)
    [1, null, '최초작성', metadata.createdDate || '', null, metadata.author],
  ];

  // 빈 행 추가 (40행까지)
  for (let i = 2; i <= 40; i++) {
    data.push([i, null, '', '', null, '']);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 셀 병합 설정
  worksheet['!merges'] = [
    // 헤더 제목 병합 (A1:F1)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    // NO 열 병합 (A:B)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    // 등록일 열 병합 (D:E)
    { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
  ];

  // 데이터 행의 NO 열 병합
  for (let i = 2; i <= 41; i++) {
    worksheet['!merges']!.push({ s: { r: i, c: 0 }, e: { r: i, c: 1 } });
    worksheet['!merges']!.push({ s: { r: i, c: 3 }, e: { r: i, c: 4 } });
  }

  // 열 너비 설정
  worksheet['!cols'] = [
    { wch: 5 },   // A (NO)
    { wch: 5 },   // B (NO 병합)
    { wch: 40 },  // C (변경내용)
    { wch: 12 },  // D (등록일)
    { wch: 12 },  // E (등록일 병합)
    { wch: 15 },  // F (등록자)
  ];

  return worksheet;
}

// 테이블 목록 시트 생성
function createTableListSheet(tables: Table[], metadata: ExportMetadata): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [
    // 헤더
    ['테이블 목록', null, null, null, null, null],
    ['NO', null, '스키마 이름', '테이블 이름', null, '테이블 설명'],
  ];

  // 테이블 목록 추가
  tables.forEach((table, index) => {
    data.push([
      index + 1,
      null,
      metadata.schemaName,
      table.name,
      null,
      table.comment || '',
    ]);
  });

  // 최소 50행까지 빈 행 추가
  const currentRows = data.length;
  for (let i = currentRows; i < 52; i++) {
    data.push([i - 1, null, '', '', null, '']);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 셀 병합 설정
  worksheet['!merges'] = [
    // 헤더 제목 병합 (A1:F1)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    // NO 열 병합 (A:B)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    // 테이블 이름 열 병합 (D:E)
    { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },
  ];

  // 데이터 행의 병합
  for (let i = 2; i < data.length; i++) {
    worksheet['!merges']!.push({ s: { r: i, c: 0 }, e: { r: i, c: 1 } });
    worksheet['!merges']!.push({ s: { r: i, c: 3 }, e: { r: i, c: 4 } });
  }

  // 열 너비 설정
  worksheet['!cols'] = [
    { wch: 5 },   // A (NO)
    { wch: 5 },   // B (NO 병합)
    { wch: 15 },  // C (스키마 이름)
    { wch: 30 },  // D (테이블 이름)
    { wch: 15 },  // E (테이블 이름 병합)
    { wch: 30 },  // F (테이블 설명)
  ];

  return worksheet;
}

// 테이블별 시트 생성
function createTableSheet(table: Table, metadata: ExportMetadata): XLSX.WorkSheet {
  const data: (string | number | null)[][] = [
    // 상단 구분선 역할
    ['\\', null, null, null, null, null, null, null, null, null],
    // 헤더 정보
    ['시스템명', null, ` ${metadata.systemName}`, null, '작성일', null, ` ${metadata.createdDate}`, null, null, null],
    ['데이터베이스명', null, ` ${metadata.databaseName}`, null, '스키마명', null, ` ${metadata.schemaName}`, null, null, null],
    ['테이블명', null, ` ${table.name}`, null, '신규/변경여부', null, ' Y', null, null, null],
    ['테이블 설명', null, table.comment || '', null, null, null, null, null, null, null],
    // 컬럼 헤더
    ['NO', null, '칼럼명', 'TYPE', '길이', 'PK', 'FK', 'NULL', 'DEFAULT', '컬럼설명'],
  ];

  // 컬럼 데이터 추가
  table.columns.forEach((column, index) => {
    const isPK = column.key === 'PK' || column.key === 'PRI';
    const isFK = column.isForeignKey;
    const hasAutoIncrement = column.defaultValue?.toLowerCase().includes('auto') ||
      column.dataType.toLowerCase().includes('serial');

    data.push([
      index + 1,
      null,
      column.name,
      extractBaseType(column.dataType),
      extractLength(column.dataType),
      isPK ? 'Y' : '-',
      isFK ? 'Y' : '-',
      column.nullable ? 'Y' : 'N',
      hasAutoIncrement ? 'auto' : (column.defaultValue || ''),
      column.comment || '',
    ]);
  });

  // 빈 행 추가 (최소 30행까지)
  const currentRows = data.length;
  for (let i = currentRows; i < 35; i++) {
    data.push([null, null, null, null, null, null, null, null, null, null]);
  }

  // 특이사항 영역
  data.push([' 특이사항', null, null, null, null, null, null, null, null, null]);
  data.push([null, null, null, null, null, null, null, null, null, null]);

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 셀 병합 설정
  worksheet['!merges'] = [
    // 상단 구분선 (A1:J1)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    // 시스템명 레이블 (A2:B2)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    // 시스템명 값 (C2:D2)
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } },
    // 작성일 레이블 (E2:F2)
    { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } },
    // 작성일 값 (G2:J2)
    { s: { r: 1, c: 6 }, e: { r: 1, c: 9 } },
    // 데이터베이스명 레이블 (A3:B3)
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    // 데이터베이스명 값 (C3:D3)
    { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
    // 스키마명 레이블 (E3:F3)
    { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } },
    // 스키마명 값 (G3:J3)
    { s: { r: 2, c: 6 }, e: { r: 2, c: 9 } },
    // 테이블명 레이블 (A4:B4)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    // 테이블명 값 (C4:D4)
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
    // 신규/변경여부 레이블 (E4:F4)
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
    // 신규/변경여부 값 (G4:J4)
    { s: { r: 3, c: 6 }, e: { r: 3, c: 9 } },
    // 테이블 설명 레이블 (A5:B5)
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    // 테이블 설명 값 (C5:J5)
    { s: { r: 4, c: 2 }, e: { r: 4, c: 9 } },
    // NO 헤더 (A6:B6)
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    // 특이사항 (마지막 행)
    { s: { r: data.length - 2, c: 0 }, e: { r: data.length - 2, c: 9 } },
  ];

  // 데이터 행의 NO 열 병합
  for (let i = 6; i < 6 + table.columns.length; i++) {
    worksheet['!merges']!.push({ s: { r: i, c: 0 }, e: { r: i, c: 1 } });
  }

  // 열 너비 설정
  worksheet['!cols'] = [
    { wch: 5 },   // A (NO)
    { wch: 5 },   // B (NO 병합)
    { wch: 25 },  // C (칼럼명)
    { wch: 12 },  // D (TYPE)
    { wch: 8 },   // E (길이)
    { wch: 5 },   // F (PK)
    { wch: 5 },   // G (FK)
    { wch: 5 },   // H (NULL)
    { wch: 15 },  // I (DEFAULT)
    { wch: 30 },  // J (컬럼설명)
  ];

  return worksheet;
}

// 표준 포맷 엑셀 내보내기 (4개 시트)
export function exportToExcelWithMetadata(
  tables: Table[],
  metadata: ExportMetadata,
  filename: string = 'table_definition.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // 1. 표지 시트
  const coverSheet = createCoverSheet(metadata);
  XLSX.utils.book_append_sheet(workbook, coverSheet, '표지');

  // 2. 개정이력 시트
  const revisionSheet = createRevisionHistorySheet(metadata);
  XLSX.utils.book_append_sheet(workbook, revisionSheet, '개정이력');

  // 3. 테이블 목록 시트
  const tableListSheet = createTableListSheet(tables, metadata);
  XLSX.utils.book_append_sheet(workbook, tableListSheet, '테이블 설명');

  // 4. 각 테이블별 시트
  tables.forEach(table => {
    const tableSheet = createTableSheet(table, metadata);
    // 시트 이름은 테이블명 (31자 제한, 특수문자 제거)
    const sheetName = table.name
      .replace(/[\\/*?[\]:]/g, '_')
      .substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, tableSheet, sheetName);
  });

  // 파일 다운로드
  XLSX.writeFile(workbook, filename);
}

// 기존 간단한 엑셀 내보내기 (호환성 유지)
export function exportToExcel(tables: Table[], filename: string = 'table_definition.xlsx') {
  const workbook = XLSX.utils.book_new();

  tables.forEach(table => {
    // 각 테이블을 별도의 시트로 생성
    const data = [
      ['테이블명', table.name],
      ['테이블 설명', table.comment],
      [],
      ['컬럼명', '데이터타입', 'NULL 허용', '키', '기본값', '설명']
    ];

    table.columns.forEach(column => {
      data.push([
        column.name,
        column.dataType,
        column.nullable ? 'Y' : 'N',
        getKeyType(column),
        column.defaultValue,
        column.comment
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // 열 너비 설정
    worksheet['!cols'] = [
      { wch: 20 }, // 컬럼명
      { wch: 15 }, // 데이터타입
      { wch: 10 }, // NULL 허용
      { wch: 8 },  // 키
      { wch: 15 }, // 기본값
      { wch: 30 }  // 설명
    ];

    // 시트 이름은 테이블명 (31자 제한)
    const sheetName = table.name.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // 모든 테이블을 하나의 시트에 통합한 버전도 추가
  const allTablesData = [['테이블명', '컬럼명', '데이터타입', 'NULL 허용', '키', '기본값', '설명']];

  tables.forEach(table => {
    table.columns.forEach(column => {
      allTablesData.push([
        table.name,
        column.name,
        column.dataType,
        column.nullable ? 'Y' : 'N',
        getKeyType(column),
        column.defaultValue,
        column.comment
      ]);
    });
  });

  const allTablesSheet = XLSX.utils.aoa_to_sheet(allTablesData);
  allTablesSheet['!cols'] = [
    { wch: 20 }, // 테이블명
    { wch: 20 }, // 컬럼명
    { wch: 15 }, // 데이터타입
    { wch: 10 }, // NULL 허용
    { wch: 8 },  // 키
    { wch: 15 }, // 기본값
    { wch: 30 }  // 설명
  ];

  XLSX.utils.book_append_sheet(workbook, allTablesSheet, '전체통합');

  // 파일 다운로드
  XLSX.writeFile(workbook, filename);
}
