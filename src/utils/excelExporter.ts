import ExcelJS from 'exceljs';
import { Table, Column } from './ddlParser';
import { ExportMetadata } from '@/types/excel';

// 데이터 타입에서 길이 추출
function extractLength(dataType: string): string {
  const match = dataType.match(/\((\d+(?:,\d+)?)\)/);
  return match ? match[1] : '-';
}

// 데이터 타입에서 기본 타입만 추출
function extractBaseType(dataType: string): string {
  return dataType.replace(/\(.*\)/, '').toLowerCase();
}

// 표지 시트 업데이트
function updateCoverSheet(sheet: ExcelJS.Worksheet, metadata: ExportMetadata): void {
  // 시스템명 (A10 - 병합된 셀)
  sheet.getCell('A10').value = metadata.systemName;

  // 문서정보 (B33-G36 영역)
  sheet.getCell('C33').value = '테이블정의서';
  sheet.getCell('G33').value = metadata.author;
  sheet.getCell('C34').value = metadata.documentNumber || '';
  sheet.getCell('C35').value = metadata.author;
  sheet.getCell('C36').value = metadata.createdDate || '';
  sheet.getCell('E36').value = metadata.version || 'v1.0';
}

// 개정이력 시트 업데이트
function updateRevisionHistorySheet(sheet: ExcelJS.Worksheet, metadata: ExportMetadata): void {
  // 첫 번째 데이터 행 (A3)
  sheet.getCell('A3').value = 1;
  sheet.getCell('C3').value = '최초작성';
  sheet.getCell('D3').value = metadata.createdDate || '';
  sheet.getCell('F3').value = metadata.author;
}

// 테이블 목록 시트 업데이트
function updateTableListSheet(
  sheet: ExcelJS.Worksheet,
  tables: Table[],
  metadata: ExportMetadata
): void {
  tables.forEach((table, index) => {
    const rowNumber = index + 3; // A3부터 시작
    sheet.getCell(`A${rowNumber}`).value = index + 1;
    sheet.getCell(`C${rowNumber}`).value = metadata.schemaName;
    sheet.getCell(`D${rowNumber}`).value = table.name;
    sheet.getCell(`F${rowNumber}`).value = table.comment || '';
  });
}

// 테이블 시트 업데이트
function updateTableSheet(
  sheet: ExcelJS.Worksheet,
  table: Table,
  metadata: ExportMetadata
): void {
  // 헤더 정보 업데이트 (A2-J5 영역)
  // 시스템명
  sheet.getCell('C2').value = ` ${metadata.systemName}`;
  // 작성일
  sheet.getCell('G2').value = ` ${metadata.createdDate}`;
  // 데이터베이스명
  sheet.getCell('C3').value = ` ${metadata.databaseName}`;
  // 스키마명
  sheet.getCell('G3').value = ` ${metadata.schemaName}`;
  // 테이블명
  sheet.getCell('C4').value = ` ${table.name}`;
  // 신규/변경여부
  sheet.getCell('G4').value = ' Y';
  // 테이블 설명
  sheet.getCell('C5').value = table.comment || '';

  // 컬럼 데이터 입력 (A7부터)
  table.columns.forEach((column, index) => {
    const rowNumber = index + 7;
    const isPK = column.key === 'PK' || column.key === 'PRI';
    const isFK = column.isForeignKey;
    const hasAutoIncrement = column.defaultValue?.toLowerCase().includes('auto') ||
      column.dataType.toLowerCase().includes('serial');

    sheet.getCell(`A${rowNumber}`).value = index + 1;
    sheet.getCell(`C${rowNumber}`).value = column.name;
    sheet.getCell(`D${rowNumber}`).value = extractBaseType(column.dataType);
    sheet.getCell(`E${rowNumber}`).value = extractLength(column.dataType);
    sheet.getCell(`F${rowNumber}`).value = isPK ? 'Y' : '-';
    sheet.getCell(`G${rowNumber}`).value = isFK ? 'Y' : '-';
    sheet.getCell(`H${rowNumber}`).value = column.nullable ? 'Y' : 'N';
    sheet.getCell(`I${rowNumber}`).value = hasAutoIncrement ? 'auto' : (column.defaultValue || '');
    sheet.getCell(`J${rowNumber}`).value = column.comment || '';
  });
}

