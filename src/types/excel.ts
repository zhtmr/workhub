// Excel 내보내기 관련 타입 정의

export interface ExportMetadata {
  // 필수 필드
  systemName: string;       // 시스템명
  author: string;           // 작성자 (소속 포함)
  databaseName: string;     // 데이터베이스명
  schemaName: string;       // 스키마명

  // 선택 필드 (기본값 있음)
  documentNumber?: string;  // 문서번호 (기본: 자동생성)
  createdDate?: string;     // 작성일 (기본: 오늘 날짜)
  version?: string;         // 버전 (기본: v1.0)
}

export interface RevisionHistory {
  no: number;
  content: string;
  date: string;
  author: string;
}

export interface TableListItem {
  no: number;
  schemaName: string;
  tableName: string;
  tableDescription: string;
}

export interface ColumnDefinition {
  no: number;
  columnName: string;
  dataType: string;
  length: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  defaultValue: string;
  description: string;
}

export interface TableSheetData {
  systemName: string;
  createdDate: string;
  databaseName: string;
  schemaName: string;
  tableName: string;
  isNew: boolean;
  tableDescription: string;
  columns: ColumnDefinition[];
  remarks?: string;
}