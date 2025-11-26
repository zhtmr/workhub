import { Table } from './ddlParser';

export interface ErdRelationship {
  from: string;
  to: string;
  fromColumn: string;
  toColumn: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
}

function sanitizeTableName(name: string): string {
  // Mermaid ERD에서 사용할 수 있도록 테이블명 정제
  // 점, 특수문자를 언더스코어로 변환
  return name.replace(/[.\s-]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

export function generateMermaidERD(tables: Table[]): string {
  let mermaidCode = 'erDiagram\n';
  
  // 테이블 정의
  tables.forEach(table => {
    const sanitizedTableName = sanitizeTableName(table.name);
    mermaidCode += `  ${sanitizedTableName} {\n`;
    
    table.columns.forEach(column => {
      // 데이터 타입 정제 (괄호와 특수문자 제거하여 간단하게)
      let type = column.dataType.toUpperCase()
        .replace(/\([^)]*\)/g, '') // 크기 정보 제거
        .replace(/\[\]/g, '_ARRAY') // 배열 표시
        .substring(0, 20); // 길이 제한
      
      let modifiers = [];
      
      if (column.isPrimaryKey) modifiers.push('PK');
      if (column.isForeignKey) modifiers.push('FK');
      if (!column.nullable) modifiers.push('NOT NULL');
      if (column.key === 'UQ') modifiers.push('UNIQUE');
      
      const modifierStr = modifiers.length > 0 ? ` "${modifiers.join(', ')}"` : '';
      // 주석에서 따옴표 제거 (Mermaid 파싱 에러 방지)
      const cleanComment = column.comment ? column.comment.replace(/['"]/g, '') : '';
      const commentStr = cleanComment ? ` "${cleanComment}"` : '';
      
      mermaidCode += `    ${type} ${column.name}${modifierStr}${commentStr}\n`;
    });
    
    mermaidCode += '  }\n';
  });
  
  // 관계 정의
  const relationships = extractRelationships(tables);
  relationships.forEach(rel => {
    // Mermaid ERD 관계 표기
    // ||--o{ : one to many
    // }o--|| : many to one
    // ||--|| : one to one
    
    let relationSymbol = '||--o{';
    if (rel.type === 'many-to-one') {
      relationSymbol = '}o--||';
    } else if (rel.type === 'one-to-one') {
      relationSymbol = '||--||';
    }
    
    const fromTable = sanitizeTableName(rel.from);
    const toTable = sanitizeTableName(rel.to);
    
    mermaidCode += `  ${fromTable} ${relationSymbol} ${toTable} : "${rel.fromColumn} to ${rel.toColumn}"\n`;
  });
  
  return mermaidCode;
}

export function extractRelationships(tables: Table[]): ErdRelationship[] {
  const relationships: ErdRelationship[] = [];
  
  tables.forEach(table => {
    table.foreignKeys.forEach(fk => {
      relationships.push({
        from: table.name,
        to: fk.references.table,
        fromColumn: fk.column,
        toColumn: fk.references.column,
        type: 'many-to-one' // 기본값, 추후 개선 가능
      });
    });
  });
  
  return relationships;
}

export function generateTextERD(tables: Table[]): string {
  let text = '=== 테이블 관계도 (ERD) ===\n\n';
  
  tables.forEach(table => {
    text += `📊 ${table.name}`;
    if (table.comment) {
      text += ` - ${table.comment}`;
    }
    text += '\n';
    
    // Primary Keys
    const pkColumns = table.columns.filter(c => c.isPrimaryKey);
    if (pkColumns.length > 0) {
      text += `   🔑 PK: ${pkColumns.map(c => c.name).join(', ')}\n`;
    }
    
    // Foreign Keys
    const fkColumns = table.columns.filter(c => c.isForeignKey);
    if (fkColumns.length > 0) {
      text += `   🔗 FK:\n`;
      fkColumns.forEach(col => {
        if (col.references) {
          text += `      - ${col.name} → ${col.references.table}.${col.references.column}\n`;
        }
      });
    }
    
    text += '\n';
  });
  
  // 관계 요약
  const relationships = extractRelationships(tables);
  if (relationships.length > 0) {
    text += '=== 테이블 간 관계 ===\n\n';
    relationships.forEach(rel => {
      text += `${rel.from}.${rel.fromColumn} ──> ${rel.to}.${rel.toColumn}\n`;
    });
  }
  
  return text;
}
