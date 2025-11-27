// MyBatis XML Parser
// Sprint 8: MyBatis 매퍼 XML 파싱

export type StatementType = "select" | "insert" | "update" | "delete";

export interface MybatisParameter {
  name: string;
  javaType?: string;
  jdbcType?: string;
  mode?: "IN" | "OUT" | "INOUT";
}

export interface MybatisStatement {
  id: string;
  type: StatementType;
  parameterType?: string;
  resultType?: string;
  resultMap?: string;
  sql: string;
  rawXml: string;
  parameters: MybatisParameter[];
  // 추가 속성
  useGeneratedKeys?: boolean;
  keyProperty?: string;
  keyColumn?: string;
  flushCache?: boolean;
  timeout?: number;
}

export interface MybatisResultMap {
  id: string;
  type: string;
  properties: {
    property: string;
    column: string;
    javaType?: string;
    jdbcType?: string;
    typeHandler?: string;
  }[];
}

export interface MybatisMapper {
  namespace: string;
  statements: MybatisStatement[];
  resultMaps: MybatisResultMap[];
  sqlFragments: Map<string, string>;
}

export interface ParseResult {
  mapper: MybatisMapper | null;
  errors: string[];
  warnings: string[];
}

/**
 * MyBatis XML을 파싱하여 구조화된 데이터로 변환
 */
export function parseMybatisXml(xmlContent: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "text/xml");

    // 파싱 에러 체크
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      return {
        mapper: null,
        errors: [`XML 파싱 오류: ${parseError.textContent}`],
        warnings: [],
      };
    }

    // mapper 루트 엘리먼트 찾기
    const mapperElement = doc.querySelector("mapper");
    if (!mapperElement) {
      return {
        mapper: null,
        errors: ["mapper 엘리먼트를 찾을 수 없습니다."],
        warnings: [],
      };
    }

    const namespace = mapperElement.getAttribute("namespace") || "";

    // SQL fragments 파싱
    const sqlFragments = new Map<string, string>();
    const sqlElements = mapperElement.querySelectorAll("sql");
    sqlElements.forEach((sqlEl) => {
      const id = sqlEl.getAttribute("id");
      if (id) {
        sqlFragments.set(id, getElementText(sqlEl));
      }
    });

    // ResultMap 파싱
    const resultMaps: MybatisResultMap[] = [];
    const resultMapElements = mapperElement.querySelectorAll("resultMap");
    resultMapElements.forEach((rmEl) => {
      const resultMap = parseResultMap(rmEl);
      if (resultMap) {
        resultMaps.push(resultMap);
      }
    });

    // Statement 파싱
    const statements: MybatisStatement[] = [];
    const statementTypes: StatementType[] = ["select", "insert", "update", "delete"];

    statementTypes.forEach((type) => {
      const elements = mapperElement.querySelectorAll(type);
      elements.forEach((el) => {
        const statement = parseStatement(el, type, sqlFragments);
        if (statement) {
          statements.push(statement);
        } else {
          warnings.push(`${type} 문 파싱 실패: id=${el.getAttribute("id")}`);
        }
      });
    });

    return {
      mapper: {
        namespace,
        statements,
        resultMaps,
        sqlFragments,
      },
      errors,
      warnings,
    };
  } catch (error) {
    return {
      mapper: null,
      errors: [`파싱 중 오류 발생: ${error instanceof Error ? error.message : "Unknown error"}`],
      warnings,
    };
  }
}

/**
 * Statement 엘리먼트 파싱
 */
function parseStatement(
  element: Element,
  type: StatementType,
  sqlFragments: Map<string, string>
): MybatisStatement | null {
  const id = element.getAttribute("id");
  if (!id) return null;

  // SQL 추출 및 include 처리
  let sql = getElementText(element);
  sql = resolveIncludes(sql, element, sqlFragments);
  sql = cleanSql(sql);

  // 파라미터 추출
  const parameters = extractParameters(sql);

  // raw XML
  const rawXml = element.outerHTML;

  return {
    id,
    type,
    parameterType: element.getAttribute("parameterType") || undefined,
    resultType: element.getAttribute("resultType") || undefined,
    resultMap: element.getAttribute("resultMap") || undefined,
    sql,
    rawXml,
    parameters,
    useGeneratedKeys: element.getAttribute("useGeneratedKeys") === "true",
    keyProperty: element.getAttribute("keyProperty") || undefined,
    keyColumn: element.getAttribute("keyColumn") || undefined,
    flushCache: element.getAttribute("flushCache") === "true",
    timeout: element.getAttribute("timeout")
      ? parseInt(element.getAttribute("timeout")!, 10)
      : undefined,
  };
}

