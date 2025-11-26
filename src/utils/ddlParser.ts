export interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  key: string;
  defaultValue: string;
  comment: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface Table {
  name: string;
  comment: string;
  columns: Column[];
  primaryKeys: string[];
  foreignKeys: {
    column: string;
    references: {
      table: string;
      column: string;
    };
  }[];
}

export type DatabaseType = 'mysql' | 'postgresql' | 'auto';

export function parseDDL(ddlText: string, dbType: DatabaseType = 'auto'): Table[] {
  const tables: Table[] = [];
  
  // 데이터베이스 타입 자동 감지
  if (dbType === 'auto') {
    dbType = detectDatabaseType(ddlText);
  }
  
  // CREATE TABLE 문들을 찾기 (MySQL, PostgreSQL 지원)
  // PostgreSQL의 경우 스키마명도 고려
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\)(?:\s*(?:COMMENT\s*=?\s*['"]([^'"]*?)['"]|;))?/gi;
  
  let match;
  while ((match = createTableRegex.exec(ddlText)) !== null) {
    const schema = match[1];
    const tableName = match[2];
    const columnsText = match[3];
    const inlineTableComment = match[4] || '';
    
    const { columns, primaryKeys, foreignKeys } = parseColumns(columnsText, dbType);
    
    // 테이블 이름 (스키마명 제거)
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    
    tables.push({
      name: tableName, // 스키마명 제거한 순수 테이블명
      comment: inlineTableComment,
      columns,
      primaryKeys,
      foreignKeys
    });
  }
  
  // COMMENT ON TABLE/COLUMN 파싱 (DataGrip PostgreSQL 스타일)
  parseCommentOnStatements(ddlText, tables);
  
  // ALTER TABLE에서 외래키 추가 파싱
  parseAlterTableForeignKeys(ddlText, tables, dbType);
  
  return tables;
}

function detectDatabaseType(ddlText: string): DatabaseType {
  const text = ddlText.toUpperCase();
  
  // PostgreSQL 키워드 체크
  if (text.includes('SERIAL') || 
      text.includes('BIGSERIAL') || 
      text.includes('TEXT') ||
      text.includes('BOOLEAN') ||
      text.includes('REFERENCES') && text.includes('::')) {
    return 'postgresql';
  }
  
  // MySQL 키워드 체크
  if (text.includes('AUTO_INCREMENT') || 
      text.includes('ENGINE=') ||
      text.includes('CHARSET=') ||
      text.includes('COLLATE=')) {
    return 'mysql';
  }
  
  // 기본값
  return 'mysql';
}

function parseCommentOnStatements(ddlText: string, tables: Table[]) {
  // COMMENT ON TABLE 파싱
  const tableCommentRegex = /COMMENT\s+ON\s+TABLE\s+(?:(\w+)\.)?(\w+)\s+IS\s+['"]([^'"]+)['"]/gi;
  let match;
  
  while ((match = tableCommentRegex.exec(ddlText)) !== null) {
    const tableName = match[2];
    const comment = match[3];
    
    const table = tables.find(t => t.name === tableName);
    if (table && !table.comment) {
      table.comment = comment;
    }
  }
  
  // COMMENT ON COLUMN 파싱
  const columnCommentRegex = /COMMENT\s+ON\s+COLUMN\s+(?:(\w+)\.)?(\w+)\.(\w+)\s+IS\s+['"]([^'"]+)['"]/gi;
  
  while ((match = columnCommentRegex.exec(ddlText)) !== null) {
    const tableName = match[2];
    const columnName = match[3];
    const comment = match[4];
    
    const table = tables.find(t => t.name === tableName);
    if (table) {
      const column = table.columns.find(c => c.name === columnName);
      if (column && !column.comment) {
        column.comment = comment;
      }
    }
  }
}

/**
 * 컬럼 정의를 콤마로 분리 (괄호 안의 콤마는 무시)
 */
