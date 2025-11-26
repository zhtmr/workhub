import {
  sum,
  mean,
  min,
  max,
  standardDeviation,
  median,
  variance,
} from "simple-statistics";

export interface ColumnStatistics {
  columnKey: string;
  columnLabel: string;
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  standardDeviation: number;
  median: number;
  variance: number;
}

/**
 * 숫자 배열에 대한 통계를 계산합니다.
 */
export function calculateStatistics(
  values: number[],
  columnKey: string,
  columnLabel: string
): ColumnStatistics {
  if (values.length === 0) {
    return {
      columnKey,
      columnLabel,
      count: 0,
      sum: 0,
      mean: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
      median: 0,
      variance: 0,
    };
  }

  return {
    columnKey,
    columnLabel,
    count: values.length,
    sum: sum(values),
    mean: mean(values),
    min: min(values),
    max: max(values),
    standardDeviation: values.length > 1 ? standardDeviation(values) : 0,
    median: median(values),
    variance: values.length > 1 ? variance(values) : 0,
  };
}

/**
 * 숫자를 포맷팅합니다.
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 집계 함수 타입
 */
export type AggregateFunction = "sum" | "count" | "average" | "min" | "max";

/**
 * 집계 함수를 적용합니다.
 */
export function aggregate(
  values: number[],
  fn: AggregateFunction
): number {
  if (values.length === 0) return 0;

  switch (fn) {
    case "sum":
      return sum(values);
    case "count":
      return values.length;
    case "average":
      return mean(values);
    case "min":
      return min(values);
    case "max":
      return max(values);
    default:
      return 0;
  }
}

/**
 * 데이터를 그룹화하고 집계합니다.
 */
export function groupAndAggregate<T extends Record<string, unknown>>(
  rows: T[],
  groupByKey: string,
  valueKey: string,
  aggregateFn: AggregateFunction
): Map<string, number> {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupValue = String(row[groupByKey] ?? "");
    const value = row[valueKey];
    const numValue = typeof value === "number" ? value : parseFloat(String(value));

    if (!isNaN(numValue)) {
      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(numValue);
    }
  }

  const result = new Map<string, number>();
  for (const [key, values] of groups) {
    result.set(key, aggregate(values, aggregateFn));
  }

  return result;
}

/**
 * 피벗 테이블 데이터를 생성합니다.
 */
export interface PivotResult {
  rowLabels: string[];
  columnLabels: string[];
  data: Map<string, Map<string, number>>;
  rowTotals: Map<string, number>;
  columnTotals: Map<string, number>;
  grandTotal: number;
}

export function createPivotTable<T extends Record<string, unknown>>(
  rows: T[],
  rowField: string,
  columnField: string,
  valueField: string,
  aggregateFn: AggregateFunction
): PivotResult {
  const data = new Map<string, Map<string, number[]>>();
  const rowLabelsSet = new Set<string>();
  const columnLabelsSet = new Set<string>();

  // 데이터 수집
  for (const row of rows) {
    const rowLabel = String(row[rowField] ?? "");
    const colLabel = String(row[columnField] ?? "");
    const value = row[valueField];
    const numValue = typeof value === "number" ? value : parseFloat(String(value));

    rowLabelsSet.add(rowLabel);
    columnLabelsSet.add(colLabel);

    if (!isNaN(numValue)) {
      if (!data.has(rowLabel)) {
        data.set(rowLabel, new Map());
      }
      const rowData = data.get(rowLabel)!;
      if (!rowData.has(colLabel)) {
        rowData.set(colLabel, []);
      }
      rowData.get(colLabel)!.push(numValue);
    }
  }

  const rowLabels = Array.from(rowLabelsSet).sort();
  const columnLabels = Array.from(columnLabelsSet).sort();

  // 집계 결과 계산
  const aggregatedData = new Map<string, Map<string, number>>();
  const rowTotals = new Map<string, number>();
  const columnTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const rowLabel of rowLabels) {
    aggregatedData.set(rowLabel, new Map());
    let rowSum = 0;
    const rowData = data.get(rowLabel);

    for (const colLabel of columnLabels) {
      const values = rowData?.get(colLabel) || [];
      const aggregatedValue = aggregate(values, aggregateFn);
      aggregatedData.get(rowLabel)!.set(colLabel, aggregatedValue);
      rowSum += aggregatedValue;

      const currentColTotal = columnTotals.get(colLabel) || 0;
      columnTotals.set(colLabel, currentColTotal + aggregatedValue);
    }

    rowTotals.set(rowLabel, rowSum);
    grandTotal += rowSum;
  }

  return {
    rowLabels,
    columnLabels,
    data: aggregatedData,
    rowTotals,
    columnTotals,
    grandTotal,
  };
}
