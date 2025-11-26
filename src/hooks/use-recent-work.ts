import { useState, useEffect, useCallback } from "react";

export interface RecentWorkItem {
  id: string;
  type: "ddl" | "document" | "data" | "json" | "regex" | "encoding" | "diff";
  title: string;
  description?: string;
  route: string;
  timestamp: number;
}

const STORAGE_KEY = "workhub_recent_work";
const MAX_ITEMS = 10;

export function useRecentWork() {
  const [recentItems, setRecentItems] = useState<RecentWorkItem[]>([]);

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as RecentWorkItem[];
        setRecentItems(items);
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }, []);

  // 로컬 스토리지에 저장
  const saveToStorage = useCallback((items: RecentWorkItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // 저장 실패 시 무시
    }
  }, []);

  // 최근 작업 추가
  const addRecentWork = useCallback(
    (item: Omit<RecentWorkItem, "id" | "timestamp">) => {
      setRecentItems((prev) => {
        // 같은 제목의 항목이 있으면 제거
        const filtered = prev.filter((i) => i.title !== item.title);

        const newItem: RecentWorkItem = {
          ...item,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage]
  );

  // 특정 항목 제거
  const removeRecentWork = useCallback(
    (id: string) => {
      setRecentItems((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        saveToStorage(updated);
        return updated;
      });
    },
    [saveToStorage]
  );

  // 전체 삭제
  const clearRecentWork = useCallback(() => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recentItems,
    addRecentWork,
    removeRecentWork,
    clearRecentWork,
  };
}

// 타입별 라벨
export const WORK_TYPE_LABELS: Record<RecentWorkItem["type"], string> = {
  ddl: "DDL 변환",
  document: "문서 변환",
  data: "데이터 분석",
  json: "JSON",
  regex: "정규식",
  encoding: "인코딩",
  diff: "Diff",
};
