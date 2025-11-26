import {
  Home,
  Database,
  FileSpreadsheet,
  Settings,
  FileText,
  Calculator,
  BarChart3,
  History
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "대시보드", url: "/", icon: Home },
  { title: "DDL 변환기", url: "/ddl-converter", icon: Database },
  { title: "히스토리", url: "/history", icon: History },
];

const toolsItems = [
  { title: "엑셀 도구", url: "/excel-tools", icon: FileSpreadsheet, disabled: true },
  { title: "문서 변환", url: "/document-converter", icon: FileText, disabled: true },
  { title: "계산기", url: "/calculator", icon: Calculator, disabled: true },
  { title: "데이터 분석", url: "/data-analysis", icon: BarChart3, disabled: true },
];

const settingsItems = [
  { title: "설정", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* 메인 메뉴 */}
        <SidebarGroup>
          <SidebarGroupLabel>메인</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-center gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 업무 도구 */}
        <SidebarGroup>
          <SidebarGroupLabel>업무 도구</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    disabled={item.disabled}
                    className="flex items-center gap-3"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.disabled && open && (
                      <span className="ml-auto text-xs text-muted-foreground">예정</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 설정 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
