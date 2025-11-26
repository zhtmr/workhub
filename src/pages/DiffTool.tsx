import { useState } from "react";
import { GitCompare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DiffEditor } from "@/components/diff/DiffEditor";
import { DiffViewer, type DiffViewMode } from "@/components/diff/DiffViewer";

const SAMPLE_OLD = `function greet(name) {
  console.log("Hello, " + name);
  return name;
}

const result = greet("World");
console.log(result);`;

const SAMPLE_NEW = `function greet(name, greeting = "Hello") {
  const message = \`\${greeting}, \${name}!\`;
  console.log(message);
  return message;
}

const result = greet("World", "Hi");
console.log("Result:", result);`;

const DiffTool = () => {
  const [oldText, setOldText] = useState(SAMPLE_OLD);
  const [newText, setNewText] = useState(SAMPLE_NEW);
  const [viewMode, setViewMode] = useState<DiffViewMode>("side-by-side");

  const handleClear = () => {
    setOldText("");
    setNewText("");
  };

  const handleSwap = () => {
    setOldText(newText);
    setNewText(oldText);
  };

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Diff 비교</h1>
            <p className="text-sm text-muted-foreground">
              두 텍스트의 차이점을 비교합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as DiffViewMode)}
          >
            <ToggleGroupItem value="side-by-side" aria-label="좌우 비교">
              좌우 비교
            </ToggleGroupItem>
            <ToggleGroupItem value="inline" aria-label="인라인">
              인라인
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={handleSwap} variant="outline" size="sm">
            좌우 교체
          </Button>
          <Button onClick={handleClear} variant="ghost" size="sm">
            <Trash2 className="w-4 h-4 mr-1" />
            초기화
          </Button>
        </div>
      </div>

      {/* 레이아웃 */}
      <div className="grid grid-rows-2 gap-4 h-[calc(100%-5rem)]">
        {/* 입력 영역 */}
        <div className="grid grid-cols-2 gap-4 min-h-0">
          <DiffEditor
            label="원본 (Original)"
            value={oldText}
            onChange={setOldText}
            placeholder="원본 텍스트를 입력하세요..."
          />
          <DiffEditor
            label="수정본 (Modified)"
            value={newText}
            onChange={setNewText}
            placeholder="수정된 텍스트를 입력하세요..."
          />
        </div>

        {/* 비교 결과 */}
        <DiffViewer
          oldText={oldText}
          newText={newText}
          viewMode={viewMode}
          className="min-h-0"
        />
      </div>
    </div>
  );
};

export default DiffTool;
