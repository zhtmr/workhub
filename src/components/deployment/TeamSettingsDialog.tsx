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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Loader2, UserPlus, Trash2, Crown, Shield, User } from "lucide-react";
import { useTeams, useTeamMembers } from "@/hooks/use-teams";
import { supabaseFetch, TeamRow } from "@/lib/supabase-fetch";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

interface TeamSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamRow | null;
}

type TeamRole = "owner" | "admin" | "member";

const roleLabels: Record<TeamRole, string> = {
  owner: "소유자",
  admin: "관리자",
  member: "멤버",
};

const roleIcons: Record<TeamRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export function TeamSettingsDialog({
  open,
  onOpenChange,
  team,
}: TeamSettingsDialogProps) {
  const { user, session } = useAuth();
  const { updateTeam } = useTeams();
  const { members, addMember, removeMember, refetch: refetchMembers } = useTeamMembers(team?.id || null);

  // Form state
  const [teamName, setTeamName] = useState(team?.name || "");
  const [teamDescription, setTeamDescription] = useState(team?.description || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [isInviting, setIsInviting] = useState(false);

  // Delete confirmation
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const isOwner = team?.owner_id === user?.id;

  // Update team name when team changes
  useState(() => {
    if (team) {
      setTeamName(team.name);
      setTeamDescription(team.description || "");
    }
  });

  const handleUpdateTeam = async () => {
    if (!team || !teamName.trim()) return;

    setIsUpdating(true);
    try {
      await updateTeam(team.id, {
        name: teamName.trim(),
        description: teamDescription.trim() || null,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !team) return;

    setIsInviting(true);
    try {
      // 이메일로 사용자 ID 조회
      const { data: userData, error: userError } = await supabaseFetch.getUserByEmail(
        inviteEmail.trim(),
        session?.access_token
      );

      if (userError || !userData) {
        toast.error(userError?.message || "사용자를 찾을 수 없습니다");
        return;
      }

      // 이미 멤버인지 확인
      const existingMember = members.find((m) => m.user_id === userData.id);
      if (existingMember) {
        toast.error("이미 팀 멤버입니다");
        return;
      }

      // 멤버 추가
      await addMember(userData.id, inviteRole);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error) {
      toast.error("멤버 초대에 실패했습니다");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(userId);
      setMemberToRemove(null);
    } catch (error) {
      toast.error("멤버 제거에 실패했습니다");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!team) return;

    try {
      const { error } = await supabaseFetch.updateTeamMemberRole(
        team.id,
        userId,
        newRole,
        session?.access_token
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("역할이 변경되었습니다");
      refetchMembers();
    } catch (error) {
      toast.error("역할 변경에 실패했습니다");
    }
  };

  if (!team) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>팀 설정</DialogTitle>
            <DialogDescription>팀 정보를 수정하고 멤버를 관리하세요.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">기본 정보</TabsTrigger>
              <TabsTrigger value="members">멤버 관리</TabsTrigger>
            </TabsList>

            {/* 기본 정보 탭 */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">팀 이름</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamDescription">설명</Label>
                <Textarea
                  id="teamDescription"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                  disabled={!isOwner}
                />
              </div>

              {isOwner && (
                <Button
                  onClick={handleUpdateTeam}
                  disabled={isUpdating || !teamName.trim()}
                  className="w-full"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  저장
                </Button>
              )}

              {!isOwner && (
                <p className="text-sm text-muted-foreground text-center">
                  팀 소유자만 정보를 수정할 수 있습니다.
                </p>
              )}
            </TabsContent>

            {/* 멤버 관리 탭 */}
            <TabsContent value="members" className="space-y-4 mt-4">
              {/* 멤버 초대 */}
              {isOwner && (
                <>
                  <div className="space-y-2">
                    <Label>멤버 초대</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="이메일 입력"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as TeamRole)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">관리자</SelectItem>
                          <SelectItem value="member">멤버</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleInviteMember}
                        disabled={isInviting || !inviteEmail.trim()}
                        size="icon"
                      >
                        {isInviting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      가입된 사용자의 이메일을 입력하세요.
                    </p>
                  </div>

                  <Separator />
                </>
              )}

              {/* 멤버 목록 */}
              <div className="space-y-2">
                <Label>멤버 목록 ({members.length}명)</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {members.map((member) => {
                    const RoleIcon = roleIcons[member.role as TeamRole] || User;
                    const isCurrentUser = member.user_id === user?.id;
                    const isMemberOwner = member.role === "owner";

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <RoleIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {member.user_id.substring(0, 8)}...
                              </span>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-xs">
                                  나
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {roleLabels[member.role as TeamRole] || member.role}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOwner && !isMemberOwner && !isCurrentUser && (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(v) => handleRoleChange(member.user_id, v)}
                              >
                                <SelectTrigger className="w-[90px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">관리자</SelectItem>
                                  <SelectItem value="member">멤버</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setMemberToRemove(member.user_id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {isMemberOwner && (
                            <Badge variant="outline" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              소유자
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 멤버 제거 확인 다이얼로그 */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>멤버 제거</AlertDialogTitle>
            <AlertDialogDescription>
              이 멤버를 팀에서 제거하시겠습니까? 해당 멤버는 더 이상 팀의 프로젝트에 접근할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              제거
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