/**
 * ResultMap 파싱
 */
function parseResultMap(element: Element): MybatisResultMap | null {
  const id = element.getAttribute("id");
  const type = element.getAttribute("type");

  if (!id || !type) return null;

  const properties: MybatisResultMap["properties"] = [];

  // id, result 엘리먼트 파싱
  const idElements = element.querySelectorAll("id, result");
  idElements.forEach((propEl) => {
    const property = propEl.getAttribute("property");
    const column = propEl.getAttribute("column");

    if (property && column) {
      properties.push({
        property,
        column,
        javaType: propEl.getAttribute("javaType") || undefined,
        jdbcType: propEl.getAttribute("jdbcType") || undefined,
        typeHandler: propEl.getAttribute("typeHandler") || undefined,
      });
    }
  });

  return { id, type, properties };
}

/**
 * 엘리먼트의 텍스트 콘텐츠 추출 (동적 SQL 태그 처리)
 */
function getElementText(element: Element): string {
  let text = "";

  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();

      // 동적 SQL 태그 처리
      switch (tagName) {
        case "if":
          text += ` /* IF ${el.getAttribute("test")} */ `;
          text += getElementText(el);
          text += " /* END IF */ ";
          break;
        case "choose":
          text += " /* CHOOSE */ ";
          el.querySelectorAll("when, otherwise").forEach((child) => {
            text += getElementText(child);
          });
          text += " /* END CHOOSE */ ";
          break;
        case "when":
          text += ` /* WHEN ${el.getAttribute("test")} */ `;
          text += getElementText(el);
          break;
        case "otherwise":
          text += " /* OTHERWISE */ ";
          text += getElementText(el);
          break;
        case "foreach":
          text += ` /* FOREACH ${el.getAttribute("collection")} */ `;
          text += getElementText(el);
          text += " /* END FOREACH */ ";
          break;
        case "where":
          text += " WHERE ";
          text += getElementText(el);
          break;
        case "set":
          text += " SET ";
          text += getElementText(el);
          break;
        case "trim":
          text += getElementText(el);
          break;
        case "bind":
          text += ` /* BIND ${el.getAttribute("name")}=${el.getAttribute("value")} */ `;
          break;
        case "include":
          text += ` /* INCLUDE ${el.getAttribute("refid")} */ `;
          break;
        default:
          text += getElementText(el);
      }
    }
  });

  return text;
}

/**
 * include 태그 해결
 */
function resolveIncludes(sql: string, element: Element, sqlFragments: Map<string, string>): string {
  const includeElements = element.querySelectorAll("include");

  includeElements.forEach((includeEl) => {
    const refid = includeEl.getAttribute("refid");
    if (refid) {
      const fragment = sqlFragments.get(refid);
      if (fragment) {
        sql = sql.replace(`/* INCLUDE ${refid} */`, fragment);
      }
    }
  });

  return sql;
}

/**
 * SQL 정리
 */
function cleanSql(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*=\s*/g, " = ")
    .trim();
}

/**
 * 파라미터 추출
 */
function extractParameters(sql: string): MybatisParameter[] {
  const parameters: MybatisParameter[] = [];
  const seen = new Set<string>();

  // #{...} 패턴 매칭
  const paramRegex = /#\{([^}]+)\}/g;
  let match;

  while ((match = paramRegex.exec(sql)) !== null) {
    const paramStr = match[1];
    const param = parseParameterString(paramStr);

    if (param && !seen.has(param.name)) {
      seen.add(param.name);
      parameters.push(param);
    }
  }

  // ${...} 패턴 매칭 (문자열 치환)
  const literalRegex = /\$\{([^}]+)\}/g;
  while ((match = literalRegex.exec(sql)) !== null) {
    const name = match[1].split(",")[0].trim();
    if (!seen.has(name)) {
      seen.add(name);
      parameters.push({ name });
    }
  }

  return parameters;
}

