import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DiffEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DiffEditor({
  label,
  value,
  onChange,
  placeholder,
  className,
}: DiffEditorProps) {
  const lineCount = value.split("\n").length;

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b">
        <Label>{label}</Label>
      </div>
      <div className="flex-1 relative flex">
        {/* 라인 번호 */}
        <div className="w-10 bg-muted/50 border-r flex flex-col overflow-hidden">
          <div className="p-2 font-mono text-xs text-muted-foreground text-right">
            {Array.from({ length: Math.max(lineCount, 10) }, (_, i) => (
              <div key={i} className="h-5 leading-5">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* 에디터 */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex-1 p-2 font-mono text-sm resize-none",
            "bg-background border-0 outline-none",
            "leading-5"
          )}
          spellCheck={false}
        />
      </div>
    </Card>
  );
}
