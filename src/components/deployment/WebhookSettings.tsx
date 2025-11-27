import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Webhook, RefreshCw, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { useAuth } from "@/providers/AuthProvider";

interface WebhookSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    webhook_secret: string | null;
    gitlab_url: string | null;
    gitlab_project_id: string | null;
  };
  onSecretRegenerated?: (newSecret: string) => void;
}

export function WebhookSettings({
  open,
  onOpenChange,
  project,
  onSecretRegenerated,
}: WebhookSettingsProps) {
  const { session } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Supabase Edge Function URL (사용자가 설정해야 함)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const webhookUrl = project.webhook_secret
    ? `${supabaseUrl}/functions/v1/gitlab-webhook/${project.webhook_secret}`
    : null;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success("복사되었습니다");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const regenerateSecret = async () => {
    if (!confirm("Webhook 시크릿을 재생성하시겠습니까?\n기존 Webhook 연동이 끊어집니다.")) {
      return;
    }

    setIsRegenerating(true);
    try {
      const newSecret = crypto.randomUUID();
      const { error } = await supabaseFetch.updateDeploymentProject(
        project.id,
        { webhook_secret: newSecret },
        session?.access_token
      );

      if (error) {
        toast.error("시크릿 재생성에 실패했습니다");
        return;
      }

      toast.success("Webhook 시크릿이 재생성되었습니다");
      onSecretRegenerated?.(newSecret);
    } catch {
      toast.error("시크릿 재생성에 실패했습니다");
    } finally {
      setIsRegenerating(false);
    }
  };

  const gitlabWebhookDocsUrl = project.gitlab_url
    ? `${project.gitlab_url}/${project.gitlab_project_id}/-/hooks`
    : "https://docs.gitlab.com/ee/user/project/integrations/webhooks.html";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhook 설정
          </DialogTitle>
          <DialogDescription>
            {project.name} 프로젝트의 GitLab Webhook을 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            {webhookUrl ? (
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl, "url")}
                >
                  {copied === "url" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Webhook 시크릿이 없습니다. 프로젝트를 다시 생성하거나 관리자에게 문의하세요.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Webhook Secret</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateSecret}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                재생성
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={project.webhook_secret || ""}
                readOnly
                type="password"
                className="font-mono text-xs"
              />
              {project.webhook_secret && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(project.webhook_secret!, "secret")}
                >
                  {copied === "secret" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* GitLab 설정 안내 */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">GitLab Webhook 설정 방법:</p>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>GitLab 프로젝트 → Settings → Webhooks</li>
                <li>URL: 위 Webhook URL 붙여넣기</li>
                <li>Trigger: <Badge variant="outline" className="text-xs">Pipeline events</Badge> 선택</li>
                <li>SSL verification 활성화 권장</li>
                <li>"Add webhook" 클릭</li>
              </ol>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                asChild
              >
                <a
                  href={gitlabWebhookDocsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitLab Webhook 설정 페이지
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </AlertDescription>
          </Alert>

          {/* 지원 이벤트 */}
          <div className="space-y-2">
            <Label>지원되는 이벤트</Label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Pipeline Events</Badge>
              <Badge variant="outline" className="text-muted-foreground">
                Job Events (예정)
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                Deployment Events (예정)
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