/**
 * 파라미터 문자열 파싱
 * 예: "id,jdbcType=BIGINT" -> { name: "id", jdbcType: "BIGINT" }
 */
function parseParameterString(paramStr: string): MybatisParameter | null {
  const parts = paramStr.split(",").map((p) => p.trim());
  if (parts.length === 0) return null;

  const param: MybatisParameter = { name: parts[0] };

  parts.slice(1).forEach((part) => {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key && value) {
      switch (key.toLowerCase()) {
        case "javatype":
          param.javaType = value;
          break;
        case "jdbctype":
          param.jdbcType = value;
          break;
        case "mode":
          param.mode = value as MybatisParameter["mode"];
          break;
      }
    }
  });

  return param;
}

/**
 * SQL에 실제 파라미터 값 적용
 */
export function substituteParameters(
  sql: string,
  parameters: Record<string, string | number | boolean | null>
): string {
  let result = sql;

  // 1. IF 조건 평가 및 처리
  result = processIfConditions(result, parameters);

  // 2. FOREACH 처리 (배열 파라미터)
  result = processForeach(result, parameters);

  // 3. WHERE 태그 정리 (앞에 오는 AND/OR 제거)
  result = cleanWhereClause(result);

  // 4. 파라미터 값 치환
  Object.entries(parameters).forEach(([name, value]) => {
    const pattern = new RegExp(`#\\{${name}[^}]*\\}`, "g");
    const replacement = formatValue(value);
    result = result.replace(pattern, replacement);
  });

  // 5. 남은 주석 마커 정리
  result = cleanupCommentMarkers(result);

  // 6. 최종 SQL 정리
  result = finalCleanup(result);

  return result;
}

/**
 * IF 조건 평가 및 처리
 */
function processIfConditions(
  sql: string,
  parameters: Record<string, string | number | boolean | null>
): string {
  let result = sql;

  // /* IF condition */ content /* END IF */ 패턴 처리
  const ifPattern = /\/\*\s*IF\s+([^*]+)\s*\*\/\s*([\s\S]*?)\s*\/\*\s*END IF\s*\*\//gi;

  let hasChanges = true;
  let iterations = 0;
  const maxIterations = 10; // 무한 루프 방지

  while (hasChanges && iterations < maxIterations) {
    hasChanges = false;
    iterations++;

    result = result.replace(ifPattern, (match, condition, content) => {
      hasChanges = true;
      const conditionResult = evaluateCondition(condition.trim(), parameters);

      if (conditionResult) {
        // 조건이 참이면 내용 포함 (앞뒤 공백 정리)
        return " " + content.trim() + " ";
      } else {
        // 조건이 거짓이면 내용 제거
        return " ";
      }
    });
  }

  return result;
}

/**
 * MyBatis 조건 평가
 * 예: "cropsId != null and cropsId != ''"
 */
