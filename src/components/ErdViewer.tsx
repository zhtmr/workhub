import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Table } from "@/utils/ddlParser";
import { generateMermaidERD, generateTextERD, generateReactFlowElements, ErdNode } from "@/utils/erdGenerator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ZoomIn, ZoomOut, Maximize2, Key, Link, Loader2, X, Expand } from "lucide-react";
import { toPng } from "html-to-image";
import mermaid from "mermaid";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  Node,
  NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Custom Table Node for React Flow
const TableNode = memo(({ data }: NodeProps<Node<ErdNode['data']>>) => {
  return (
    <div className="bg-card border-2 border-border rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="bg-primary text-primary-foreground px-3 py-2 rounded-t-md font-semibold text-sm">
        {data.tableName}
      </div>
      <div className="divide-y divide-border">
        {data.columns.map((col, index) => (
          <div key={index} className="px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="flex gap-1">
              {col.isPK && <Key className="w-3 h-3 text-yellow-500" />}
              {col.isFK && <Link className="w-3 h-3 text-blue-500" />}
            </span>
            <span className="font-mono font-medium">{col.name}</span>
            <span className="text-muted-foreground ml-auto">{col.type}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
});

TableNode.displayName = 'TableNode';

const nodeTypes = { tableNode: TableNode };

// 이미지 다운로드 설정 (고해상도)
const imageWidth = 3840;
const imageHeight = 2160;
const pixelRatio = 2;

function downloadImage(dataUrl: string) {
  const link = document.createElement('a');
  link.setAttribute('download', 'erd-interactive.png');
  link.setAttribute('href', dataUrl);
  link.click();
}

// React Flow 내부에서 사용하는 다운로드 버튼 컴포넌트
function DownloadButton() {
  const { getNodes } = useReactFlow();
  const [isDownloading, setIsDownloading] = useState(false);

  const onClick = () => {
    setIsDownloading(true);

    const nodesBounds = getNodesBounds(getNodes());
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2
    );

    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) {
      toast.error("다운로드할 요소를 찾을 수 없습니다.");
      setIsDownloading(false);
      return;
    }

    // 엣지(간선) 스타일 직접 적용 (라이브러리 버그 우회)
    const edgePaths = document.querySelectorAll('.react-flow__edge-path');
    edgePaths.forEach((path) => {
      path.setAttribute('stroke', '#b1b1b7');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
    });

    // 엣지 라벨 스타일 적용
    const edgeLabels = document.querySelectorAll('.react-flow__edge-textwrapper');
    edgeLabels.forEach((label) => {
      (label as HTMLElement).style.fontSize = '12px';
      (label as HTMLElement).style.fill = '#888';
    });

    toPng(viewportElement, {
      backgroundColor: '#ffffff',
      width: imageWidth * pixelRatio,
      height: imageHeight * pixelRatio,
      quality: 1,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x * pixelRatio}px, ${viewport.y * pixelRatio}px) scale(${viewport.zoom * pixelRatio})`,
      },
    })
      .then(downloadImage)
      .then(() => toast.success("ERD 이미지가 다운로드되었습니다."))
      .catch((error) => {
        console.error("Download error:", error);
        toast.error("이미지 다운로드 중 오류가 발생했습니다.");
      })
      .finally(() => setIsDownloading(false));
  };

  return (
    <Panel position="top-right">
      <Button onClick={onClick} size="sm" disabled={isDownloading}>
        {isDownloading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isDownloading ? '생성 중...' : 'PNG 다운로드'}
      </Button>
    </Panel>
  );
}

interface ErdViewerProps {
  tables: Table[];
}

export function ErdViewer({ tables }: ErdViewerProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidCode, setMermaidCode] = useState("");
  const [textErd, setTextErd] = useState("");
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mermaidLoading, setMermaidLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("interactive");

  // 테이블 변경 시 데이터 생성 (mermaidCode, textErd, React Flow 노드/엣지)
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

    // React Flow 노드/엣지 생성
    const { nodes: flowNodes, edges: flowEdges } = generateReactFlowElements(tables);
    setNodes(flowNodes as any);
    setEdges(flowEdges as any);

    // 테이블 변경 시 기존 Mermaid SVG 초기화 (재렌더링을 위해)
    if (mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
    }
  }, [tables]);

  // Mermaid 렌더링 (diagram 탭이 활성화될 때만)
  useEffect(() => {
    if (tables.length === 0 || activeTab !== 'diagram') return;
    if (!mermaidRef.current) return;
    if (!mermaidCode) return;

    // 이미 렌더링된 경우 스킵
    if (mermaidRef.current.querySelector('svg')) return;

    setMermaidLoading(true);
    mermaidRef.current.innerHTML = '';
    const id = `mermaid-${Date.now()}`;

    mermaid.render(id, mermaidCode)
      .then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      })
      .catch((error) => {
        console.error("Mermaid rendering error:", error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<div class="text-destructive p-4">ERD 렌더링 중 오류가 발생했습니다.</div>`;
        }
      })
      .finally(() => {
        setMermaidLoading(false);
      });
  }, [activeTab, mermaidCode, tables.length]);

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

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // ESC 키로 전체화면 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

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

        <Tabs defaultValue="interactive" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="interactive">인터랙티브</TabsTrigger>
            <TabsTrigger value="diagram">Mermaid</TabsTrigger>
            <TabsTrigger value="text">텍스트</TabsTrigger>
            <TabsTrigger value="code">코드</TabsTrigger>
          </TabsList>

          <TabsContent value="interactive" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button onClick={toggleFullscreen} size="sm" variant="outline">
                <Expand className="w-4 h-4 mr-2" />
                전체화면
              </Button>
            </div>
            <div className="border rounded-lg bg-background h-[700px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
              >
                <Background />
                <Controls />
                <MiniMap
                  nodeColor="#6366f1"
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
                <DownloadButton />
              </ReactFlow>
            </div>
          </TabsContent>

          {/* 전체화면 모달 */}
          {isFullscreen && (
            <div className="fixed inset-0 z-50 bg-background">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={4}
              >
                <Background />
                <Controls />
                <MiniMap
                  nodeColor="#6366f1"
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
                <DownloadButton />
                <Panel position="top-left">
                  <Button onClick={toggleFullscreen} size="sm" variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    닫기 (ESC)
                  </Button>
                </Panel>
              </ReactFlow>
            </div>
          )}

          <TabsContent value="diagram" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={downloadAsImage} size="sm" disabled={mermaidLoading}>
                <Download className="w-4 h-4 mr-2" />
                SVG 다운로드
              </Button>
            </div>
            <div className="border rounded-lg p-4 overflow-auto bg-background h-[700px] relative">
              {mermaidLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">다이어그램 렌더링 중...</p>
                  <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-1/2"
                         style={{ animation: 'indeterminate 1.5s infinite ease-in-out' }} />
                  </div>
                </div>
              )}
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
            <div className="border rounded-lg p-4 bg-background h-[700px] overflow-auto">
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
            <div className="border rounded-lg p-4 bg-background h-[700px] overflow-auto">
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
