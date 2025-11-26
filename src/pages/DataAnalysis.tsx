import { useState } from "react";
import { BarChart3, Table2, TrendingUp, Grid3X3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataUploader } from "@/components/analysis/DataUploader";
import { DataTable } from "@/components/analysis/DataTable";
import { DataStats } from "@/components/analysis/DataStats";
import { ChartBuilder, type ChartConfig } from "@/components/analysis/ChartBuilder";
import { ChartPreview } from "@/components/analysis/ChartPreview";
import { PivotTable } from "@/components/analysis/PivotTable";
import type { ParsedData } from "@/utils/dataParser";

const DataAnalysis = () => {
  const [data, setData] = useState<ParsedData | null>(null);
  const [selectedStatsColumn, setSelectedStatsColumn] = useState<string>("");
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: "bar",
    xAxis: "",
    yAxis: "",
  });

  const handleDataLoaded = (parsedData: ParsedData) => {
    setData(parsedData);

    // 기본 차트 설정
    const numericCols = parsedData.columns.filter((c) => c.type === "number");
    if (parsedData.columns.length > 0 && numericCols.length > 0) {
      setChartConfig({
        type: "bar",
        xAxis: parsedData.columns[0].key,
        yAxis: numericCols[0].key,
      });
      setSelectedStatsColumn(numericCols[0].key);
    }
  };

  const handleClear = () => {
    setData(null);
    setChartConfig({ type: "bar", xAxis: "", yAxis: "" });
    setSelectedStatsColumn("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">데이터 분석</h1>
          <p className="text-sm text-muted-foreground">
            CSV/Excel 파일을 분석하고 시각화합니다
          </p>
        </div>
      </div>

      {/* 파일 업로더 */}
      <DataUploader
        onDataLoaded={handleDataLoaded}
        currentFile={data?.fileName}
        onClear={handleClear}
      />

      {/* 데이터 로드 후 탭 표시 */}
      {data && (
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <Table2 className="w-4 h-4" />
              테이블
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              통계
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              차트
            </TabsTrigger>
            <TabsTrigger value="pivot" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              피벗
            </TabsTrigger>
          </TabsList>

          {/* 테이블 탭 */}
          <TabsContent value="table">
            <DataTable columns={data.columns} rows={data.rows} />
          </TabsContent>

          {/* 통계 탭 */}
          <TabsContent value="stats">
            <DataStats
              columns={data.columns}
              rows={data.rows}
              selectedColumn={selectedStatsColumn}
              onColumnChange={setSelectedStatsColumn}
            />
          </TabsContent>

          {/* 차트 탭 */}
          <TabsContent value="chart">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartBuilder
                columns={data.columns}
                config={chartConfig}
                onChange={setChartConfig}
              />
              <div className="lg:col-span-2">
                <ChartPreview rows={data.rows} config={chartConfig} />
              </div>
            </div>
          </TabsContent>

          {/* 피벗 탭 */}
          <TabsContent value="pivot">
            <PivotTable columns={data.columns} rows={data.rows} />
          </TabsContent>
        </Tabs>
      )}

      {/* 데이터 없을 때 안내 */}
      {!data && (
        <div className="text-center py-12 text-muted-foreground">
          <p>CSV 또는 Excel 파일을 업로드하여 데이터 분석을 시작하세요.</p>
        </div>
      )}
    </div>
  );
};

export default DataAnalysis;
