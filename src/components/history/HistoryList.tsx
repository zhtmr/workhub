import { useNavigate } from 'react-router-dom';
import { History, Database, Loader2 } from 'lucide-react';
import { useHistory } from '@/hooks/use-history';
import { useAuth } from '@/providers/AuthProvider';
import { HistoryCard } from './HistoryCard';
import { Button } from '@/components/ui/button';
import type { DdlHistory } from '@/types/database';

export function HistoryList() {
  const { user } = useAuth();
  const { historyList, isLoading, deleteHistory } = useHistory();
  const navigate = useNavigate();

  const handleView = (history: DdlHistory) => {
    // Navigate to DDL converter with the history data
    navigate('/ddl-converter', {
      state: {
        ddlContent: history.ddl_content,
        dbType: history.db_type,
        fromHistory: true,
      },
    });
  };

  const handleDelete = async (id: string) => {
    await deleteHistory(id);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <History className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">로그인이 필요합니다</h3>
        <p className="text-muted-foreground mb-4">
          히스토리를 저장하고 관리하려면 로그인하세요.
        </p>
        <Button onClick={() => navigate('/auth')}>로그인</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (historyList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">히스토리가 없습니다</h3>
        <p className="text-muted-foreground mb-4">
          DDL을 변환하면 자동으로 히스토리에 저장됩니다.
        </p>
        <Button onClick={() => navigate('/ddl-converter')}>
          DDL 변환기로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {historyList.map((history) => (
        <HistoryCard
          key={history.id}
          history={history}
          onDelete={handleDelete}
          onView={handleView}
        />
      ))}
    </div>
  );
}
