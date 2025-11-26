import { Table } from './ddlParser';

export interface FormattedDDL {
  original: string;
  formatted: string;
  tables: Table[];
}

/**
 * DDL을 포맷팅합니다 (원본 순서 유지)
 */
export function formatDDL(tables: Table[], dbType: 'mysql' | 'postgresql' = 'postgresql'): string {
  let formatted = '';

  tables.forEach((table, index) => {
    if (index > 0) {
      formatted += '\n\n';
    }

    // 테이블 주석 (있는 경우)
    if (table.comment && dbType === 'postgresql') {
      formatted += `-- ${table.comment}\n`;
    }

    formatted += `CREATE TABLE ${table.name} (\n`;

    const columnLines: string[] = [];

    // 원본 순서 유지
    table.columns.forEach((column) => {
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
        const refColStr = column.references.columns.length > 0
          ? column.references.columns.join(', ')
          : '';  // 컬럼 생략 시 빈 문자열
        line += `\n        CONSTRAINT fk_${table.name}_${column.name}\n`;
        line += refColStr
          ? `            REFERENCES ${column.references.table}(${refColStr})`
          : `            REFERENCES ${column.references.table}`;
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
      table.columns.forEach((column) => {
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
