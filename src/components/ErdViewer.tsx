import { useEffect, useRef, useState } from "react";
import { Table } from "@/utils/ddlParser";
import { generateMermaidERD, generateTextERD } from "@/utils/erdGenerator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import mermaid from "mermaid";
import { toast } from "sonner";

interface ErdViewerProps {
  tables: Table[];
}

export function ErdViewer({ tables }: ErdViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidCode, setMermaidCode] = useState("");
  const [textErd, setTextErd] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (tables.length === 0) return;

    // Mermaid 초기화
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontSize: 14,
    });

    const code = generateMermaidERD(tables);
    setMermaidCode(code);
    setTextErd(generateTextERD(tables));

    // Mermaid 렌더링
    if (mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      const id = `mermaid-${Date.now()}`;
      mermaid.render(id, code).then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      }).catch((error) => {
        console.error("Mermaid rendering error:", error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<div class="text-destructive p-4">ERD 렌더링 중 오류가 발생했습니다.</div>`;
        }
      });
    }
  }, [tables]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const downloadAsImage = async () => {
    if (!mermaidRef.current) return;

    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) return;

    try {
      // SVG를 문자열로 변환
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // 다운로드 링크 생성
      const link = document.createElement('a');
      link.href = url;
      link.download = 'erd-diagram.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("ERD 이미지가 다운로드되었습니다.");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("이미지 다운로드 중 오류가 발생했습니다.");
    }
  };

  const downloadTextErd = () => {
    const blob = new Blob([textErd], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erd-text.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("텍스트 ERD가 다운로드되었습니다.");
  };

  const downloadMermaidCode = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erd-mermaid.mmd';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Mermaid 코드가 다운로드되었습니다.");
  };

  if (tables.length === 0) {
    return (
      <Card className="p-8 bg-card">
        <div className="text-center text-muted-foreground">
          <p>ERD를 생성할 테이블이 없습니다.</p>
          <p className="text-sm mt-1">DDL을 입력하고 변환 버튼을 클릭해주세요.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">ERD (Entity Relationship Diagram)</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="diagram" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagram">다이어그램</TabsTrigger>
            <TabsTrigger value="text">텍스트</TabsTrigger>
            <TabsTrigger value="code">Mermaid 코드</TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={downloadAsImage} size="sm">
                <Download className="w-4 h-4 mr-2" />
                SVG 다운로드
              </Button>
            </div>
            <div className="border rounded-lg p-4 overflow-auto bg-background max-h-[600px]">
              <div
                ref={mermaidRef}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                className="inline-block transition-transform"
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={downloadTextErd} size="sm">
                <Download className="w-4 h-4 mr-2" />
                텍스트 다운로드
              </Button>
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
                {textErd}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={downloadMermaidCode} size="sm">
                <Download className="w-4 h-4 mr-2" />
                코드 다운로드
              </Button>
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
                {mermaidCode}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
