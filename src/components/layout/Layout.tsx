import { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { CommandPalette, useCommandPalette } from "@/components/common/CommandPalette";
import { GlobalDropzoneProvider } from "@/components/common/GlobalDropzone";
import { OnboardingTour } from "@/components/common/OnboardingTour";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface LayoutProps {
  children?: ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { setOpen: setSidebarOpen, open: sidebarOpen } = useSidebar();
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();

  // 전역 키보드 단축키
  useKeyboardShortcuts([
    {
      key: "/",
      ctrl: true,
      action: () => setSidebarOpen(!sidebarOpen),
      description: "사이드바 토글",
    },
    {
      key: "1",
      ctrl: true,
      action: () => navigate("/"),
      description: "대시보드로 이동",
    },
    {
      key: ",",
      ctrl: true,
      action: () => navigate("/settings"),
      description: "설정으로 이동",
    },
  ]);

  return (
    <GlobalDropzoneProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 bg-background">
            {children || <Outlet />}
          </main>
        </div>
      </div>

      {/* 명령 팔레트 */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* 온보딩 투어 */}
      <OnboardingTour />
    </GlobalDropzoneProvider>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
