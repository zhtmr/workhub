import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Database, CheckCircle2, XCircle } from "lucide-react";
import {
  type DbConnection,
  type InsertDbConnection,
  type DbType,
  DEFAULT_PORTS,
  DB_TYPE_LABELS,
} from "@/hooks/use-db-connections";

interface DbConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  connection?: DbConnection | null;
  onSubmit: (data: InsertDbConnection) => Promise<void>;
  isSubmitting?: boolean;
}

const SSL_MODES = [
  { value: "disable", label: "비활성화" },
  { value: "require", label: "필수" },
  { value: "verify-ca", label: "CA 검증" },
  { value: "verify-full", label: "전체 검증" },
];

export function DbConnectionDialog({
  open,
  onOpenChange,
  teamId,
  connection,
  onSubmit,
  isSubmitting = false,
}: DbConnectionDialogProps) {
  const isEditing = !!connection;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    db_type: "postgresql" as DbType,
    host: "",
    port: 5432,
    database_name: "",
    username: "",
    password: "",
    ssl_mode: "disable",
    is_read_only: true,
  });

  // 편집 시 초기값 설정
  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        description: connection.description || "",
        db_type: connection.db_type,
        host: connection.host,
        port: connection.port,
        database_name: connection.database_name,
        username: connection.username,
        password: "", // 보안상 비밀번호는 표시하지 않음
        ssl_mode: connection.ssl_mode,
        is_read_only: connection.is_read_only,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        db_type: "postgresql",
        host: "",
        port: 5432,
        database_name: "",
        username: "",
        password: "",
        ssl_mode: "disable",
        is_read_only: true,
      });
    }
  }, [connection, open]);

  // DB 타입 변경 시 기본 포트 업데이트
  const handleDbTypeChange = (dbType: DbType) => {
    setFormData((prev) => ({
      ...prev,
      db_type: dbType,
      port: DEFAULT_PORTS[dbType],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.host || !formData.database_name || !formData.username) {
      return;
    }

    const data: InsertDbConnection = {
      team_id: teamId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      db_type: formData.db_type,
      host: formData.host.trim(),
      port: formData.port,
      database_name: formData.database_name.trim(),
      username: formData.username.trim(),
      password_encrypted: formData.password || null, // TODO: 암호화 필요
      ssl_mode: formData.ssl_mode,
      is_read_only: formData.is_read_only,
    };

    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            {isEditing ? "DB 연결 수정" : "새 DB 연결"}
          </DialogTitle>
          <DialogDescription>
            데이터베이스 연결 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">연결 이름 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="예: Production DB"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="연결에 대한 설명"
              rows={2}
            />
          </div>

          {/* DB 타입 */}
          <div className="space-y-2">
            <Label>데이터베이스 타입 *</Label>
            <Select value={formData.db_type} onValueChange={handleDbTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DB_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 호스트 & 포트 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="host">호스트 *</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => setFormData((prev) => ({ ...prev, host: e.target.value }))}
                placeholder="localhost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">포트 *</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, port: parseInt(e.target.value) || 5432 }))
                }
              />
            </div>
          </div>

          {/* 데이터베이스 이름 */}
          <div className="space-y-2">
            <Label htmlFor="database_name">데이터베이스 이름 *</Label>
            <Input
              id="database_name"
              value={formData.database_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, database_name: e.target.value }))
              }
              placeholder="mydb"
            />
          </div>

          {/* 사용자 & 비밀번호 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="username">사용자 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="postgres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={isEditing ? "(변경하지 않음)" : ""}
              />
            </div>
          </div>

          {/* SSL 모드 */}
          <div className="space-y-2">
            <Label>SSL 모드</Label>
            <Select
              value={formData.ssl_mode}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, ssl_mode: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SSL_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 읽기 전용 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>읽기 전용 모드</Label>
              <p className="text-xs text-muted-foreground">SELECT 쿼리만 허용</p>
            </div>
            <Switch
              checked={formData.is_read_only}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_read_only: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !formData.name ||
              !formData.host ||
              !formData.database_name ||
              !formData.username
            }
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "수정" : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 연결 테스트 결과 뱃지
 */
export function ConnectionTestBadge({
  lastTestedAt,
  lastTestResult,
}: {
  lastTestedAt: string | null;
  lastTestResult: boolean | null;
}) {
  if (!lastTestedAt) {
    return (
      <span className="text-xs text-muted-foreground">테스트되지 않음</span>
    );
  }

  const date = new Date(lastTestedAt);
  const timeAgo = getTimeAgo(date);

  if (lastTestResult === null) {
    return (
      <span className="text-xs text-muted-foreground">테스트 중... ({timeAgo})</span>
    );
  }

  return lastTestResult ? (
    <span className="flex items-center gap-1 text-xs text-green-500">
      <CheckCircle2 className="w-3 h-3" />
      연결됨 ({timeAgo})
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <XCircle className="w-3 h-3" />
      실패 ({timeAgo})
    </span>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "방금 전";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
}
