import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { createGitLabClient } from "@/utils/gitlabApi";
import type { ProjectFormData } from "@/types/deployment";

interface ProjectRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  initialData?: Partial<ProjectFormData>;
  isEditing?: boolean;
}

type ConnectionStatus = "idle" | "testing" | "success" | "error";

export function ProjectRegistrationDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}: ProjectRegistrationDialogProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    gitlab_url: initialData?.gitlab_url || "",
    gitlab_project_id: initialData?.gitlab_project_id || "",
    gitlab_api_token: initialData?.gitlab_api_token || "",
    prometheus_endpoint: initialData?.prometheus_endpoint || "",
    prometheus_auth_token: initialData?.prometheus_auth_token || "",
    docker_host: initialData?.docker_host || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gitlabStatus, setGitlabStatus] = useState<ConnectionStatus>("idle");
  const [gitlabError, setGitlabError] = useState<string | null>(null);
  const [gitlabProjectName, setGitlabProjectName] = useState<string | null>(null);

  const handleChange = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Reset connection status when GitLab fields change
    if (field.startsWith("gitlab_")) {
      setGitlabStatus("idle");
      setGitlabError(null);
      setGitlabProjectName(null);
    }
  };

  const testGitLabConnection = async () => {
    if (!formData.gitlab_url || !formData.gitlab_project_id || !formData.gitlab_api_token) {
      setGitlabError("GitLab URL, 프로젝트 ID, API 토큰을 모두 입력해주세요.");
      return;
    }

    setGitlabStatus("testing");
    setGitlabError(null);

    try {
      const client = createGitLabClient(
        formData.gitlab_url,
        formData.gitlab_project_id,
        formData.gitlab_api_token
      );

      const { data, error } = await client.testConnection();

      if (error) {
        setGitlabStatus("error");
        setGitlabError(error.message);
        return;
      }

      setGitlabStatus("success");
      setGitlabProjectName(data?.name || null);
    } catch (error) {
      setGitlabStatus("error");
      setGitlabError(error instanceof Error ? error.message : "연결 테스트 실패");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "프로젝트 수정" : "새 프로젝트 등록"}</DialogTitle>
          <DialogDescription>
            배포 모니터링을 위한 프로젝트 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="gitlab">GitLab</TabsTrigger>
            <TabsTrigger value="monitoring">모니터링</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">프로젝트 이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="예: Backend API"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="프로젝트에 대한 간단한 설명"
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="gitlab" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                GitLab API 토큰은 <code className="text-xs bg-muted px-1 py-0.5 rounded">read_api</code> 권한이 필요합니다.
                프로젝트 ID는 GitLab 프로젝트 설정에서 확인할 수 있습니다.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="gitlab_url">GitLab URL</Label>
              <Input
                id="gitlab_url"
                value={formData.gitlab_url}
                onChange={(e) => handleChange("gitlab_url", e.target.value)}
                placeholder="https://gitlab.com 또는 https://your-gitlab.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitlab_project_id">프로젝트 ID</Label>
              <Input
                id="gitlab_project_id"
                value={formData.gitlab_project_id}
                onChange={(e) => handleChange("gitlab_project_id", e.target.value)}
                placeholder="12345 또는 group/project-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitlab_api_token">API 토큰</Label>
              <Input
                id="gitlab_api_token"
                type="password"
                value={formData.gitlab_api_token}
                onChange={(e) => handleChange("gitlab_api_token", e.target.value)}
                placeholder="glpat-xxxx..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testGitLabConnection}
                disabled={gitlabStatus === "testing"}
              >
                {gitlabStatus === "testing" && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                연결 테스트
              </Button>

              {gitlabStatus === "success" && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">
                    연결 성공{gitlabProjectName && `: ${gitlabProjectName}`}
                  </span>
                </div>
              )}

              {gitlabStatus === "error" && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">{gitlabError}</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Prometheus와 Docker 모니터링은 선택사항입니다. Sprint 8에서 완전히 구현됩니다.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="prometheus_endpoint">Prometheus 엔드포인트</Label>
              <Input
                id="prometheus_endpoint"
                value={formData.prometheus_endpoint}
                onChange={(e) => handleChange("prometheus_endpoint", e.target.value)}
                placeholder="http://prometheus:9090"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prometheus_auth_token">Prometheus 인증 토큰 (선택)</Label>
              <Input
                id="prometheus_auth_token"
                type="password"
                value={formData.prometheus_auth_token}
                onChange={(e) => handleChange("prometheus_auth_token", e.target.value)}
                placeholder="Bearer 토큰"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="docker_host">Docker Host</Label>
              <Input
                id="docker_host"
                value={formData.docker_host}
                onChange={(e) => handleChange("docker_host", e.target.value)}
                placeholder="tcp://localhost:2375 또는 unix:///var/run/docker.sock"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
