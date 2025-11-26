import { useCallback } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { validateJson, type JsonValidationResult } from "@/utils/jsonUtils";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  validation: JsonValidationResult;
  className?: string;
}

export function JsonEditor({
  value,
  onChange,
  validation,
  className,
}: JsonEditorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const lineNumbers = value.split("\n").map((_, i) => i + 1);

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* 상태 표시 */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 border-b text-sm",
          validation.valid
            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
            : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
        )}
      >
        {validation.valid ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>유효한 JSON</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>
              {validation.errorLine
                ? `줄 ${validation.errorLine}: ${validation.error}`
                : validation.error}
            </span>
          </>
        )}
      </div>

      {/* 에디터 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 라인 번호 */}
        <div className="flex-shrink-0 bg-muted/30 text-muted-foreground text-right select-none font-mono text-sm py-4 px-2 overflow-hidden">
          {lineNumbers.map((num) => (
            <div
              key={num}
              className={cn(
                "leading-6",
                !validation.valid &&
                  validation.errorLine === num &&
                  "text-red-500 font-bold"
              )}
            >
              {num}
            </div>
          ))}
        </div>

        {/* 텍스트 영역 */}
        <textarea
          value={value}
          onChange={handleChange}
          className={cn(
            "flex-1 p-4 font-mono text-sm leading-6 resize-none",
            "bg-transparent border-0 outline-none",
            "overflow-auto"
          )}
          spellCheck={false}
          placeholder='{"key": "value"}'
        />
      </div>
    </Card>
  );
}
