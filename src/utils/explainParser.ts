// Sprint 9: EXPLAIN Plan Parser
// PostgreSQL, MySQL, Oracle, MSSQL의 실행 계획을 통합 형식으로 파싱

export interface ExplainNode {
  id: string;
  operation: string;
  object?: string; // 테이블명, 인덱스명
  rows?: number; // 예상 행 수
  cost?: number; // 비용
  time?: number; // 실행 시간 (ms)
  width?: number; // 행 너비 (bytes)
  filter?: string; // 필터 조건
  children?: ExplainNode[];
  extra?: Record<string, unknown>; // 추가 정보
  warnings?: string[]; // 경고 (예: 인덱스 미사용)
}

export interface ParsedExplainPlan {
  dbType: "postgresql" | "mysql" | "oracle" | "mssql";
  totalCost?: number;
  totalRows?: number;
  executionTime?: number;
  nodes: ExplainNode[];
  rawPlan: unknown;
  warnings: string[];
}

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

/**
 * PostgreSQL EXPLAIN (JSON) 결과 파싱
 */
export function parsePostgresExplain(plan: unknown): ParsedExplainPlan {
  nodeIdCounter = 0;
  const warnings: string[] = [];

  // EXPLAIN (FORMAT JSON) 결과는 배열로 반환됨
  const planData = Array.isArray(plan) ? plan[0] : plan;
  const rootPlan = planData?.Plan || planData;

  if (!rootPlan) {
    return {
      dbType: "postgresql",
      nodes: [],
      rawPlan: plan,
      warnings: ["실행 계획을 파싱할 수 없습니다"],
    };
  }

  function parseNode(node: Record<string, unknown>): ExplainNode {
    const result: ExplainNode = {
      id: generateNodeId(),
      operation: String(node["Node Type"] || "Unknown"),
      rows: typeof node["Plan Rows"] === "number" ? node["Plan Rows"] : undefined,
      cost: typeof node["Total Cost"] === "number" ? node["Total Cost"] : undefined,
      time: typeof node["Actual Total Time"] === "number" ? node["Actual Total Time"] : undefined,
      width: typeof node["Plan Width"] === "number" ? node["Plan Width"] : undefined,
      extra: {},
      warnings: [],
    };

    // 테이블/인덱스 정보
    if (node["Relation Name"]) {
      result.object = String(node["Relation Name"]);
    }
    if (node["Index Name"]) {
      result.object = result.object
        ? `${result.object} (${node["Index Name"]})`
        : String(node["Index Name"]);
    }
    if (node["Alias"]) {
      result.extra!["alias"] = node["Alias"];
    }

    // 필터 조건
    if (node["Filter"]) {
      result.filter = String(node["Filter"]);
    }
    if (node["Index Cond"]) {
      result.extra!["indexCond"] = node["Index Cond"];
    }
    if (node["Join Filter"]) {
      result.extra!["joinFilter"] = node["Join Filter"];
    }

    // 경고 감지
    if (node["Node Type"] === "Seq Scan" && result.rows && result.rows > 1000) {
      result.warnings!.push("대량 Sequential Scan - 인덱스 검토 필요");
      warnings.push(`${result.object || "테이블"}: 대량 Sequential Scan 발생`);
    }
    if (node["Rows Removed by Filter"] && typeof node["Rows Removed by Filter"] === "number") {
      const removed = node["Rows Removed by Filter"] as number;
      if (removed > 10000) {
        result.warnings!.push(`필터로 ${removed.toLocaleString()}행 제거됨`);
      }
    }

    // 추가 정보
    const extraKeys = [
      "Sort Key", "Sort Method", "Sort Space Type", "Sort Space Used",
      "Hash Cond", "Merge Cond", "Join Type", "Strategy",
      "Startup Cost", "Parallel Aware", "Workers Planned", "Workers Launched"
    ];
    extraKeys.forEach((key) => {
      if (node[key] !== undefined) {
        result.extra![key] = node[key];
      }
    });

    // 자식 노드 파싱
    if (Array.isArray(node["Plans"])) {
      result.children = (node["Plans"] as Record<string, unknown>[]).map(parseNode);
    }

    return result;
  }

  const rootNode = parseNode(rootPlan);

  return {
    dbType: "postgresql",
    totalCost: rootNode.cost,
    totalRows: rootNode.rows,
    executionTime: rootNode.time,
    nodes: [rootNode],
    rawPlan: plan,
    warnings,
  };
}

/**
 * MySQL EXPLAIN 결과 파싱
 * MySQL EXPLAIN은 행 기반 결과를 반환
 */
