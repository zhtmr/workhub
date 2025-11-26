import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getJsonValueType } from "@/utils/jsonUtils";

interface JsonTreeViewProps {
  data: unknown;
  className?: string;
}

interface TreeNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  isLast: boolean;
}

function TreeNode({ keyName, value, depth, isLast }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const valueType = getJsonValueType(value);
  const isExpandable = valueType === "object" || valueType === "array";

  const toggleExpand = useCallback(() => {
    if (isExpandable) {
      setIsExpanded((prev) => !prev);
    }
  }, [isExpandable]);

  const renderValue = () => {
    switch (valueType) {
      case "string":
        return (
          <span className="text-green-600 dark:text-green-400">
            "{String(value)}"
          </span>
        );
      case "number":
        return (
          <span className="text-blue-600 dark:text-blue-400">
            {String(value)}
          </span>
        );
      case "boolean":
        return (
          <span className="text-purple-600 dark:text-purple-400">
            {String(value)}
          </span>
        );
      case "null":
        return (
          <span className="text-gray-500 dark:text-gray-400 italic">null</span>
        );
      case "array":
        return (
          <span className="text-muted-foreground">
            Array[{(value as unknown[]).length}]
          </span>
        );
      case "object":
        return (
          <span className="text-muted-foreground">
            Object{`{${Object.keys(value as object).length}}`}
          </span>
        );
      default:
        return <span>{String(value)}</span>;
    }
  };

  const renderChildren = () => {
    if (!isExpandable || !isExpanded) return null;

    if (valueType === "array") {
      const arr = value as unknown[];
      return (
        <div className="ml-4 border-l border-border pl-2">
          {arr.map((item, index) => (
            <TreeNode
              key={index}
              keyName={String(index)}
              value={item}
              depth={depth + 1}
              isLast={index === arr.length - 1}
            />
          ))}
        </div>
      );
    }

    if (valueType === "object") {
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj);
      return (
        <div className="ml-4 border-l border-border pl-2">
          {entries.map(([key, val], index) => (
            <TreeNode
              key={key}
              keyName={key}
              value={val}
              depth={depth + 1}
              isLast={index === entries.length - 1}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="font-mono text-sm">
      <div
        className={cn(
          "flex items-center py-0.5 hover:bg-muted/50 rounded cursor-default",
          isExpandable && "cursor-pointer"
        )}
        onClick={toggleExpand}
      >
        {/* 확장/축소 아이콘 */}
        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {isExpandable &&
            (isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            ))}
        </span>

        {/* 키 이름 */}
        {keyName !== undefined && (
          <>
            <span className="text-amber-600 dark:text-amber-400">
              {keyName}
            </span>
            <span className="text-muted-foreground mx-1">:</span>
          </>
        )}

        {/* 값 */}
        {renderValue()}
      </div>

      {/* 자식 노드 */}
      {renderChildren()}
    </div>
  );
}

export function JsonTreeView({ data, className }: JsonTreeViewProps) {
  if (data === undefined || data === null) {
    return (
      <Card className={cn("p-4 text-center text-muted-foreground", className)}>
        표시할 데이터가 없습니다.
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 overflow-auto", className)}>
      <TreeNode value={data} depth={0} isLast={true} />
    </Card>
  );
}
