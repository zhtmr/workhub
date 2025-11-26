import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Save, User, Bell, Palette, Keyboard, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { resetOnboardingTour } from "@/components/common/OnboardingTour";

const Settings = () => {
  const handleSave = () => {
    toast.success("설정이 저장되었습니다.");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">설정</h1>
            <p className="text-sm text-muted-foreground">
              애플리케이션 환경을 설정하세요
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 사용자 설정 */}
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">사용자 설정</h2>
            </div>
            <Separator />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">사용자 이름</Label>
                <Input 
                  id="username" 
                  placeholder="이름을 입력하세요" 
                  defaultValue=""
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@example.com" 
                  defaultValue=""
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 알림 설정 */}
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">알림 설정</h2>
            </div>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>변환 완료 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    파일 변환이 완료되면 알림을 받습니다
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>오류 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    오류 발생 시 알림을 받습니다
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </Card>

        {/* 테마 설정 */}
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">테마 설정</h2>
            </div>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>다크 모드</Label>
                  <p className="text-sm text-muted-foreground">
                    어두운 테마를 사용합니다
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </Card>

        {/* DDL 변환기 설정 */}
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">DDL 변환기 설정</h2>
            </div>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>자동 변환</Label>
                  <p className="text-sm text-muted-foreground">
                    파일 업로드 시 자동으로 변환합니다
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>통합 시트 생성</Label>
                  <p className="text-sm text-muted-foreground">
                    전체 테이블을 하나의 시트로 통합합니다
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </Card>

        {/* UX 설정 */}
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">UX 설정</h2>
            </div>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>키보드 단축키</Label>
                  <p className="text-sm text-muted-foreground">
                    Ctrl+K로 명령 팔레트, Ctrl+/로 사이드바 토글
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  const event = new KeyboardEvent("keydown", {
                    key: "k",
                    ctrlKey: true,
                    bubbles: true,
                  });
                  window.dispatchEvent(event);
                }}>
                  단축키 보기
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <Label>온보딩 투어</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    처음 사용자를 위한 가이드 투어를 다시 시작합니다
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetOnboardingTour}>
                  다시 시작
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <Label>최근 작업 기록</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    최근 작업 기록을 모두 삭제합니다
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  localStorage.removeItem("workhub_recent_work");
                  toast.success("최근 작업 기록이 삭제되었습니다.");
                }}>
                  기록 삭제
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="w-4 h-4 mr-2" />
            설정 저장
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