export function parseMysqlExplain(rows: Record<string, unknown>[]): ParsedExplainPlan {
  nodeIdCounter = 0;
  const warnings: string[] = [];
  const nodes: ExplainNode[] = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      dbType: "mysql",
      nodes: [],
      rawPlan: rows,
      warnings: ["실행 계획이 비어있습니다"],
    };
  }

  let totalRows = 0;

  rows.forEach((row) => {
    const node: ExplainNode = {
      id: generateNodeId(),
      operation: String(row.select_type || row.type || "SIMPLE"),
      object: row.table ? String(row.table) : undefined,
      rows: typeof row.rows === "number" ? row.rows : parseInt(String(row.rows)) || undefined,
      extra: {},
      warnings: [],
    };

    // rows 합계
    if (node.rows) {
      totalRows += node.rows;
    }

    // 접근 유형
    if (row.type) {
      node.extra!["accessType"] = row.type;

      // 경고 감지
      if (row.type === "ALL") {
        node.warnings!.push("Full Table Scan - 인덱스 검토 필요");
        warnings.push(`${node.object || "테이블"}: Full Table Scan 발생`);
      }
      if (row.type === "index") {
        node.warnings!.push("Full Index Scan");
      }
    }

    // 키 정보
    if (row.possible_keys) {
      node.extra!["possibleKeys"] = row.possible_keys;
    }
    if (row.key) {
      node.extra!["usedKey"] = row.key;
    }
    if (row.key_len) {
      node.extra!["keyLen"] = row.key_len;
    }
    if (row.ref) {
      node.extra!["ref"] = row.ref;
    }

    // 필터링 비율
    if (row.filtered !== undefined) {
      node.extra!["filtered"] = row.filtered;
      if (typeof row.filtered === "number" && row.filtered < 10) {
        node.warnings!.push(`낮은 필터링 비율: ${row.filtered}%`);
      }
    }

    // Extra 정보 파싱
    if (row.Extra) {
      const extraStr = String(row.Extra);
      node.extra!["extra"] = extraStr;

      // Extra에서 경고 추출
      if (extraStr.includes("Using filesort")) {
        node.warnings!.push("파일 정렬 사용");
        warnings.push(`${node.object || "쿼리"}: 파일 정렬 사용`);
      }
      if (extraStr.includes("Using temporary")) {
        node.warnings!.push("임시 테이블 사용");
        warnings.push(`${node.object || "쿼리"}: 임시 테이블 사용`);
      }
      if (extraStr.includes("Using where")) {
        node.filter = "WHERE 조건 적용";
      }
      if (extraStr.includes("Using index")) {
        node.extra!["coveringIndex"] = true;
      }
    }

    // ID 기반 계층 구조는 복잡하므로 일단 평면 구조로 유지
    nodes.push(node);
  });

  return {
    dbType: "mysql",
    totalRows,
    nodes,
    rawPlan: rows,
    warnings,
  };
}

/**
 * Oracle EXPLAIN 결과 파싱
 * Oracle의 DBMS_XPLAN.DISPLAY_CURSOR 또는 PLAN_TABLE 결과
 */
