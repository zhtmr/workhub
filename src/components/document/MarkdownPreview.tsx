import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <Card className={cn("h-full overflow-auto", className)}>
      <div className="p-4">
        {content ? (
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                // 테이블 스타일링
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-border">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-4 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-4 py-2">{children}</td>
                ),
                // 코드 블록 스타일링
                pre: ({ children }) => (
                  <pre className="rounded-lg overflow-x-auto">{children}</pre>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                // 링크 스타일링
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {children}
                  </a>
                ),
                // 이미지 스타일링
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt}
                    className="max-w-full h-auto rounded-lg"
                  />
                ),
                // 인용구 스타일링
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                // 체크박스 스타일링 (GFM)
                input: ({ type, checked, ...props }) => {
                  if (type === "checkbox") {
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="mr-2"
                        {...props}
                      />
                    );
                  }
                  return <input type={type} {...props} />;
                },
                // 수평선
                hr: () => <hr className="my-4 border-border" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>미리보기가 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </Card>
  );
}
