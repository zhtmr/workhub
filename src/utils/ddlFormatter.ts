import { Table } from './ddlParser';

export interface FormattedDDL {
  original: string;
  formatted: string;
  tables: Table[];
}

/**
 * DDL을 정렬하고 포맷팅합니다
 * 1. 외래키 의존성 순서로 테이블 정렬 (참조되는 테이블이 먼저)
 * 2. 각 테이블 내 컬럼 정렬 (PK -> FK -> 일반 컬럼)
 * 3. 가독성 향상을 위한 포맷팅
 */
export function formatAndSortDDL(tables: Table[], dbType: 'mysql' | 'postgresql' = 'postgresql'): string {
  // 의존성 순서로 테이블 정렬
  const sortedTables = sortTablesByDependency(tables);
  
  let formatted = '';
  
  sortedTables.forEach((table, index) => {
    if (index > 0) {
      formatted += '\n\n';
    }
    
    // 테이블 주석 (있는 경우)
    if (table.comment && dbType === 'postgresql') {
      formatted += `-- ${table.comment}\n`;
    }
    
    formatted += `CREATE TABLE ${table.name} (\n`;
    
    // 컬럼 정렬: PK -> FK -> 일반 컬럼 (알파벳순)
    const sortedColumns = sortColumns(table.columns);
    
    const columnLines: string[] = [];
    
    sortedColumns.forEach((column) => {
      let line = `    ${column.name.padEnd(25)} ${column.dataType.padEnd(20)}`;
      
      if (!column.nullable) {
        line += ' NOT NULL';
      }
      
      if (column.defaultValue) {
        // 기본값이 너무 길면 줄바꿈
        if (column.defaultValue.length > 50) {
          line += ` DEFAULT\n        ${column.defaultValue}`;
        } else {
          line += ` DEFAULT ${column.defaultValue}`;
        }
      }
      
      if (column.isPrimaryKey && dbType === 'postgresql') {
        line += '\n        CONSTRAINT pk_' + table.name + '_' + column.name + ' PRIMARY KEY';
      }
      
      if (column.references && dbType === 'postgresql') {
        line += `\n        CONSTRAINT fk_${table.name}_${column.name}\n`;
        line += `            REFERENCES ${column.references.table}(${column.references.column})`;
      }
      
      columnLines.push(line);
    });
    
    formatted += columnLines.join(',\n');
    
    // 복합 PRIMARY KEY (컬럼 레벨이 아닌 테이블 레벨)
    if (table.primaryKeys.length > 1) {
      formatted += ',\n    CONSTRAINT pk_' + table.name + '\n';
      formatted += `        PRIMARY KEY (${table.primaryKeys.join(', ')})`;
    }
    
    formatted += '\n);\n';
    
    // PostgreSQL 스타일 컬럼 주석
    if (dbType === 'postgresql') {
      sortedColumns.forEach((column) => {
        if (column.comment) {
          formatted += `\nCOMMENT ON COLUMN ${table.name}.${column.name} IS '${column.comment}';`;
        }
      });
      
      if (table.comment) {
        formatted += `\nCOMMENT ON TABLE ${table.name} IS '${table.comment}';`;
      }
    }
  });
  
  return formatted;
}

/**
 * 외래키 의존성을 고려하여 테이블 정렬
 * 참조되는 테이블이 먼저 오도록 정렬 (위상 정렬)
 */
function sortTablesByDependency(tables: Table[]): Table[] {
  const sorted: Table[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  // 테이블명으로 빠른 조회를 위한 맵
  const tableMap = new Map<string, Table>();
  tables.forEach(t => tableMap.set(t.name, t));
  
  function visit(tableName: string) {
    if (visited.has(tableName)) return;
    if (visiting.has(tableName)) {
      // 순환 참조 발견 - 그냥 추가
      return;
    }
    
    visiting.add(tableName);
    
    const table = tableMap.get(tableName);
    if (table) {
      // 이 테이블이 참조하는 다른 테이블들을 먼저 방문
      table.foreignKeys.forEach(fk => {
        if (fk.references.table !== tableName) { // 자기 참조 제외
          visit(fk.references.table);
        }
      });
      
      visiting.delete(tableName);
      visited.add(tableName);
      sorted.push(table);
    }
  }
  
  // 모든 테이블 방문
  tables.forEach(table => {
    if (!visited.has(table.name)) {
      visit(table.name);
    }
  });
  
  return sorted;
}

/**
 * 컬럼 정렬: PK -> FK -> 일반 컬럼 (각 그룹 내에서는 알파벳순)
 */
function sortColumns(columns: any[]): any[] {
  const pkColumns = columns.filter(c => c.isPrimaryKey);
  const fkColumns = columns.filter(c => c.isForeignKey && !c.isPrimaryKey);
  const normalColumns = columns.filter(c => !c.isPrimaryKey && !c.isForeignKey);
  
  // 각 그룹 내에서 이름순 정렬
  pkColumns.sort((a, b) => a.name.localeCompare(b.name));
  fkColumns.sort((a, b) => a.name.localeCompare(b.name));
  normalColumns.sort((a, b) => a.name.localeCompare(b.name));
  
  return [...pkColumns, ...fkColumns, ...normalColumns];
}

/**
 * DDL 텍스트를 정리합니다
 * - 빈 줄 제거
 * - 들여쓰기 정규화
 * - 주석 정리
 */
export function cleanupDDLText(ddlText: string): string {
  // 여러 개의 연속된 빈 줄을 하나로
  let cleaned = ddlText.replace(/\n{3,}/g, '\n\n');
  
  // 앞뒤 공백 제거
  cleaned = cleaned.trim();
  
  // 각 라인의 앞뒤 공백 정리
  const lines = cleaned.split('\n').map(line => line.trimEnd());
  
  return lines.join('\n');
}