// 템플릿 기반 엑셀 내보내기 (서식 유지)
export async function exportToExcelWithTemplate(
  tables: Table[],
  metadata: ExportMetadata,
  filename: string = 'table_definition.xlsx'
): Promise<void> {
  try {
    // 1. 템플릿 파일 로드
    const response = await fetch('/templates/table_definition_template.xlsx');
    if (!response.ok) {
      throw new Error('템플릿 파일을 찾을 수 없습니다.');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. ExcelJS로 워크북 파싱
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. 표지 시트 업데이트
    const coverSheet = workbook.getWorksheet('표지');
    if (coverSheet) {
      updateCoverSheet(coverSheet, metadata);
    }

    // 4. 개정이력 시트 업데이트
    const revisionSheet = workbook.getWorksheet('개정이력');
    if (revisionSheet) {
      updateRevisionHistorySheet(revisionSheet, metadata);
    }

    // 5. 테이블 목록 시트 업데이트
    const tableListSheet = workbook.getWorksheet('테이블 설명');
    if (tableListSheet) {
      updateTableListSheet(tableListSheet, tables, metadata);
    }

    // 6. 템플릿 테이블 시트 가져오기 및 복사용 데이터 저장
    const templateTableSheet = workbook.getWorksheet('user_notifications');

    // 7. 각 테이블별 시트 생성
    if (templateTableSheet) {
      // 템플릿 시트 데이터를 임시 저장
      const templateData: {
        columns: { width?: number }[];
        rows: { height?: number; cells: { value: ExcelJS.CellValue; style?: Partial<ExcelJS.Style> }[] }[];
        merges: string[];
      } = {
        columns: [],
        rows: [],
        merges: []
      };

      // 열 너비 저장
      if (templateTableSheet.columns) {
        templateTableSheet.columns.forEach((col) => {
          templateData.columns.push({ width: col?.width });
        });
      }

      // 행/셀 데이터 저장
      templateTableSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowData: { height?: number; cells: { value: ExcelJS.CellValue; style?: Partial<ExcelJS.Style> }[] } = {
          height: row.height,
          cells: []
        };
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // 배열 인덱스 맞추기
          while (rowData.cells.length < colNumber - 1) {
            rowData.cells.push({ value: null });
          }
          rowData.cells.push({
            value: cell.value,
            style: cell.style ? JSON.parse(JSON.stringify(cell.style)) : undefined
          });
        });
        // 배열 인덱스 맞추기 (rowNumber - 1)
        while (templateData.rows.length < rowNumber - 1) {
          templateData.rows.push({ cells: [] });
        }
        templateData.rows.push(rowData);
      });

      // 병합 정보 저장
      const merges = templateTableSheet.model?.merges;
      if (merges && Array.isArray(merges)) {
        templateData.merges = [...merges];
      }

      // 템플릿 시트 삭제 (먼저 삭제해야 같은 이름 시트 생성 가능)
      workbook.removeWorksheet(templateTableSheet.id);

      // 각 테이블별 시트 생성
      for (const table of tables) {
        const sheetName = table.name.replace(/[\\/*?[\]:]/g, '_').substring(0, 31);
        const newSheet = workbook.addWorksheet(sheetName);

        // 열 너비 복원
        templateData.columns.forEach((col, index) => {
          if (col.width) {
            newSheet.getColumn(index + 1).width = col.width;
          }
        });

        // 행/셀 데이터 복원
        templateData.rows.forEach((rowData, rowIndex) => {
          const newRow = newSheet.getRow(rowIndex + 1);
          if (rowData.height) {
            newRow.height = rowData.height;
          }
          rowData.cells.forEach((cellData, colIndex) => {
            const newCell = newRow.getCell(colIndex + 1);
            newCell.value = cellData.value;
            if (cellData.style) {
              newCell.style = cellData.style;
            }
          });
        });

        // 병합 복원
        templateData.merges.forEach((merge) => {
          try {
            newSheet.mergeCells(merge);
          } catch {
            // 병합 실패 시 무시
          }
        });

        // 데이터 업데이트
        updateTableSheet(newSheet, table, metadata);
      }
    }

    // 8. 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
}

// 기존 간단한 엑셀 내보내기 (호환성 유지 - xlsx 라이브러리 사용)
export async function exportToExcelSimple(
  tables: Table[],
  metadata: ExportMetadata,
  filename: string = 'table_definition.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  tables.forEach(table => {
    const sheet = workbook.addWorksheet(table.name.substring(0, 31));

    // 헤더
    sheet.addRow(['테이블명', table.name]);
    sheet.addRow(['테이블 설명', table.comment || '']);
    sheet.addRow([]);
    sheet.addRow(['컬럼명', '데이터타입', 'NULL 허용', '키', '기본값', '설명']);

    // 컬럼 데이터
    table.columns.forEach(column => {
      const keys: string[] = [];
      if (column.key) keys.push(column.key);
      if (column.isForeignKey) keys.push('FK');

      sheet.addRow([
        column.name,
        column.dataType,
        column.nullable ? 'Y' : 'N',
        keys.join(', '),
        column.defaultValue || '',
        column.comment || ''
      ]);
    });

    // 열 너비
    sheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 10 },
      { width: 8 },
      { width: 15 },
      { width: 30 }
    ];
  });

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
