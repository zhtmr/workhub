import { useState, useMemo } from "react";
import { Regex } from "lucide-react";
import { RegexInput, type RegexFlags } from "@/components/regex/RegexInput";
import { TestTextArea } from "@/components/regex/TestTextArea";
import { MatchResults } from "@/components/regex/MatchResults";

const SAMPLE_TEXT = `Hello World!
안녕하세요, 반갑습니다.

이메일: user@example.com, admin@test.co.kr
전화번호: 010-1234-5678, 02-123-4567

URL: https://www.example.com/path?query=value
IP 주소: 192.168.0.1, 10.0.0.1

날짜: 2024-01-15, 2024/12/31
시간: 14:30:00, 09:15`;

const RegexTester = () => {
  const [pattern, setPattern] = useState("\\w+@\\w+\\.\\w+");
  const [flags, setFlags] = useState<RegexFlags>({
    global: true,
    ignoreCase: false,
    multiline: false,
    dotAll: false,
    unicode: false,
  });
  const [testText, setTestText] = useState(SAMPLE_TEXT);

  // 정규식 객체 생성
  const { regex, isValid, error } = useMemo(() => {
    if (!pattern) {
      return { regex: null, isValid: true, error: undefined };
    }

    try {
      const flagString = [
        flags.global && "g",
        flags.ignoreCase && "i",
        flags.multiline && "m",
        flags.dotAll && "s",
        flags.unicode && "u",
      ]
        .filter(Boolean)
        .join("");

      const regex = new RegExp(pattern, flagString);
      return { regex, isValid: true, error: undefined };
    } catch (e) {
      return {
        regex: null,
        isValid: false,
        error: (e as Error).message,
      };
    }
  }, [pattern, flags]);

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Regex className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">정규식 테스터</h1>
          <p className="text-sm text-muted-foreground">
            정규식 패턴을 테스트하고 매칭 결과를 확인하세요
          </p>
        </div>
      </div>

      {/* 레이아웃 */}
      <div className="space-y-4 h-[calc(100%-5rem)]">
        {/* 정규식 입력 */}
        <RegexInput
          pattern={pattern}
          flags={flags}
          onPatternChange={setPattern}
          onFlagsChange={setFlags}
          isValid={isValid}
          error={error}
        />

        {/* 테스트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-12rem)]">
          {/* 테스트 텍스트 */}
          <TestTextArea
            value={testText}
            onChange={setTestText}
            regex={regex}
            className="min-h-[300px]"
          />

          {/* 매칭 결과 */}
          <MatchResults
            regex={regex}
            testText={testText}
            className="min-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
};

export default RegexTester;
