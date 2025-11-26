import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface RegexFlags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
}

interface RegexInputProps {
  pattern: string;
  flags: RegexFlags;
  onPatternChange: (pattern: string) => void;
  onFlagsChange: (flags: RegexFlags) => void;
  isValid: boolean;
  error?: string;
  className?: string;
}

const FLAG_OPTIONS: { key: keyof RegexFlags; label: string; flag: string }[] = [
  { key: "global", label: "g", flag: "전역 매칭" },
  { key: "ignoreCase", label: "i", flag: "대소문자 무시" },
  { key: "multiline", label: "m", flag: "멀티라인" },
  { key: "dotAll", label: "s", flag: ". 줄바꿈 포함" },
  { key: "unicode", label: "u", flag: "유니코드" },
];

export function RegexInput({
  pattern,
  flags,
  onPatternChange,
  onFlagsChange,
  isValid,
  error,
  className,
}: RegexInputProps) {
  const handleFlagChange = (key: keyof RegexFlags, checked: boolean) => {
    onFlagsChange({ ...flags, [key]: checked });
  };

  const flagString = [
    flags.global && "g",
    flags.ignoreCase && "i",
    flags.multiline && "m",
    flags.dotAll && "s",
    flags.unicode && "u",
  ]
    .filter(Boolean)
    .join("");

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      {/* 정규식 입력 */}
      <div className="space-y-2">
        <Label>정규식 패턴</Label>
        <div className="flex items-center gap-2">
          <span className="text-lg text-muted-foreground font-mono">/</span>
          <Input
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder="패턴 입력..."
            className="font-mono flex-1"
          />
          <span className="text-lg text-muted-foreground font-mono">
            /{flagString}
          </span>
        </div>
      </div>

      {/* 플래그 옵션 */}
      <div className="space-y-2">
        <Label>플래그</Label>
        <div className="flex flex-wrap gap-4">
          {FLAG_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-center space-x-2">
              <Checkbox
                id={option.key}
                checked={flags[option.key]}
                onCheckedChange={(checked) =>
                  handleFlagChange(option.key, checked === true)
                }
              />
              <label
                htmlFor={option.key}
                className="text-sm cursor-pointer flex items-center gap-1"
              >
                <span className="font-mono font-bold">{option.label}</span>
                <span className="text-muted-foreground">({option.flag})</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 유효성 상태 */}
      {pattern && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm",
            isValid ? "text-green-600" : "text-red-600"
          )}
        >
          {isValid ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>유효한 정규식</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>{error || "유효하지 않은 정규식"}</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
