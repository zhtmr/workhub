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
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"]?(\w+)[`"]?\.)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)(?:\s*(?:COMMENT\s*=?\s*['"]([^'"]*?)['"]|;))?/gi;
  
  let match;
  while ((match = createTableRegex.exec(ddlText)) !== null) {
    const schema = match[1];
    const tableName = match[2] || match[1]; // 스키마가 없으면 match[1]이 테이블명
    const columnsText = match[3] || match[2];
    const tableComment = match[4] || match[3] || '';
    
    const { columns, primaryKeys, foreignKeys } = parseColumns(columnsText, dbType);
    
    tables.push({
      name: tableName,
      comment: tableComment,
      columns,
      primaryKeys,
      foreignKeys
    });
  }
  
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
  const foreignKeyRegex = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/gi;
  let fkMatch;
  while ((fkMatch = foreignKeyRegex.exec(columnsText)) !== null) {
    const column = fkMatch[1].trim().replace(/[`"]/g, '');
    const refTable = fkMatch[2];
    const refColumn = fkMatch[3].trim().replace(/[`"]/g, '');
    
    foreignKeys.push({
      column,
      references: {
        table: refTable,
        column: refColumn
      }
    });
  }
  
  // 각 라인을 처리
  const lines = columnsText.split('\n').map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // 제약조건 라인은 스킵
    if (line.toUpperCase().match(/^\s*(PRIMARY\s+KEY|FOREIGN\s+KEY|INDEX|KEY|UNIQUE\s+KEY|CONSTRAINT|CHECK)/)) {
      continue;
    }
    
    // 컬럼 정보 파싱
    const columnMatch = line.match(/[`"]?(\w+)[`"]?\s+([^\s,]+)([^,]*)/i);
    if (!columnMatch) continue;
    
    const columnName = columnMatch[1];
    let dataType = columnMatch[2];
    const rest = columnMatch[3] || '';
    
    // 데이터 타입에서 크기 정보 포함
    const sizeMatch = rest.match(/^\s*\(([^)]+)\)/);
    if (sizeMatch) {
      dataType += sizeMatch[0];
    }
    
    // NULL 여부 확인
    const nullable = !rest.toUpperCase().includes('NOT NULL');
    
    // 키 타입 확인
    let key = '';
    const isPrimaryKey = primaryKeys.includes(columnName) || 
                        rest.toUpperCase().includes('PRIMARY KEY');
    
    if (isPrimaryKey) {
      key = 'PK';
    } else if (rest.toUpperCase().includes('AUTO_INCREMENT') || 
               rest.toUpperCase().includes('SERIAL') ||
               rest.toUpperCase().includes('BIGSERIAL')) {
      key = 'AI';
    } else if (rest.toUpperCase().includes('UNIQUE')) {
      key = 'UQ';
    }
    
    // 외래키 확인
    const isForeignKey = foreignKeys.some(fk => fk.column === columnName);
    const fkInfo = foreignKeys.find(fk => fk.column === columnName);
    
    // 인라인 REFERENCES 파싱 (PostgreSQL 스타일)
    const inlineRefMatch = rest.match(/REFERENCES\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/i);
    let references = fkInfo?.references;
    
    if (inlineRefMatch) {
      references = {
        table: inlineRefMatch[1],
        column: inlineRefMatch[2].trim().replace(/[`"]/g, '')
      };
      if (!isForeignKey) {
        foreignKeys.push({
          column: columnName,
          references
        });
      }
    }
    
    // 기본값 확인
    let defaultValue = '';
    const defaultMatch = rest.match(/DEFAULT\s+([^\s,]+)/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[1].replace(/['"]/g, '');
    }
    
    // 주석 확인 (MySQL, PostgreSQL 모두 지원)
    let comment = '';
    const commentMatch = rest.match(/COMMENT\s+['"](.*?)['"]/i);
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
  // ALTER TABLE ... ADD FOREIGN KEY 파싱
  const alterFKRegex = /ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+ADD\s+(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/gi;
  
  let match;
  while ((match = alterFKRegex.exec(ddlText)) !== null) {
    const tableName = match[1];
    const column = match[2].trim().replace(/[`"]/g, '');
    const refTable = match[3];
    const refColumn = match[4].trim().replace(/[`"]/g, '');
    
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
