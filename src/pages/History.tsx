import { History as HistoryIcon, RefreshCw } from 'lucide-react';
import { useHistory } from '@/hooks/use-history';
import { HistoryList } from '@/components/history/HistoryList';
import { Button } from '@/components/ui/button';

const History = () => {
  const { refetch, isLoading } = useHistory();

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <HistoryIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">작업 히스토리</h1>
              <p className="text-sm text-muted-foreground">
                이전에 변환한 DDL 기록을 확인하고 다시 사용할 수 있습니다.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* History List */}
      <HistoryList />
    </div>
  );
};

export default History;
