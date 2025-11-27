import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, Plus, Users, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/providers/AuthProvider";
import { useTeams } from "@/hooks/use-teams";
import {
  useProjectsWithLatestPipeline,
  useDeploymentProjects,
} from "@/hooks/use-deployment-projects";
import { useGitLabPipelines } from "@/hooks/use-gitlab-pipelines";
import {
  ProjectCard,
  ProjectRegistrationDialog,
  DeploymentStats,
  PipelineTimeline,
} from "@/components/deployment";
import type { ProjectWithStatus, ProjectFormData } from "@/types/deployment";
import { toast } from "sonner";

const DeploymentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Team state
  const { teams, isLoading: teamsLoading, createTeam } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Project state
  const { projects, isLoading: projectsLoading, refetch } = useProjectsWithLatestPipeline(selectedTeamId);
  const { createProject, updateProject, deleteProject } = useDeploymentProjects(selectedTeamId);

  // Selected project for detail view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // 선택된 프로젝트 객체 찾기
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // GitLab API에서 파이프라인 데이터 조회
  const { events, stats, isLoading: pipelinesLoading, hasGitLabConfig } = useGitLabPipelines(selectedProject);

  // Dialog states
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStatus | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectWithStatus | null>(null);

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Create default team if none exists (한 번만 실행)
  const hasCreatedDefaultTeam = useRef(false);
  useEffect(() => {
    const createDefaultTeam = async () => {
      if (!teamsLoading && teams.length === 0 && user && !hasCreatedDefaultTeam.current) {
        hasCreatedDefaultTeam.current = true;
        try {
          await createTeam("내 팀", "기본 팀");
        } catch (error) {
          console.error("Failed to create default team:", error);
          hasCreatedDefaultTeam.current = false; // 실패 시 재시도 허용
        }
      }
    };
    createDefaultTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsLoading, teams.length, user]);

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      await createProject({
        name: data.name,
        description: data.description || null,
        gitlab_url: data.gitlab_url || null,
        gitlab_project_id: data.gitlab_project_id || null,
        gitlab_api_token_encrypted: data.gitlab_api_token || null, // TODO: Encrypt
        prometheus_endpoint: data.prometheus_endpoint || null,
        prometheus_auth_token_encrypted: data.prometheus_auth_token || null,
        docker_host: data.docker_host || null,
      });
    } catch (error) {
      toast.error("프로젝트 생성에 실패했습니다.");
      throw error;
    }
  };

  const handleUpdateProject = async (data: ProjectFormData) => {
    if (!editingProject) return;

    try {
      await updateProject(editingProject.id, {
        name: data.name,
        description: data.description || null,
        gitlab_url: data.gitlab_url || null,
        gitlab_project_id: data.gitlab_project_id || null,
        gitlab_api_token_encrypted: data.gitlab_api_token || null,
        prometheus_endpoint: data.prometheus_endpoint || null,
        prometheus_auth_token_encrypted: data.prometheus_auth_token || null,
        docker_host: data.docker_host || null,
      });
      setEditingProject(null);
    } catch (error) {
      toast.error("프로젝트 수정에 실패했습니다.");
      throw error;
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
      if (selectedProjectId === deletingProject.id) {
        setSelectedProjectId(null);
      }
    } catch (error) {
      toast.error("프로젝트 삭제에 실패했습니다.");
    }
  };

  const handleProjectClick = (project: ProjectWithStatus) => {
    setSelectedProjectId(project.id);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground mb-4">
              배포 현황을 확인하려면 먼저 로그인해주세요.
            </p>
            <Button onClick={() => navigate("/auth")}>로그인</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">배포 현황</h1>
            <p className="text-sm text-muted-foreground">
              GitLab CI/CD 파이프라인 모니터링
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Team Selector */}
          <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[180px]">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="팀 선택" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button onClick={() => setShowProjectDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            프로젝트 추가
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="xl:col-span-3 lg:col-span-2 space-y-4">
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">프로젝트가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  새 프로젝트를 추가하여 배포 현황을 모니터링하세요.
                </p>
                <Button onClick={() => setShowProjectDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 프로젝트 추가
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={handleProjectClick}
                  onEdit={(p) => setEditingProject(p)}
                  onDelete={(p) => setDeletingProject(p)}
                  onRefresh={() => refetch()}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Stats & Timeline */}
        <div className="xl:col-span-2 space-y-6">
          {selectedProjectId ? (
            hasGitLabConfig ? (
              pipelinesLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">파이프라인 조회 중...</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <DeploymentStats stats={stats} />
                  <PipelineTimeline events={events} maxHeight="500px" />
                </>
              )
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">GitLab 설정 필요</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>GitLab URL, 프로젝트 ID, API 토큰을</p>
                  <p>설정하면 파이프라인을 조회할 수 있습니다</p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">파이프라인 상세</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>프로젝트를 선택하면</p>
                <p>상세 정보가 표시됩니다</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Project Registration Dialog */}
      <ProjectRegistrationDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSubmit={handleCreateProject}
      />

      {/* Edit Project Dialog */}
      {editingProject && (
        <ProjectRegistrationDialog
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onSubmit={handleUpdateProject}
          initialData={{
            name: editingProject.name,
            description: editingProject.description || "",
            gitlab_url: editingProject.gitlab_url || "",
            gitlab_project_id: editingProject.gitlab_project_id || "",
            gitlab_api_token: "", // Don't pre-fill token
            prometheus_endpoint: editingProject.prometheus_endpoint || "",
            prometheus_auth_token: "",
            docker_host: editingProject.docker_host || "",
          }}
          isEditing
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              '{deletingProject?.name}' 프로젝트를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, 모든 파이프라인 이력이 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeploymentDashboard;
