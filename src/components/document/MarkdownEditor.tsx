import { useRef, useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "마크다운을 입력하세요...",
  className,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const insertText = useCallback(
    (before: string, after?: string, placeholder?: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const textToInsert = selectedText || placeholder || "";

      const newText =
        value.substring(0, start) +
        before +
        textToInsert +
        (after || "") +
        value.substring(end);

      onChange(newText);

      // 커서 위치 조정
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = selectedText
          ? start + before.length + selectedText.length + (after?.length || 0)
          : start + before.length;
        textarea.setSelectionRange(
          newCursorPos,
          newCursorPos + (selectedText ? 0 : textToInsert.length)
        );
      }, 0);
    },
    [value, onChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith(".md") && file.type !== "text/markdown" && file.type !== "text/plain") {
      return;
    }

    try {
      const text = await file.text();
      onChange(text);
    } catch (error) {
      console.error("파일 읽기 오류:", error);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      onChange(text);
    } catch (error) {
      console.error("파일 읽기 오류:", error);
    }
  };

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      <MarkdownToolbar onInsert={insertText} />

      <div
        className={cn(
          "relative flex-1",
          isDragging && "ring-2 ring-primary ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full p-4 resize-none bg-transparent border-0 focus:outline-none font-mono text-sm"
          spellCheck={false}
        />

        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">.md 파일을 드롭하세요</span>
            </div>
          </div>
        )}

        {!value && (
          <div className="absolute bottom-4 right-4">
            <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-muted/50 rounded-md hover:bg-muted transition-colors">
              <Upload className="w-3 h-3" />
              파일 업로드
              <input
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </Card>
  );
}
