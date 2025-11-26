import * as XLSX from 'xlsx';
import { Table, Column } from './ddlParser';

// 키 타입 계산 (PK, FK 등 조합)
function getKeyType(column: Column): string {
  const keys: string[] = [];
  if (column.key) keys.push(column.key);
  if (column.isForeignKey) keys.push('FK');
  return keys.join(', ');
}

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
