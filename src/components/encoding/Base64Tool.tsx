import { useState, useCallback } from "react";
import { ArrowRightLeft, Copy, Upload, Download, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  base64Encode,
  base64Decode,
  fileToBase64,
  base64ToBlob,
} from "@/utils/encodingUtils";

export function Base64Tool() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");

  const handleEncode = useCallback(() => {
    if (!inputText.trim()) {
      toast.error("입력 텍스트를 입력하세요");
      return;
    }
    try {
      const encoded = base64Encode(inputText);
      setOutputText(encoded);
      toast.success("인코딩 완료");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [inputText]);

  const handleDecode = useCallback(() => {
    if (!inputText.trim()) {
      toast.error("Base64 문자열을 입력하세요");
      return;
    }
    try {
      const decoded = base64Decode(inputText);
      setOutputText(decoded);
      toast.success("디코딩 완료");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [inputText]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const base64 = await fileToBase64(file);
        setInputText(base64);
        setFileName(file.name);
        setFileType(file.type);
        toast.success(`파일 로드 완료: ${file.name}`);
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
    []
  );

  const handleDownload = useCallback(() => {
    if (!outputText) {
      toast.error("다운로드할 데이터가 없습니다");
      return;
    }

    try {
      const blob = base64ToBlob(outputText, fileType || "application/octet-stream");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName ? `decoded_${fileName}` : "decoded_file";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("다운로드 완료");
    } catch (error) {
      toast.error("다운로드 실패");
    }
  }, [outputText, fileName, fileType]);

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
    setFileName(null);
    setFileType("");
  }, []);

  return (
    <Card className="p-4 space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "text" | "file")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">텍스트</TabsTrigger>
          <TabsTrigger value="file">파일</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          {/* 입력 */}
          <div className="space-y-2">
            <Label>입력</Label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="텍스트 또는 Base64 문자열을 입력하세요..."
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
        </TabsContent>

        <TabsContent value="file" className="space-y-4">
          {/* 파일 업로드 */}
          <div className="space-y-2">
            <Label>파일 업로드</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50">
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {fileName || "파일을 선택하세요"}
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Base64 결과 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Base64</Label>
              <Button onClick={handleCopy} variant="ghost" size="sm">
                <Copy className="w-4 h-4 mr-1" />
                복사
              </Button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="파일의 Base64 인코딩 결과..."
              className="w-full h-32 p-3 font-mono text-sm border rounded-md resize-none bg-background"
            />
          </div>

          {/* 디코딩 및 다운로드 */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-1" />
              파일로 다운로드
            </Button>
            <Button onClick={handleClear} variant="ghost">
              <Trash2 className="w-4 h-4 mr-1" />
              초기화
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
