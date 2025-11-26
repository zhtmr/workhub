import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedColumn {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "unknown";
}

export interface ParsedData {
  columns: ParsedColumn[];
  rows: Record<string, unknown>[];
  fileName: string;
  rowCount: number;
}

/**
 * CSV 문자열을 파싱합니다.
 */
export function parseCSV(csvContent: string, fileName: string): ParsedData {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows = result.data as Record<string, unknown>[];
  const headers = result.meta.fields || [];

  const columns = headers.map((header) => ({
    key: header,
    label: header,
    type: inferColumnType(rows, header),
  }));

  return {
    columns,
    rows,
    fileName,
    rowCount: rows.length,
  };
}

/**
 * Excel 파일(ArrayBuffer)을 파싱합니다.
 */
export function parseExcel(buffer: ArrayBuffer, fileName: string): ParsedData {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  if (jsonData.length === 0) {
    return {
      columns: [],
      rows: [],
      fileName,
      rowCount: 0,
    };
  }

  const headers = Object.keys(jsonData[0]);
  const columns = headers.map((header) => ({
    key: header,
    label: header,
    type: inferColumnType(jsonData, header),
  }));

  return {
    columns,
    rows: jsonData,
    fileName,
    rowCount: jsonData.length,
  };
}

/**
 * File 객체를 파싱합니다. (CSV 또는 Excel)
 */
export async function parseFile(file: File): Promise<ParsedData> {
  const fileName = file.name;
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    return parseCSV(text, fileName);
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    return parseExcel(buffer, fileName);
  }

  throw new Error(`지원하지 않는 파일 형식입니다: .${extension}`);
}

/**
 * 컬럼의 데이터 타입을 추론합니다.
 */
function inferColumnType(
  rows: Record<string, unknown>[],
  columnKey: string
): ParsedColumn["type"] {
  const sampleSize = Math.min(rows.length, 100);
  const typeCount: Record<string, number> = {
    string: 0,
    number: 0,
    boolean: 0,
    date: 0,
    unknown: 0,
  };

  for (let i = 0; i < sampleSize; i++) {
    const value = rows[i][columnKey];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (typeof value === "number") {
      typeCount.number++;
    } else if (typeof value === "boolean") {
      typeCount.boolean++;
    } else if (typeof value === "string") {
      if (isDateString(value)) {
        typeCount.date++;
      } else if (!isNaN(Number(value)) && value.trim() !== "") {
        typeCount.number++;
      } else {
        typeCount.string++;
      }
    } else {
      typeCount.unknown++;
    }
  }

  // 가장 많이 나온 타입 반환
  let maxType: ParsedColumn["type"] = "string";
  let maxCount = 0;

  for (const [type, count] of Object.entries(typeCount)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as ParsedColumn["type"];
    }
  }

  return maxType;
}

/**
 * 문자열이 날짜 형식인지 확인합니다.
 */
function isDateString(value: string): boolean {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO format
  ];

  return datePatterns.some((pattern) => pattern.test(value));
}

/**
 * 숫자형 컬럼만 필터링합니다.
 */
export function getNumericColumns(columns: ParsedColumn[]): ParsedColumn[] {
  return columns.filter((col) => col.type === "number");
}

/**
 * 컬럼의 값을 숫자 배열로 추출합니다.
 */
export function extractNumericValues(
  rows: Record<string, unknown>[],
  columnKey: string
): number[] {
  return rows
    .map((row) => {
      const value = row[columnKey];
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      }
      return null;
    })
    .filter((v): v is number => v !== null);
}
