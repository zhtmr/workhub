import { Table } from './ddlParser';

export interface ErdRelationship {
  from: string;
  to: string;
  fromColumns: string[];  // 복합키 FK 지원
  toColumns: string[];    // 복합키 FK 지원
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
}

function sanitizeTableName(name: string): string {
  // Mermaid ERD에서 사용할 수 있도록 테이블명 정제
  // 점, 특수문자를 언더스코어로 변환
  return name.replace(/[.\s-]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

function sanitizeColumnName(name: string): string {
  // 컬럼명에서 특수문자 제거 (Mermaid 파싱 오류 방지)
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function sanitizeString(str: string): string {
  // 문자열에서 Mermaid 파싱에 문제가 되는 문자 제거
  return str.replace(/['"{}|\\]/g, '').replace(/\s+/g, ' ').trim();
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
        .replace(/[^A-Z0-9_]/g, '') // 특수문자 제거
        .substring(0, 20); // 길이 제한

      // 타입이 비어있으면 기본값
      if (!type) type = 'VARCHAR';

      // 컬럼명 정제
      const colName = sanitizeColumnName(column.name);

      let modifiers = [];
      if (column.isPrimaryKey) modifiers.push('PK');
      if (column.isForeignKey) modifiers.push('FK');

      const modifierStr = modifiers.length > 0 ? ` "${modifiers.join(',')}"` : '';

      mermaidCode += `    ${type} ${colName}${modifierStr}\n`;
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
    const fromColStr = sanitizeString(rel.fromColumns.join('_'));
    const toColStr = rel.toColumns.length > 0 ? sanitizeString(rel.toColumns.join('_')) : 'PK';

    mermaidCode += `  ${fromTable} ${relationSymbol} ${toTable} : "${fromColStr}_to_${toColStr}"\n`;
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
        fromColumns: fk.columns,
        toColumns: fk.references.columns,
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
          const refColStr = col.references.columns.length > 0
            ? col.references.columns.join(', ')
            : 'PK';
          text += `      - ${col.name} → ${col.references.table}.${refColStr}\n`;
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
      const fromColStr = rel.fromColumns.join(', ');
      const toColStr = rel.toColumns.length > 0 ? rel.toColumns.join(', ') : 'PK';
      text += `${rel.from}.${fromColStr} ──> ${rel.to}.${toColStr}\n`;
    });
  }
  
  return text;
}

// React Flow 노드/엣지 타입
export interface ErdNode {
  id: string;
  type: 'tableNode';
  position: { x: number; y: number };
  data: {
    tableName: string;
    columns: {
      name: string;
      type: string;
      isPK: boolean;
      isFK: boolean;
    }[];
  };
}

export interface ErdEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type: 'smoothstep';
  animated?: boolean;
}

/**
 * React Flow용 노드와 엣지 생성
 */
export function generateReactFlowElements(tables: Table[]): { nodes: ErdNode[]; edges: ErdEdge[] } {
  const nodes: ErdNode[] = [];
  const edges: ErdEdge[] = [];

  // 그리드 레이아웃으로 노드 배치
  const cols = Math.ceil(Math.sqrt(tables.length));
  const nodeWidth = 280;
  const nodeHeight = 200;
  const gapX = 100;
  const gapY = 80;

  tables.forEach((table, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    nodes.push({
      id: table.name,
      type: 'tableNode',
      position: {
        x: col * (nodeWidth + gapX),
        y: row * (nodeHeight + gapY)
      },
      data: {
        tableName: table.name,
        columns: table.columns.map(col => ({
          name: col.name,
          type: col.dataType,
          isPK: col.isPrimaryKey,
          isFK: col.isForeignKey
        }))
      }
    });
  });

  // 관계를 엣지로 변환
  const relationships = extractRelationships(tables);
  relationships.forEach((rel, index) => {
    edges.push({
      id: `edge-${index}`,
      source: rel.from,
      target: rel.to,
      type: 'smoothstep',
      animated: true,
      label: `${rel.fromColumns.join(', ')} → ${rel.toColumns.length > 0 ? rel.toColumns.join(', ') : 'PK'}`
    });
  });

  return { nodes, edges };
}
