export interface JsonValidationResult {
  valid: boolean;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

/**
 * JSON 문자열을 검증합니다.
 */
export function validateJson(jsonString: string): JsonValidationResult {
  if (!jsonString.trim()) {
    return { valid: false, error: "JSON이 비어있습니다." };
  }

  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (e) {
    const error = e as SyntaxError;
    const match = error.message.match(/at position (\d+)/);
    let errorLine = 1;
    let errorColumn = 1;

    if (match) {
      const position = parseInt(match[1], 10);
      const lines = jsonString.substring(0, position).split("\n");
      errorLine = lines.length;
      errorColumn = lines[lines.length - 1].length + 1;
    }

    return {
      valid: false,
      error: error.message,
      errorLine,
      errorColumn,
    };
  }
}

/**
 * JSON을 파싱합니다. 실패 시 null 반환.
 */
export function parseJson(jsonString: string): unknown | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * JSON을 포맷팅합니다 (들여쓰기 적용).
 */
export function formatJson(jsonString: string, indent: number = 2): string {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, indent);
  } catch {
    return jsonString;
  }
}

/**
 * JSON을 압축합니다 (공백 제거).
 */
export function minifyJson(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return jsonString;
  }
}

/**
 * JSON 값의 타입을 반환합니다.
 */
export function getJsonValueType(
  value: unknown
): "string" | "number" | "boolean" | "null" | "array" | "object" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as "string" | "number" | "boolean" | "object";
}

/**
 * 샘플 JSON을 생성합니다.
 */
export const SAMPLE_JSON = `{
  "name": "WorkHub",
  "version": "1.0.0",
  "description": "통합 업무 시스템",
  "features": [
    "DDL 변환기",
    "Markdown 에디터",
    "데이터 분석"
  ],
  "config": {
    "theme": "dark",
    "language": "ko",
    "autoSave": true
  },
  "stats": {
    "users": 1000,
    "projects": 50,
    "conversions": 12500
  }
}`;
