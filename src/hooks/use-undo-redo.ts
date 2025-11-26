import { useState, useCallback, useRef } from "react";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

interface UseUndoRedoOptions<T> {
  maxHistorySize?: number;
  onUndo?: (state: T) => void;
  onRedo?: (state: T) => void;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (newState: T) => void;
  history: T[];
  historyIndex: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions<T> = {}
): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50, onUndo, onRedo } = options;

  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoing = useRef(false);

  const state = history[historyIndex];

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      if (isUndoRedoing.current) return;

      setHistory((prev) => {
        const currentState = prev[historyIndex];
        const nextState =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(currentState)
            : newState;

        // 같은 상태면 무시
        if (JSON.stringify(nextState) === JSON.stringify(currentState)) {
          return prev;
        }

        // 현재 인덱스 이후의 히스토리 삭제
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(nextState);

        // 최대 크기 제한
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
          return newHistory;
        }

        return newHistory;
      });

      setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
    },
    [historyIndex, maxHistorySize]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoing.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onUndo?.(history[newIndex]);
      setTimeout(() => {
        isUndoRedoing.current = false;
      }, 0);
    }
  }, [historyIndex, history, onUndo]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoing.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onRedo?.(history[newIndex]);
      setTimeout(() => {
        isUndoRedoing.current = false;
      }, 0);
    }
  }, [historyIndex, history, onRedo]);

  const reset = useCallback((newState: T) => {
    setHistory([newState]);
    setHistoryIndex(0);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 키보드 단축키 등록
  useKeyboardShortcuts([
    {
      key: "z",
      ctrl: true,
      action: undo,
      description: "실행 취소",
    },
    {
      key: "z",
      ctrl: true,
      shift: true,
      action: redo,
      description: "다시 실행",
    },
    {
      key: "y",
      ctrl: true,
      action: redo,
      description: "다시 실행",
    },
  ]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    history,
    historyIndex,
  };
}