function splitColumnDefinitions(text: string): string[] {
  const definitions: string[] = [];
  let current = '';
  let parenthesesDepth = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '(') {
      parenthesesDepth++;
      current += char;
    } else if (char === ')') {
      parenthesesDepth--;
      current += char;
    } else if (char === ',' && parenthesesDepth === 0) {
      // 최상위 레벨의 콤마 - 컬럼 구분자
      if (current.trim()) {
        definitions.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  // 마지막 컬럼 추가
  if (current.trim()) {
    definitions.push(current.trim());
  }
  
  return definitions;
}

function parseColumns(columnsText: string, dbType: DatabaseType) {
  const columns: Column[] = [];
  const primaryKeys: string[] = [];
  const foreignKeys: {
    column: string;
    references: {
      table: string;
      column: string;
    };
  }[] = [];
  
  // 제약조건을 먼저 파싱
  const primaryKeyMatch = columnsText.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (primaryKeyMatch) {
    const pkColumns = primaryKeyMatch[1].split(',').map(col => 
      col.trim().replace(/[`"]/g, '')
    );
    primaryKeys.push(...pkColumns);
  }
  
  // FOREIGN KEY 파싱
  const foreignKeyRegex = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(([^)]+)\)/gi;
  let fkMatch;
  while ((fkMatch = foreignKeyRegex.exec(columnsText)) !== null) {
    const column = fkMatch[1].trim().replace(/[`"]/g, '');
    const refTable = fkMatch[3] || fkMatch[2]; // 스키마 없으면 fkMatch[2]가 테이블명
    const refColumn = fkMatch[4].trim().replace(/[`"]/g, '');
    
    foreignKeys.push({
      column,
      references: {
        table: refTable,
        column: refColumn
      }
    });
  }
  
  // 컬럼 정의를 콤마로 분리 (여러 줄에 걸친 컬럼 정의 처리)
  const columnDefinitions = splitColumnDefinitions(columnsText);
  
  for (const columnDef of columnDefinitions) {
    // 제약조건 라인은 스킵
    const trimmedDef = columnDef.trim().toUpperCase();
    if (trimmedDef.match(/^(PRIMARY\s+KEY|FOREIGN\s+KEY|INDEX|KEY|UNIQUE\s+KEY|CHECK)\s*\(/)) {
      continue;
    }
    
    // CONSTRAINT만 있는 줄도 스킵 (컬럼 정의가 아닌 경우)
    if (trimmedDef.startsWith('CONSTRAINT') && 
        !trimmedDef.includes('PRIMARY KEY') &&
        !columnDef.trim().match(/^\w+\s+\w+/)) {
      continue;
    }
    
    // 전체 정의를 하나의 문자열로 (줄바꿈과 탭을 공백으로 변환, 여러 공백을 하나로)
    const fullDef = columnDef.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 컬럼 이름과 타입 추출
    const words = fullDef.split(/\s+/);
    
    if (words.length < 2) continue;
    
    const columnName = words[0];
    
    // 데이터 타입 추출 (크기 정보 포함)
    let dataType = words[1];
    let restStart = 2;
    
    // 타입 뒤에 괄호가 있는지 확인 (varchar(50) 등)
    if (words.length > 2 && words[2].startsWith('(')) {
      // 괄호가 분리된 경우 합치기
      let parenPart = words[2];
      let parenDepth = (parenPart.match(/\(/g) || []).length - (parenPart.match(/\)/g) || []).length;
      let idx = 3;
      
      while (parenDepth > 0 && idx < words.length) {
        parenPart += ' ' + words[idx];
        parenDepth += (words[idx].match(/\(/g) || []).length - (words[idx].match(/\)/g) || []).length;
        idx++;
      }
      
      dataType += parenPart;
      restStart = idx;
    } else {
      // 타입에 바로 붙은 괄호 확인
      const typeMatch = fullDef.match(/^\w+\s+(\w+\([^)]+\))/);
      if (typeMatch) {
        dataType = typeMatch[1];
      }
    }
    
    // 배열 타입 처리
    if (restStart < words.length && words[restStart] === '[]') {
      dataType += '[]';
      restStart++;
    } else if (dataType.includes('[]') || fullDef.includes('[]')) {
      if (!dataType.includes('[]')) {
        dataType += '[]';
      }
    }
    
    // NULL 여부 확인
    const nullable = !fullDef.toUpperCase().includes('NOT NULL');
    
    // 키 타입 확인
    let key = '';
    const isPrimaryKey = primaryKeys.includes(columnName) || 
                        fullDef.toUpperCase().includes('PRIMARY KEY');
    
    if (isPrimaryKey) {
      key = 'PK';
    } else if (fullDef.toUpperCase().includes('AUTO_INCREMENT') || 
               fullDef.toUpperCase().includes('SERIAL') ||
               fullDef.toUpperCase().includes('BIGSERIAL')) {
      key = 'AI';
    } else if (fullDef.toUpperCase().includes('UNIQUE')) {
      key = 'UQ';
    }
    
    // 외래키 확인
    const isForeignKey = foreignKeys.some(fk => fk.column === columnName);
    const fkInfo = foreignKeys.find(fk => fk.column === columnName);
    
    // 인라인 REFERENCES 파싱 (PostgreSQL 스타일)
    const inlineRefMatch = fullDef.match(/REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(([^)]+)\)/i);
    let references = fkInfo?.references;
    
    if (inlineRefMatch) {
      const refTable = inlineRefMatch[2] || inlineRefMatch[1];
      const refColumn = inlineRefMatch[3].trim().replace(/[`"]/g, '');
      references = {
        table: refTable,
        column: refColumn
      };
      if (!isForeignKey) {
        foreignKeys.push({
          column: columnName,
          references
        });
      }
    }
    
    // 기본값 확인 (복잡한 표현식 처리 - 중첩 괄호 지원)
    let defaultValue = '';
    const defaultIdx = fullDef.toUpperCase().indexOf('DEFAULT');
    if (defaultIdx !== -1) {
      let start = defaultIdx + 7; // 'DEFAULT'.length
      while (start < fullDef.length && /\s/.test(fullDef[start])) start++;
      
      if (start < fullDef.length) {
        let end = start;
        let parenDepth = 0;
        let inQuote = false;
        let quoteChar = '';
        
        while (end < fullDef.length) {
          const char = fullDef[end];
          
          if (!inQuote && (char === "'" || char === '"')) {
            inQuote = true;
            quoteChar = char;
          } else if (inQuote && char === quoteChar) {
            inQuote = false;
          } else if (!inQuote && char === '(') {
            parenDepth++;
          } else if (!inQuote && char === ')') {
            parenDepth--;
            if (parenDepth < 0) break;
          } else if (!inQuote && parenDepth === 0 && /\s/.test(char)) {
            // 공백이고 괄호 밖이면 다음 키워드 체크
            const remaining = fullDef.substring(end).toUpperCase().trim();
            if (remaining.startsWith('NOT NULL') || 
                remaining.startsWith('NULL') ||
                remaining.startsWith('CONSTRAINT') ||
                remaining.startsWith('REFERENCES') ||
                remaining.startsWith('UNIQUE') ||
                remaining.startsWith('PRIMARY') ||
                remaining.startsWith('CHECK') ||
                remaining.startsWith('COMMENT')) {
              break;
            }
          }
          
          end++;
        }
        
        defaultValue = fullDef.substring(start, end).trim();
        // 앞뒤 따옴표 제거
        if ((defaultValue.startsWith("'") && defaultValue.endsWith("'")) ||
            (defaultValue.startsWith('"') && defaultValue.endsWith('"'))) {
          defaultValue = defaultValue.substring(1, defaultValue.length - 1);
        }
        
        // 너무 긴 경우 축약
        if (defaultValue.length > 50) {
          defaultValue = defaultValue.substring(0, 47) + '...';
        }
      }
    }
    
    // 주석 확인 (MySQL, PostgreSQL 모두 지원)
    let comment = '';
    const commentMatch = fullDef.match(/COMMENT\s+['"](.*?)['"]/i);
    if (commentMatch) {
      comment = commentMatch[1];
    }
    
    columns.push({
      name: columnName,
      dataType,
      nullable,
      key,
      defaultValue,
      comment,
      isPrimaryKey,
      isForeignKey: isForeignKey || !!inlineRefMatch,
      references
    });
  }
  
  return { columns, primaryKeys, foreignKeys };
}

function parseAlterTableForeignKeys(ddlText: string, tables: Table[], dbType: DatabaseType) {
  // ALTER TABLE ... ADD FOREIGN KEY 파싱 (스키마명 처리)
  const alterFKRegex = /ALTER\s+TABLE\s+(?:(\w+)\.)?(\w+)\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:(\w+)\.)?(\w+)\s*\(([^)]+)\)/gi;
  
  let match;
  while ((match = alterFKRegex.exec(ddlText)) !== null) {
    const tableName = match[2]; // 스키마명 제외한 테이블명
    const column = match[3].trim().replace(/[`"]/g, '');
    const refTable = match[5]; // 참조 테이블명 (스키마명 제외)
    const refColumn = match[6].trim().replace(/[`"]/g, '');
    
    const table = tables.find(t => t.name === tableName);
    if (table) {
      table.foreignKeys.push({
        column,
        references: {
          table: refTable,
          column: refColumn
        }
      });
      
      // 컬럼 정보 업데이트
      const col = table.columns.find(c => c.name === column);
      if (col) {
        col.isForeignKey = true;
        col.references = {
          table: refTable,
          column: refColumn
        };
      }
    }
  }
}
