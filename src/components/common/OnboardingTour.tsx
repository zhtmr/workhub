import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS 선택자
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "WorkHub에 오신 것을 환영합니다!",
    description:
      "WorkHub는 개발자를 위한 다양한 도구를 제공합니다. 간단한 투어를 통해 주요 기능을 알아보세요.",
    position: "center",
  },
  {
    title: "DDL 변환기",
    description:
      "SQL DDL을 엑셀 테이블 정의서로 변환하고, ERD를 자동 생성할 수 있습니다.",
    target: "[data-tour='ddl']",
    position: "right",
  },
  {
    title: "문서 변환",
    description:
      "Markdown 문서를 작성하고 실시간 미리보기를 확인할 수 있습니다.",
    target: "[data-tour='document']",
    position: "right",
  },
  {
    title: "데이터 분석",
    description:
      "CSV/Excel 파일을 업로드하여 차트, 통계, 피벗 테이블을 생성할 수 있습니다.",
    target: "[data-tour='data']",
    position: "right",
  },
  {
    title: "개발 도구",
    description:
      "JSON 뷰어, 정규식 테스터, 인코딩 도구, Diff 비교 등 다양한 개발 도구를 제공합니다.",
    target: "[data-tour='tools']",
    position: "right",
  },
  {
    title: "명령 팔레트",
    description:
      "Ctrl+K를 눌러 명령 팔레트를 열고, 빠르게 페이지를 이동하거나 설정을 변경할 수 있습니다.",
    position: "center",
  },
  {
    title: "파일 드래그 앤 드롭",
    description:
      "어디서든 파일을 드래그하여 놓으면 해당 파일에 맞는 도구로 자동 이동합니다.",
    position: "center",
  },
  {
    title: "준비 완료!",
    description:
      "이제 WorkHub의 모든 기능을 사용할 수 있습니다. 설정에서 다크 모드를 변경하거나, 히스토리에서 이전 작업을 확인할 수 있습니다.",
    position: "center",
  },
];

const STORAGE_KEY = "workhub_onboarding_completed";

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 최초 방문 확인
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // 약간의 딜레이 후 시작
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 투어 카드 */}
      <div
        className={cn(
          "absolute bg-background border rounded-lg shadow-2xl p-6 max-w-md w-full",
          step.position === "center" &&
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 아이콘 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* 내용 */}
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{step.description}</p>

        {/* 진행 바 */}
        <div className="flex gap-1 mb-4">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                idx <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            건너뛰기
          </Button>

          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? (
                "시작하기"
              ) : (
                <>
                  다음
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 수동으로 투어 시작
export function resetOnboardingTour() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
