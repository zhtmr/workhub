import { useState, useCallback } from "react";
import { ArrowRightLeft, Copy, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { urlEncode, urlDecode } from "@/utils/encodingUtils";

export function UrlEncoder() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  const handleEncode = useCallback(() => {
    if (!inputText.trim()) {
      toast.error("입력 텍스트를 입력하세요");
      return;
    }
    try {
      const encoded = urlEncode(inputText);
      setOutputText(encoded);
      toast.success("URL 인코딩 완료");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [inputText]);

  const handleDecode = useCallback(() => {
    if (!inputText.trim()) {
      toast.error("URL 인코딩된 문자열을 입력하세요");
      return;
    }
    try {
      const decoded = urlDecode(inputText);
      setOutputText(decoded);
      toast.success("URL 디코딩 완료");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [inputText]);

  const handleCopy = useCallback(async () => {
    if (!outputText) {
      toast.error("복사할 내용이 없습니다");
      return;
    }
    await navigator.clipboard.writeText(outputText);
    toast.success("클립보드에 복사되었습니다");
  }, [outputText]);

  const handleSwap = useCallback(() => {
    setInputText(outputText);
    setOutputText("");
  }, [outputText]);

  const handleClear = useCallback(() => {
    setInputText("");
    setOutputText("");
  }, []);

  return (
    <Card className="p-4 space-y-4">
      {/* 입력 */}
      <div className="space-y-2">
        <Label>입력</Label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="URL 또는 텍스트를 입력하세요..."
          className="w-full h-32 p-3 font-mono text-sm border rounded-md resize-none bg-background"
        />
      </div>

      {/* 버튼 그룹 */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleEncode}>인코딩</Button>
        <Button onClick={handleDecode} variant="outline">
          디코딩
        </Button>
        <Button onClick={handleSwap} variant="ghost" size="icon">
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
        <Button onClick={handleClear} variant="ghost" size="icon">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 출력 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>결과</Label>
          <Button onClick={handleCopy} variant="ghost" size="sm">
            <Copy className="w-4 h-4 mr-1" />
            복사
          </Button>
        </div>
        <textarea
          value={outputText}
          readOnly
          placeholder="결과가 여기에 표시됩니다..."
          className="w-full h-32 p-3 font-mono text-sm border rounded-md resize-none bg-muted"
        />
      </div>

      {/* 예시 */}
      <div className="p-3 text-sm rounded-md bg-muted/50">
        <p className="font-medium mb-2">예시:</p>
        <div className="space-y-1 font-mono text-xs">
          <p>
            <span className="text-muted-foreground">원본:</span> Hello World! 안녕
          </p>
          <p>
            <span className="text-muted-foreground">인코딩:</span> Hello%20World!%20%EC%95%88%EB%85%95
          </p>
        </div>
      </div>
    </Card>
  );
}