export function parseOracleExplain(rows: Record<string, unknown>[]): ParsedExplainPlan {
  nodeIdCounter = 0;
  const warnings: string[] = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      dbType: "oracle",
      nodes: [],
      rawPlan: rows,
      warnings: ["실행 계획이 비어있습니다"],
    };
  }

  // PLAN_TABLE 컬럼: ID, PARENT_ID, OPERATION, OPTIONS, OBJECT_NAME, COST, CARDINALITY, BYTES
  const nodeMap = new Map<number, ExplainNode>();
  let totalCost = 0;

  // 1차: 모든 노드 생성
  rows.forEach((row) => {
    const id = typeof row.ID === "number" ? row.ID : parseInt(String(row.ID)) || 0;
    const parentId = typeof row.PARENT_ID === "number" ? row.PARENT_ID : parseInt(String(row.PARENT_ID));

    const operation = [row.OPERATION, row.OPTIONS].filter(Boolean).join(" ");
    const cost = typeof row.COST === "number" ? row.COST : parseInt(String(row.COST)) || undefined;
    const cardinality = typeof row.CARDINALITY === "number" ? row.CARDINALITY : parseInt(String(row.CARDINALITY)) || undefined;

    if (cost && id === 0) {
      totalCost = cost;
    }

    const node: ExplainNode = {
      id: generateNodeId(),
      operation: operation || "Unknown",
      object: row.OBJECT_NAME ? String(row.OBJECT_NAME) : undefined,
      rows: cardinality,
      cost,
      width: typeof row.BYTES === "number" ? row.BYTES : undefined,
      extra: {
        oracleId: id,
        parentId: isNaN(parentId) ? null : parentId,
      },
      warnings: [],
      children: [],
    };

    // 경고 감지
    if (operation.includes("TABLE ACCESS FULL")) {
      node.warnings!.push("Full Table Scan - 인덱스 검토 필요");
      warnings.push(`${node.object || "테이블"}: Full Table Scan 발생`);
    }
    if (operation.includes("SORT") && cardinality && cardinality > 10000) {
      node.warnings!.push("대량 정렬 작업");
    }

    // 추가 정보
    if (row.FILTER_PREDICATES) {
      node.filter = String(row.FILTER_PREDICATES);
    }
    if (row.ACCESS_PREDICATES) {
      node.extra!["accessPredicates"] = row.ACCESS_PREDICATES;
    }

    nodeMap.set(id, node);
  });

  // 2차: 계층 구조 연결
  const rootNodes: ExplainNode[] = [];
  nodeMap.forEach((node) => {
    const parentId = node.extra?.parentId;
    if (parentId === null || parentId === undefined) {
      rootNodes.push(node);
    } else {
      const parent = nodeMap.get(parentId as number);
      if (parent) {
        parent.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  });

  return {
    dbType: "oracle",
    totalCost,
    nodes: rootNodes,
    rawPlan: rows,
    warnings,
  };
}

/**
 * MSSQL EXPLAIN 결과 파싱
 * SET SHOWPLAN_TEXT/XML 또는 실행 계획 결과
 */
export function parseMssqlExplain(plan: unknown): ParsedExplainPlan {
  nodeIdCounter = 0;
  const warnings: string[] = [];

  // SHOWPLAN_TEXT 결과 (텍스트 기반)
  if (Array.isArray(plan) && plan.length > 0 && typeof plan[0] === "object") {
    const planText = plan.map((row) => {
      const values = Object.values(row as Record<string, unknown>);
      return values.join("\n");
    }).join("\n");

    const nodes: ExplainNode[] = [];
    const lines = planText.split("\n").filter((line) => line.trim());

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("--") || trimmed.startsWith("StmtText")) {
        return;
      }

      // 들여쓰기 레벨 계산
      const indent = line.length - line.trimStart().length;

      const node: ExplainNode = {
        id: generateNodeId(),
        operation: trimmed.substring(0, 50) + (trimmed.length > 50 ? "..." : ""),
        extra: {
          fullText: trimmed,
          level: Math.floor(indent / 2),
        },
        warnings: [],
      };

      // 경고 감지
      if (trimmed.includes("Table Scan") || trimmed.includes("Clustered Index Scan")) {
        node.warnings!.push("Scan 발생 - 인덱스 검토 필요");
        warnings.push("Table/Index Scan 발생");
      }
      if (trimmed.includes("Sort")) {
        node.warnings!.push("정렬 작업 발생");
      }

      nodes.push(node);
    });

    return {
      dbType: "mssql",
      nodes,
      rawPlan: plan,
      warnings,
    };
  }

  // XML 실행 계획 (문자열로 전달된 경우)
  if (typeof plan === "string" && plan.includes("ShowPlanXML")) {
    return {
      dbType: "mssql",
      nodes: [{
        id: generateNodeId(),
        operation: "XML Execution Plan",
        extra: {
          xmlPlan: plan,
        },
        warnings: [],
      }],
      rawPlan: plan,
      warnings: ["XML 실행 계획은 원본 형식으로 표시됩니다"],
    };
  }

  return {
    dbType: "mssql",
    nodes: [],
    rawPlan: plan,
    warnings: ["MSSQL 실행 계획을 파싱할 수 없습니다"],
  };
}

/**
 * DB 타입에 따라 적절한 파서 호출
 */
export function parseExplainPlan(
  dbType: "postgresql" | "mysql" | "oracle" | "mssql",
  plan: unknown
): ParsedExplainPlan {
  switch (dbType) {
    case "postgresql":
      return parsePostgresExplain(plan);
    case "mysql":
      return parseMysqlExplain(plan as Record<string, unknown>[]);
    case "oracle":
      return parseOracleExplain(plan as Record<string, unknown>[]);
    case "mssql":
      return parseMssqlExplain(plan);
    default:
      return {
        dbType,
        nodes: [],
        rawPlan: plan,
        warnings: [`지원하지 않는 DB 타입: ${dbType}`],
      };
  }
}

/**
 * 실행 계획에서 주요 지표 추출
 */
export function getExplainSummary(parsed: ParsedExplainPlan): {
  totalCost: number | undefined;
  totalRows: number | undefined;
  executionTime: number | undefined;
  nodeCount: number;
  warningCount: number;
  hasFullScan: boolean;
  hasSort: boolean;
  hasTemp: boolean;
} {
  let nodeCount = 0;
  let warningCount = parsed.warnings.length;
  let hasFullScan = false;
  let hasSort = false;
  let hasTemp = false;

  function countNodes(nodes: ExplainNode[]): void {
    nodes.forEach((node) => {
      nodeCount++;
      warningCount += node.warnings?.length || 0;

      const op = node.operation.toLowerCase();
      if (op.includes("seq scan") || op.includes("full") || op.includes("table scan")) {
        hasFullScan = true;
      }
      if (op.includes("sort")) {
        hasSort = true;
      }
      if (op.includes("temp") || op.includes("materialize")) {
        hasTemp = true;
      }

      if (node.children) {
        countNodes(node.children);
      }
    });
  }

  countNodes(parsed.nodes);

  return {
    totalCost: parsed.totalCost,
    totalRows: parsed.totalRows,
    executionTime: parsed.executionTime,
    nodeCount,
    warningCount,
    hasFullScan,
    hasSort,
    hasTemp,
  };
}
