import { useState, useCallback } from "react";
import { RefreshCw, Copy, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateUUID } from "@/utils/encodingUtils";

export function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>([generateUUID()]);
  const [count, setCount] = useState(1);

  const handleGenerate = useCallback(() => {
    const newUuids = Array.from({ length: count }, () => generateUUID());
    setUuids(newUuids);
    toast.success(`${count}개의 UUID 생성 완료`);
  }, [count]);

  const handleCopyOne = useCallback(async (uuid: string) => {
    await navigator.clipboard.writeText(uuid);
    toast.success("UUID가 복사되었습니다");
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (uuids.length === 0) {
      toast.error("복사할 UUID가 없습니다");
      return;
    }
    await navigator.clipboard.writeText(uuids.join("\n"));
    toast.success(`${uuids.length}개의 UUID가 복사되었습니다`);
  }, [uuids]);

  const handleClear = useCallback(() => {
    setUuids([]);
  }, []);

  return (
    <Card className="p-4 space-y-4">
      {/* 생성 옵션 */}
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label>생성 개수</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-24"
          />
        </div>
        <Button onClick={handleGenerate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          생성
        </Button>
        <Button onClick={handleCopyAll} variant="outline">
          <Copy className="w-4 h-4 mr-2" />
          전체 복사
        </Button>
        <Button onClick={handleClear} variant="ghost">
          <Trash2 className="w-4 h-4 mr-2" />
          초기화
        </Button>
      </div>

      {/* UUID 목록 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>생성된 UUID</Label>
          <Badge variant="secondary">{uuids.length}개</Badge>
        </div>
        <div className="max-h-80 overflow-auto border rounded-md">
          {uuids.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              UUID를 생성하세요
            </div>
          ) : (
            <div className="divide-y">
              {uuids.map((uuid, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">
                      {idx + 1}
                    </span>
                    <code className="font-mono text-sm">{uuid}</code>
                  </div>
                  <Button
                    onClick={() => handleCopyOne(uuid)}
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UUID v4 설명 */}
      <div className="p-3 text-sm rounded-md bg-muted/50">
        <p className="font-medium mb-2">UUID v4 정보</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>- 128비트 (16바이트) 랜덤 식별자</li>
          <li>- 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</li>
          <li>- 4: 버전 4 (랜덤), y: 8, 9, a, b 중 하나</li>
          <li>- 충돌 확률: 약 2^122개 생성 시 50%</li>
        </ul>
      </div>
    </Card>
  );
}