function evaluateCondition(
  condition: string,
  parameters: Record<string, string | number | boolean | null>
): boolean {
  try {
    // 조건을 JavaScript로 변환하여 평가
    let jsCondition = condition;

    // != null 패턴 처리
    jsCondition = jsCondition.replace(/(\w+)\s*!=\s*null/gi, (_, varName) => {
      const value = parameters[varName];
      return value !== null && value !== undefined ? "true" : "false";
    });

    // == null 패턴 처리
    jsCondition = jsCondition.replace(/(\w+)\s*==\s*null/gi, (_, varName) => {
      const value = parameters[varName];
      return value === null || value === undefined ? "true" : "false";
    });

    // != '' 패턴 처리
    jsCondition = jsCondition.replace(/(\w+)\s*!=\s*['"]{2}/gi, (_, varName) => {
      const value = parameters[varName];
      return value !== null && value !== undefined && value !== "" ? "true" : "false";
    });

    // == '' 패턴 처리
    jsCondition = jsCondition.replace(/(\w+)\s*==\s*['"]{2}/gi, (_, varName) => {
      const value = parameters[varName];
      return value === "" ? "true" : "false";
    });

    // 숫자 비교 (예: status == 1)
    jsCondition = jsCondition.replace(/(\w+)\s*==\s*(\d+)/gi, (_, varName, num) => {
      const value = parameters[varName];
      return value === Number(num) ? "true" : "false";
    });

    // 숫자 비교 (예: status != 1)
    jsCondition = jsCondition.replace(/(\w+)\s*!=\s*(\d+)/gi, (_, varName, num) => {
      const value = parameters[varName];
      return value !== Number(num) ? "true" : "false";
    });

    // 문자열 비교 (예: type == 'active')
    jsCondition = jsCondition.replace(/(\w+)\s*==\s*['"]([^'"]+)['"]/gi, (_, varName, str) => {
      const value = parameters[varName];
      return value === str ? "true" : "false";
    });

    // 문자열 비교 (예: type != 'active')
    jsCondition = jsCondition.replace(/(\w+)\s*!=\s*['"]([^'"]+)['"]/gi, (_, varName, str) => {
      const value = parameters[varName];
      return value !== str ? "true" : "false";
    });

    // and / or 처리
    jsCondition = jsCondition.replace(/\s+and\s+/gi, " && ");
    jsCondition = jsCondition.replace(/\s+or\s+/gi, " || ");

    // 남은 변수명을 boolean으로 평가 (truthy check)
    jsCondition = jsCondition.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
      if (match === "true" || match === "false") return match;
      const value = parameters[match];
      return value !== null && value !== undefined && value !== "" ? "true" : "false";
    });

    // 평가
    // eslint-disable-next-line no-eval
    return eval(jsCondition) === true;
  } catch (e) {
    // 평가 실패 시 조건을 참으로 처리 (내용 포함)
    console.warn("Condition evaluation failed:", condition, e);
    return true;
  }
}

/**
 * FOREACH 처리
 */
function processForeach(
  sql: string,
  parameters: Record<string, string | number | boolean | null>
): string {
  // FOREACH는 배열 파라미터가 필요하므로 현재는 주석만 제거
  return sql.replace(/\/\*\s*FOREACH\s+[^*]+\s*\*\//gi, "")
            .replace(/\/\*\s*END FOREACH\s*\*\//gi, "");
}

/**
 * WHERE 절 정리 (앞에 오는 AND/OR 제거)
 */
function cleanWhereClause(sql: string): string {
  // WHERE 다음에 오는 AND/OR 제거
  return sql.replace(/WHERE\s+(AND|OR)\s+/gi, "WHERE ");
}

/**
 * 남은 주석 마커 정리
 */
function cleanupCommentMarkers(sql: string): string {
  return sql
    .replace(/\/\*\s*CHOOSE\s*\*\//gi, "")
    .replace(/\/\*\s*END CHOOSE\s*\*\//gi, "")
    .replace(/\/\*\s*WHEN\s+[^*]+\s*\*\//gi, "")
    .replace(/\/\*\s*OTHERWISE\s*\*\//gi, "")
    .replace(/\/\*\s*BIND\s+[^*]+\s*\*\//gi, "");
}

/**
 * 최종 SQL 정리
 */
function finalCleanup(sql: string): string {
  return sql
    .replace(/\s+/g, " ")           // 여러 공백을 하나로
    .replace(/\s*,\s*/g, ", ")      // 쉼표 주변 정리
    .replace(/\(\s+/g, "(")         // 괄호 안 공백 정리
    .replace(/\s+\)/g, ")")
    .replace(/\s+$/, "")            // 끝 공백 제거
    .replace(/^\s+/, "")            // 시작 공백 제거
    .trim();
}

/**
 * 값 포맷팅 (SQL용)
 */
function formatValue(value: string | number | boolean | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Statement 타입별 아이콘 색상
 */
export function getStatementTypeColor(type: StatementType): string {
  switch (type) {
    case "select":
      return "text-blue-500";
    case "insert":
      return "text-green-500";
    case "update":
      return "text-yellow-500";
    case "delete":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Statement 타입별 배지 색상
 */
export function getStatementTypeBadgeVariant(
  type: StatementType
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "select":
      return "default";
    case "insert":
      return "secondary";
    case "update":
      return "outline";
    case "delete":
      return "destructive";
    default:
      return "outline";
  }
}
