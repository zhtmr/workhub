import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Calendar, Table, Columns, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DdlHistory } from '@/types/database';

interface HistoryCardProps {
  history: DdlHistory;
  onDelete: (id: string) => void;
  onView: (history: DdlHistory) => void;
}

export function HistoryCard({ history, onDelete, onView }: HistoryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDbTypeBadge = (dbType: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      mysql: 'default',
      postgresql: 'secondary',
      auto: 'outline',
    };
    return (
      <Badge variant={variants[dbType.toLowerCase()] || 'outline'}>
        {dbType.toUpperCase()}
      </Badge>
    );
  };

  const handleDelete = () => {
    onDelete(history.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {history.title || 'DDL 변환'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(history.created_at)}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(history)}>
                  <Eye className="mr-2 h-4 w-4" />
                  상세 보기
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 mb-3">
            {getDbTypeBadge(history.db_type)}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Table className="w-3.5 h-3.5" />
              <span>{history.table_count}개 테이블</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Columns className="w-3.5 h-3.5" />
              <span>{history.column_count}개 컬럼</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <pre className="text-xs text-muted-foreground overflow-hidden whitespace-pre-wrap line-clamp-3">
              {history.ddl_content.slice(0, 200)}
              {history.ddl_content.length > 200 && '...'}
            </pre>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => onView(history)}
          >
            <Eye className="mr-2 h-4 w-4" />
            DDL 변환기에서 보기
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>히스토리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
