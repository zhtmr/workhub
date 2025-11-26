export interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  key: string;
  defaultValue: string;
  comment: string;
}

export interface Table {
  name: string;
  comment: string;
  columns: Column[];
}

export function parseDDL(ddlText: string): Table[] {
  const tables: Table[] = [];
  
  // CREATE TABLE 문들을 찾기
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)(?:\s*COMMENT\s*=?\s*['"](.*?)['"])?/gi;
  
  let match;
  while ((match = createTableRegex.exec(ddlText)) !== null) {
    const tableName = match[1];
    const columnsText = match[2];
    const tableComment = match[3] || '';
    
    const columns = parseColumns(columnsText);
    
    tables.push({
      name: tableName,
      comment: tableComment,
      columns
    });
  }
  
  return tables;
}

function parseColumns(columnsText: string): Column[] {
  const columns: Column[] = [];
  
  // 각 라인을 처리
  const lines = columnsText.split('\n').map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // 제약조건 라인은 스킵 (PRIMARY KEY, FOREIGN KEY, INDEX 등)
    if (line.toUpperCase().match(/^\s*(PRIMARY\s+KEY|FOREIGN\s+KEY|INDEX|KEY|UNIQUE\s+KEY|CONSTRAINT)/)) {
      continue;
    }
    
    // 컬럼 정보 파싱
    const columnMatch = line.match(/[`"]?(\w+)[`"]?\s+([^\s,]+)([^,]*)/i);
    if (!columnMatch) continue;
    
    const columnName = columnMatch[1];
    const dataType = columnMatch[2];
    const rest = columnMatch[3] || '';
    
    // NULL 여부 확인
    const nullable = !rest.toUpperCase().includes('NOT NULL');
    
    // 키 타입 확인
    let key = '';
    if (rest.toUpperCase().includes('PRIMARY KEY')) {
      key = 'PK';
    } else if (rest.toUpperCase().includes('AUTO_INCREMENT')) {
      key = 'AI';
    }
    
    // 기본값 확인
    let defaultValue = '';
    const defaultMatch = rest.match(/DEFAULT\s+([^\s,]+)/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[1].replace(/['"]/g, '');
    }
    
    // 주석 확인
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
      comment
    });
  }
  
  return columns;
}
