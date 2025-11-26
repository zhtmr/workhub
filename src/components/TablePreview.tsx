import { Table } from "@/utils/ddlParser";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface TablePreviewProps {
  tables: Table[];
}

export function TablePreview({ tables }: TablePreviewProps) {
  if (tables.length === 0) {
    return (
      <Card className="p-8 bg-card">
        <div className="text-center text-muted-foreground">
          <p>파싱된 테이블이 없습니다.</p>
          <p className="text-sm mt-1">DDL을 입력하고 변환 버튼을 클릭해주세요.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">
            테이블 정의서 미리보기
          </h2>
          <Badge variant="secondary">{tables.length}개 테이블</Badge>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {tables.map((table, index) => (
            <AccordionItem key={index} value={`table-${index}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-foreground">
                    {table.name}
                  </span>
                  {table.comment && (
                    <span className="text-sm text-muted-foreground">
                      {table.comment}
                    </span>
                  )}
                  <Badge variant="outline" className="ml-2">
                    {table.columns.length} 컬럼
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <UITable>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">컬럼명</TableHead>
                        <TableHead className="font-semibold">데이터타입</TableHead>
                        <TableHead className="font-semibold text-center">NULL</TableHead>
                        <TableHead className="font-semibold text-center">키</TableHead>
                        <TableHead className="font-semibold">기본값</TableHead>
                        <TableHead className="font-semibold">설명</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.columns.map((column, colIndex) => (
                        <TableRow key={colIndex}>
                          <TableCell className="font-mono font-medium">
                            {column.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {column.dataType}
                          </TableCell>
                          <TableCell className="text-center">
                            {column.nullable ? (
                              <Badge variant="outline" className="text-xs">Y</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">N</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {column.key && (
                              <Badge variant="default" className="text-xs">
                                {column.key}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {column.defaultValue || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {column.comment || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </UITable>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Card>
  );
}
