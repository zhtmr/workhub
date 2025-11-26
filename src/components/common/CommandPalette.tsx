import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Database,
  FileText,
  BarChart3,
  Braces,
  Regex,
  Binary,
  GitCompare,
  Settings,
  History,
  Search,
  Moon,
  Sun,
  Keyboard,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "@/providers/ThemeProvider";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
  group: "navigation" | "actions" | "settings";
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "dashboard",
        label: "대시보드",
        icon: Home,
        action: () => navigate("/"),
        shortcut: "Ctrl+1",
        group: "navigation",
      },
      {
        id: "ddl-converter",
        label: "DDL 변환기",
        icon: Database,
        action: () => navigate("/ddl-converter"),
        group: "navigation",
      },
      {
        id: "document-converter",
        label: "문서 변환",
        icon: FileText,
        action: () => navigate("/document-converter"),
        group: "navigation",
      },
      {
        id: "data-analysis",
        label: "데이터 분석",
        icon: BarChart3,
        action: () => navigate("/data-analysis"),
        group: "navigation",
      },
      {
        id: "json-viewer",
        label: "JSON 뷰어",
        icon: Braces,
        action: () => navigate("/json-viewer"),
        group: "navigation",
      },
      {
        id: "regex-tester",
        label: "정규식 테스터",
        icon: Regex,
        action: () => navigate("/regex-tester"),
        group: "navigation",
      },
      {
        id: "encoding-tools",
        label: "인코딩 도구",
        icon: Binary,
        action: () => navigate("/encoding-tools"),
        group: "navigation",
      },
      {
        id: "diff-tool",
        label: "Diff 비교",
        icon: GitCompare,
        action: () => navigate("/diff-tool"),
        group: "navigation",
      },
      {
        id: "history",
        label: "히스토리",
        icon: History,
        action: () => navigate("/history"),
        group: "navigation",
      },
      // Settings
      {
        id: "settings",
        label: "설정",
        icon: Settings,
        action: () => navigate("/settings"),
        shortcut: "Ctrl+,",
        group: "settings",
      },
      {
        id: "toggle-theme",
        label: theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환",
        icon: theme === "dark" ? Sun : Moon,
        action: () => setTheme(theme === "dark" ? "light" : "dark"),
        group: "settings",
      },
      {
        id: "show-shortcuts",
        label: "단축키 보기",
        icon: Keyboard,
        action: () => setShowShortcuts(true),
        shortcut: "?",
        group: "settings",
      },
    ],
    [navigate, theme, setTheme]
  );

  const navigationCommands = commands.filter((c) => c.group === "navigation");
  const settingsCommands = commands.filter((c) => c.group === "settings");

  const handleSelect = (command: CommandItem) => {
    command.action();
    onOpenChange(false);
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="명령어 검색..." />
        <CommandList>
          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>

          <CommandGroup heading="페이지 이동">
            {navigationCommands.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => handleSelect(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <span>{command.label}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="설정">
            {settingsCommands.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => handleSelect(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <span>{command.label}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* 단축키 도움말 다이얼로그 */}
      <ShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </>
  );
}

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shortcuts = [
    { keys: "Ctrl + K", description: "명령 팔레트 열기" },
    { keys: "Ctrl + S", description: "저장 (해당 페이지)" },
    { keys: "Ctrl + Enter", description: "실행 (해당 페이지)" },
    { keys: "Ctrl + /", description: "사이드바 토글" },
    { keys: "Ctrl + 1", description: "대시보드로 이동" },
    { keys: "Ctrl + ,", description: "설정으로 이동" },
    { keys: "Ctrl + Z", description: "실행 취소" },
    { keys: "Ctrl + Shift + Z", description: "다시 실행" },
    { keys: "?", description: "단축키 보기" },
  ];

  // ESC 키로 닫기
  useKeyboardShortcuts([
    {
      key: "Escape",
      action: () => onOpenChange(false),
    },
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5" />
          <h2 className="text-lg font-semibold">키보드 단축키</h2>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          ESC 또는 바깥 영역을 클릭하여 닫기
        </p>
      </div>
    </div>
  );
}

// 명령 팔레트를 열기 위한 훅
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      action: () => setOpen(true),
      description: "명령 팔레트 열기",
    },
  ]);

  return { open, setOpen };
}
