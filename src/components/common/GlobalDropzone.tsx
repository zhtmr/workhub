import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface FileHandler {
  extensions: string[];
  route: string;
  name: string;
}

const FILE_HANDLERS: FileHandler[] = [
  { extensions: [".sql", ".ddl"], route: "/ddl-converter", name: "DDL 변환기" },
  { extensions: [".md", ".markdown"], route: "/document-converter", name: "문서 변환" },
  { extensions: [".csv", ".xlsx", ".xls"], route: "/data-analysis", name: "데이터 분석" },
  { extensions: [".json"], route: "/json-viewer", name: "JSON 뷰어" },
];

interface DropzoneContextType {
  droppedFile: File | null;
  clearDroppedFile: () => void;
}

const DropzoneContext = createContext<DropzoneContextType | null>(null);

export function useDroppedFile() {
  const context = useContext(DropzoneContext);
  if (!context) {
    throw new Error("useDroppedFile must be used within GlobalDropzoneProvider");
  }
  return context;
}

interface GlobalDropzoneProviderProps {
  children: ReactNode;
}

export function GlobalDropzoneProvider({ children }: GlobalDropzoneProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const getFileHandler = useCallback((fileName: string): FileHandler | null => {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
    return FILE_HANDLERS.find((h) => h.extensions.includes(ext)) || null;
  }, []);

  // Window level drag events
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const handler = getFileHandler(file.name);

      if (!handler) {
        toast.error("지원하지 않는 파일 형식입니다", {
          description: `지원 형식: .sql, .ddl, .md, .csv, .xlsx, .json`,
        });
        return;
      }

      // 이미 해당 페이지에 있으면 파일만 전달
      if (location.pathname === handler.route) {
        setDroppedFile(file);
        toast.success(`파일이 로드되었습니다`, {
          description: file.name,
        });
      } else {
        // 다른 페이지라면 이동
        setDroppedFile(file);
        navigate(handler.route);
        toast.success(`${handler.name}(으)로 이동합니다`, {
          description: file.name,
        });
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [getFileHandler, location.pathname, navigate]);

  const clearDroppedFile = useCallback(() => {
    setDroppedFile(null);
  }, []);

  return (
    <DropzoneContext.Provider value={{ droppedFile, clearDroppedFile }}>
      {children}

      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg border-primary">
            <Upload className="w-16 h-16 text-primary animate-bounce" />
            <div className="text-center">
              <p className="text-lg font-medium">파일을 여기에 놓으세요</p>
              <p className="text-sm text-muted-foreground">
                .sql, .ddl, .md, .csv, .xlsx, .json 파일 지원
              </p>
            </div>
          </div>
        </div>
      )}
    </DropzoneContext.Provider>
  );
}
