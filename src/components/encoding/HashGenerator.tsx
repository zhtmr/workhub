import { useState, useCallback } from "react";
import { Hash, Copy, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateHash, md5, type HashAlgorithm } from "@/utils/encodingUtils";

interface HashResult {
  algorithm: string;
  hash: string;
  length: number;
}

const ALGORITHMS: { name: string; algo: HashAlgorithm | "MD5" }[] = [
  { name: "MD5", algo: "MD5" },
  { name: "SHA-1", algo: "SHA-1" },
  { name: "SHA-256", algo: "SHA-256" },
  { name: "SHA-384", algo: "SHA-384" },
  { name: "SHA-512", algo: "SHA-512" },
];

export function HashGenerator() {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<HashResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!inputText.trim()) {
      toast.error("입력 텍스트를 입력하세요");
      return;
    }

    setIsLoading(true);
    try {
      const hashResults: HashResult[] = [];

      for (const { name, algo } of ALGORITHMS) {
        let hash: string;
        if (algo === "MD5") {
          hash = md5(inputText);
        } else {
          hash = await generateHash(inputText, algo);
        }
        hashResults.push({
          algorithm: name,
          hash,
          length: hash.length * 4, // hex 문자당 4비트
        });
      }

      setResults(hashResults);
      toast.success("해시 생성 완료");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);

  const handleCopy = useCallback(async (hash: string, algorithm: string) => {
    await navigator.clipboard.writeText(hash);
    toast.success(`${algorithm} 해시가 복사되었습니다`);
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (results.length === 0) {
      toast.error("복사할 해시가 없습니다");
      return;
    }
    const text = results.map((r) => `${r.algorithm}: ${r.hash}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("모든 해시가 복사되었습니다");
  }, [results]);

  const handleClear = useCallback(() => {
    setInputText("");
    setResults([]);
  }, []);

  return (
    <Card className="p-4 space-y-4">
      {/* 입력 */}
      <div className="space-y-2">
        <Label>입력 텍스트</Label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="해시를 생성할 텍스트를 입력하세요..."
          className="w-full h-32 p-3 font-mono text-sm border rounded-md resize-none bg-background"
        />
      </div>

      {/* 버튼 그룹 */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={isLoading}>
          <Hash className="w-4 h-4 mr-2" />
          {isLoading ? "생성 중..." : "해시 생성"}
        </Button>
        <Button
          onClick={handleCopyAll}
          variant="outline"
          disabled={results.length === 0}
        >
          <Copy className="w-4 h-4 mr-2" />
          전체 복사
        </Button>
        <Button onClick={handleClear} variant="ghost">
          <Trash2 className="w-4 h-4 mr-2" />
          초기화
        </Button>
      </div>

      {/* 해시 결과 */}
      {results.length > 0 && (
        <div className="space-y-2">
          <Label>해시 결과</Label>
          <div className="border rounded-md divide-y">
            {results.map((result) => (
              <div
                key={result.algorithm}
                className="p-3 space-y-1 hover:bg-muted/50 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{result.algorithm}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {result.length}비트
                    </span>
                  </div>
                  <Button
                    onClick={() => handleCopy(result.hash, result.algorithm)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <code className="block font-mono text-xs break-all text-muted-foreground">
                  {result.hash}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 알고리즘 정보 */}
      <div className="p-3 text-sm rounded-md bg-muted/50">
        <p className="font-medium mb-2">해시 알고리즘 비교</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">MD5:</span> 128비트, 빠름, 보안 취약
          </div>
          <div>
            <span className="text-muted-foreground">SHA-1:</span> 160비트, 레거시
          </div>
          <div>
            <span className="text-muted-foreground">SHA-256:</span> 256비트, 권장
          </div>
          <div>
            <span className="text-muted-foreground">SHA-512:</span> 512비트, 강력
          </div>
        </div>
      </div>
    </Card>
  );
}
