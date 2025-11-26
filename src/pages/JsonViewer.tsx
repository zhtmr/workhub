import { useState, useMemo, useCallback } from "react";
import { Braces, Copy, Minimize2, Maximize2, FileCode2, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonEditor } from "@/components/json/JsonEditor";
import { JsonTreeView } from "@/components/json/JsonTreeView";
import { TypeScriptGenerator } from "@/components/json/TypeScriptGenerator";
import {
  validateJson,
  formatJson,
  minifyJson,
  parseJson,
  SAMPLE_JSON,
} from "@/utils/jsonUtils";
import { toast } from "sonner";

const JsonViewer = () => {
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);

  const validation = useMemo(() => validateJson(jsonText), [jsonText]);
  const parsedJson = useMemo(
    () => (validation.valid ? parseJson(jsonText) : null),
    [jsonText, validation.valid]
  );

  const handleFormat = useCallback(() => {
    const formatted = formatJson(jsonText);
    if (formatted !== jsonText) {
      setJsonText(formatted);
      toast.success("JSON이 포맷되었습니다.");
    }
  }, [jsonText]);

  const handleMinify = useCallback(() => {
    const minified = minifyJson(jsonText);
    if (minified !== jsonText) {
      setJsonText(minified);
      toast.success("JSON이 압축되었습니다.");
    }
  }, [jsonText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast.success("JSON이 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }, [jsonText]);

  const handleClear = useCallback(() => {
    setJsonText("");
  }, []);

  const handleSample = useCallback(() => {
    setJsonText(SAMPLE_JSON);
    toast.info("샘플 JSON이 로드되었습니다.");
  }, []);

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Braces className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">JSON 뷰어</h1>
            <p className="text-sm text-muted-foreground">
              JSON 편집, 검증, 포맷팅 및 TypeScript 변환
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            disabled={!validation.valid}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            포맷
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMinify}
            disabled={!validation.valid}
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            압축
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            복사
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSample}>
            샘플
          </Button>
        </div>
      </div>

      {/* 탭 레이아웃 */}
      <Tabs defaultValue="editor" className="h-[calc(100%-5rem)]">
        <TabsList>
          <TabsTrigger value="editor" className="gap-2">
            <Braces className="w-4 h-4" />
            에디터
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-2" disabled={!validation.valid}>
            <TreePine className="w-4 h-4" />
            트리 뷰
          </TabsTrigger>
          <TabsTrigger
            value="typescript"
            className="gap-2"
            disabled={!validation.valid}
          >
            <FileCode2 className="w-4 h-4" />
            TypeScript
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="h-[calc(100%-3rem)] mt-4">
          <JsonEditor
            value={jsonText}
            onChange={setJsonText}
            validation={validation}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="tree" className="h-[calc(100%-3rem)] mt-4">
          {parsedJson !== null && (
            <JsonTreeView data={parsedJson} className="h-full" />
          )}
        </TabsContent>

        <TabsContent value="typescript" className="h-[calc(100%-3rem)] mt-4">
          <TypeScriptGenerator jsonString={jsonText} className="h-full" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JsonViewer;
