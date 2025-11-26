import { useMemo } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { jsonStringToTypeScript } from "@/utils/tsGenerator";
import { toast } from "sonner";

interface TypeScriptGeneratorProps {
  jsonString: string;
  rootName?: string;
  className?: string;
}

export function TypeScriptGenerator({
  jsonString,
  rootName = "Root",
  className,
}: TypeScriptGeneratorProps) {
  const tsCode = useMemo(() => {
    return jsonStringToTypeScript(jsonString, rootName);
  }, [jsonString, rootName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tsCode);
      toast.success("TypeScript 코드가 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const lineNumbers = tsCode.split("\n").map((_, i) => i + 1);

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-sm font-medium">TypeScript Interface</span>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          복사
        </Button>
      </div>

      {/* 코드 영역 */}
      <div className="flex-1 flex overflow-auto">
        {/* 라인 번호 */}
        <div className="flex-shrink-0 bg-muted/30 text-muted-foreground text-right select-none font-mono text-sm py-4 px-2">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6">
              {num}
            </div>
          ))}
        </div>

        {/* 코드 */}
        <pre className="flex-1 p-4 font-mono text-sm leading-6 overflow-auto">
          <code>{tsCode}</code>
        </pre>
      </div>
    </Card>
  );
}
