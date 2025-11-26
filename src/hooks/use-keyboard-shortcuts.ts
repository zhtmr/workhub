import { useEffect, useCallback, useRef } from "react";

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 입력 필드에서는 일부 단축키만 동작
    const target = e.target as HTMLElement;
    const isInputField =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        // 입력 필드에서는 Ctrl 조합만 허용
        if (isInputField && !shortcut.ctrl) {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        shortcut.action();
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// 단축키 표시 헬퍼
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(navigator.platform.includes("Mac") ? "⌘" : "Ctrl");
  }
  if (shortcut.alt) {
    parts.push(navigator.platform.includes("Mac") ? "⌥" : "Alt");
  }
  if (shortcut.shift) {
    parts.push("Shift");
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join("+");
}

// 전역 단축키 목록
export const GLOBAL_SHORTCUTS: Omit<ShortcutConfig, "action">[] = [
  { key: "k", ctrl: true, description: "명령 팔레트 열기" },
  { key: "s", ctrl: true, description: "저장 (해당 페이지)" },
  { key: "Enter", ctrl: true, description: "실행 (해당 페이지)" },
  { key: "/", ctrl: true, description: "사이드바 토글" },
  { key: "1", ctrl: true, description: "대시보드로 이동" },
  { key: ",", ctrl: true, description: "설정으로 이동" },
];
