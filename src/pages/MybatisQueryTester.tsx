import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Upload,
  Code,
  Play,
  Copy,
  AlertCircle,
  CheckCircle2,
  Plus,
  Settings,
  Trash2,
  Edit,
  RefreshCw,
  Loader2,
  FileSearch,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  parseMybatisXml,
  substituteParameters,
  getStatementTypeBadgeVariant,
  type MybatisStatement,
  type MybatisMapper,
} from "@/utils/mybatisParser";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useTeams } from "@/hooks/use-teams";
import {
  useDbConnections,
  type DbConnection,
  type InsertDbConnection,
  DB_TYPE_LABELS,
  isPrivateOrLocalHost,
} from "@/hooks/use-db-connections";
import {
  DbConnectionDialog,
  ConnectionTestBadge,
  ResultTable,
  ExplainViewer,
  QueryHistoryList,
} from "@/components/mybatis";
import { useQueryExecution } from "@/hooks/use-query-execution";
import {
  getProxyUrl,
  setProxyUrl,
  clearProxyUrl,
  isProxyMode,
  checkProxyHealth,
  isElectronEnvironment,
  type ProxyConnectionInfo,
} from "@/lib/proxy-config";
import { getEmbeddedProxyUrl } from "@/lib/electron-bridge";
import { supabaseFetch, type QueryExecutionResult } from "@/lib/supabase-fetch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MybatisQueryTester = () => {
  const { user, session } = useAuth();
  const { teams, isLoading: teamsLoading } = useTeams();
  const queryClient = useQueryClient();

  // Team & Connection state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DbConnection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<DbConnection | null>(null);

  // DB Connections hook
  const {
    connections,
    isLoading: connectionsLoading,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    isCreating,
    isUpdating,
    isDeleting,
    isTesting,
  } = useDbConnections(selectedTeamId);

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || null;

  // Query execution hook
  const {
    executeQuery,
    executeExplain,
    lastResult,
    isExecuting,
    clearResult,
  } = useQueryExecution();

  // Proxy state
  const [proxyDialogOpen, setProxyDialogOpen] = useState(false);
  const [proxyUrlInput, setProxyUrlInput] = useState("");
  const [proxyHealthy, setProxyHealthy] = useState<boolean | null>(null);
  const [proxyChecking, setProxyChecking] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyResult, setProxyResult] = useState<QueryExecutionResult | null>(null);
  const [isProxyExecuting, setIsProxyExecuting] = useState(false);

  // XML Parser state
  const [xmlContent, setXmlContent] = useState<string>("");
  const [mapper, setMapper] = useState<MybatisMapper | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<MybatisStatement | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [generatedSql, setGeneratedSql] = useState<string>("");

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Initialize proxy state (Electron 환경 자동 감지)
  useEffect(() => {
    const initProxy = async () => {
      // Electron 환경이면 내장 프록시 자동 사용
      if (isElectronEnvironment()) {
        const embeddedUrl = await getEmbeddedProxyUrl();
        if (embeddedUrl) {
          setProxyUrlInput(embeddedUrl);
          setProxyEnabled(true);
          // 내장 프록시 헬스 체크
          checkProxyHealth(embeddedUrl).then(({ healthy }) => {
            setProxyHealthy(healthy);
          });
          return;
        }
      }

      // 일반 웹 환경: localStorage에서 프록시 URL 로드
      const savedUrl = getProxyUrl();
      if (savedUrl) {
        setProxyUrlInput(savedUrl);
        setProxyEnabled(true);
        checkProxyHealth(savedUrl).then(({ healthy }) => {
          setProxyHealthy(healthy);
        });
      }
    };

    initProxy();
  }, []);

  // Connection handlers
  const handleCreateConnection = useCallback(
    async (data: InsertDbConnection) => {
      await createConnection(data);
      setConnectionDialogOpen(false);
      setEditingConnection(null);
    },
    [createConnection]
  );

  const handleUpdateConnection = useCallback(
    async (data: InsertDbConnection) => {
      if (!editingConnection) return;
      await updateConnection(editingConnection.id, data);
      setConnectionDialogOpen(false);
      setEditingConnection(null);
    },
    [editingConnection, updateConnection]
  );

  const handleDeleteConnection = useCallback(async () => {
    if (!connectionToDelete) return;
    await deleteConnection(connectionToDelete.id);
    if (selectedConnectionId === connectionToDelete.id) {
      setSelectedConnectionId(null);
    }
    setDeleteDialogOpen(false);
    setConnectionToDelete(null);
  }, [connectionToDelete, deleteConnection, selectedConnectionId]);

  const handleTestConnection = useCallback(
    async (id: string) => {
      // 연결 정보에서 호스트 찾기
      const connection = connections.find((c) => c.id === id);
      if (!connection) {
        toast.error("연결 정보를 찾을 수 없습니다");
        return;
      }

      // 내부망/로컬 IP 체크
      const { isPrivate, reason } = isPrivateOrLocalHost(connection.host);
      if (isPrivate) {
        // Electron 환경이면 내장 프록시 URL 가져오기, 아니면 저장된 URL 사용
        let proxyUrl = isElectronEnvironment()
          ? await getEmbeddedProxyUrl()
          : getProxyUrl();

        if (proxyUrl && proxyEnabled) {
          toast.info("프록시 서버를 통해 연결 테스트 중...");
          const proxyConnection: ProxyConnectionInfo = {
            db_type: connection.db_type,
            host: connection.host,
            port: connection.port,
            database_name: connection.database_name,
            username: connection.username,
            password: connection.password_encrypted || "", // 암호화된 비밀번호 사용
          };
          const { data, error } = await supabaseFetch.testConnectionViaProxy(proxyUrl, proxyConnection);

          // 프록시 테스트 결과를 DB에 저장 (boolean만 저장)
          const testSuccess = error ? false : (data?.success ?? false);

          try {
            await updateConnection(id, {
              last_tested_at: new Date().toISOString(),
              last_test_result: testSuccess,
            }, { silent: true });
          } catch (updateError) {
            console.error("테스트 결과 저장 실패:", updateError);
          }

          if (error) {
            toast.error(`연결 테스트 실패: ${error.message}`);
          } else if (data?.success) {
            toast.success(`연결 성공: ${data.serverVersion || ""}`);
          } else {
            toast.error(data?.message || "연결 테스트 실패");
          }
          return;
        }
        toast.warning(reason + " 프록시 서버를 설정하세요.");
        return;
      }

      await testConnection(id);
    },
    [testConnection, connections, proxyEnabled, updateConnection]
  );

  const openEditDialog = useCallback((connection: DbConnection) => {
    setEditingConnection(connection);
    setConnectionDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((connection: DbConnection) => {
    setConnectionToDelete(connection);
    setDeleteDialogOpen(true);
  }, []);

  // Proxy handlers
  const handleCheckProxyHealth = useCallback(async () => {
    if (!proxyUrlInput.trim()) {
      toast.error("프록시 URL을 입력해주세요");
      return;
    }

    setProxyChecking(true);
    try {
      const { healthy, message } = await checkProxyHealth(proxyUrlInput.trim());
      setProxyHealthy(healthy);
      if (healthy) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } finally {
      setProxyChecking(false);
    }
  }, [proxyUrlInput]);

  const handleSaveProxyUrl = useCallback(() => {
    if (!proxyUrlInput.trim()) {
      toast.error("프록시 URL을 입력해주세요");
      return;
    }

    setProxyUrl(proxyUrlInput.trim());
    setProxyEnabled(true);
    toast.success("프록시 URL이 저장되었습니다");
    setProxyDialogOpen(false);
  }, [proxyUrlInput]);

  const handleClearProxyUrl = useCallback(() => {
    clearProxyUrl();
    setProxyUrlInput("");
    setProxyEnabled(false);
    setProxyHealthy(null);
    toast.success("프록시 설정이 해제되었습니다");
    setProxyDialogOpen(false);
  }, []);

  // XML 파싱
  const handleParse = useCallback(() => {
    if (!xmlContent.trim()) {
      toast.error("XML 내용을 입력해주세요");
      return;
    }

    const result = parseMybatisXml(xmlContent);
    setMapper(result.mapper);
    setParseErrors(result.errors);
    setParseWarnings(result.warnings);
    setSelectedStatement(null);
    setParameterValues({});
    setGeneratedSql("");

    if (result.mapper) {
      toast.success(`파싱 완료: ${result.mapper.statements.length}개 쿼리 발견`);
    } else {
      toast.error("파싱 실패");
    }
  }, [xmlContent]);

  // 파일 업로드
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml")) {
      toast.error("XML 파일만 업로드 가능합니다");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      toast.success(`${file.name} 로드 완료`);
    };
    reader.onerror = () => {
      toast.error("파일 읽기 실패");
    };
    reader.readAsText(file);
  }, []);

  // Statement 선택
  const handleSelectStatement = useCallback((statement: MybatisStatement) => {
    setSelectedStatement(statement);
    // 파라미터 초기값 설정
    const initialParams: Record<string, string> = {};
    statement.parameters.forEach((p) => {
      initialParams[p.name] = "";
    });
    setParameterValues(initialParams);
    setGeneratedSql("");
  }, []);

  // SQL 생성
  const handleGenerateSql = useCallback(() => {
    if (!selectedStatement) return;

    // 파라미터 타입 변환
    const typedParams: Record<string, string | number | boolean | null> = {};
    Object.entries(parameterValues).forEach(([key, value]) => {
      if (value === "") {
        typedParams[key] = null;
      } else if (value === "true" || value === "false") {
        typedParams[key] = value === "true";
      } else if (!isNaN(Number(value))) {
        typedParams[key] = Number(value);
      } else {
        typedParams[key] = value;
      }
    });

    const sql = substituteParameters(selectedStatement.sql, typedParams);
    setGeneratedSql(sql);
    toast.success("SQL 생성 완료");
  }, [selectedStatement, parameterValues]);

  // 클립보드 복사
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("복사되었습니다");
    } catch {
      toast.error("복사 실패");
    }
  }, []);

  // 쿼리 실행
  const handleExecuteQuery = useCallback(async () => {
    if (!selectedConnectionId || !generatedSql.trim()) {
      toast.error("DB 연결과 SQL을 확인해주세요");
      return;
    }

    // 내부망/로컬 IP 체크
    if (selectedConnection) {
      const { isPrivate, reason } = isPrivateOrLocalHost(selectedConnection.host);
      if (isPrivate) {
        // Electron 환경이면 내장 프록시 URL 가져오기, 아니면 저장된 URL 사용
        const proxyUrl = isElectronEnvironment()
          ? await getEmbeddedProxyUrl()
          : getProxyUrl();

        if (proxyUrl && proxyEnabled) {
          setIsProxyExecuting(true);
          setProxyResult(null);
          try {
            const proxyConnection: ProxyConnectionInfo = {
              db_type: selectedConnection.db_type,
              host: selectedConnection.host,
              port: selectedConnection.port,
              database_name: selectedConnection.database_name,
              username: selectedConnection.username,
              password: selectedConnection.password_encrypted || "",
            };
            const { data, error } = await supabaseFetch.executeQueryViaProxy(
              proxyUrl,
              proxyConnection,
              generatedSql.trim()
            );

            // 쿼리 이력 저장
            if (user) {
              try {
                await supabaseFetch.saveQueryHistory({
                  connection_id: selectedConnectionId,
                  statement_id: selectedStatement?.id || null,
                  sql_query: generatedSql.trim(),
                  result_row_count: data?.rowCount || null,
                  execution_time_ms: data?.executionTimeMs || null,
                  error_message: error?.message || null,
                  executed_by: user.id,
                }, session?.access_token);

                // 이력 캐시 무효화
                queryClient.invalidateQueries({
                  queryKey: ["query-history", selectedConnectionId],
                });
              } catch (historyError) {
                console.error("쿼리 이력 저장 실패:", historyError);
              }
            }

            if (error) {
              toast.error(`쿼리 실행 실패: ${error.message}`);
            } else if (data) {
              setProxyResult(data);
              if (data.warning) {
                toast.warning(data.warning);
              } else {
                toast.success(`쿼리 실행 완료 (${data.rowCount}행, ${data.executionTimeMs}ms)`);
              }
            }
          } finally {
            setIsProxyExecuting(false);
          }
          return;
        }
        toast.warning(reason + " 프록시 서버를 설정하세요.");
        return;
      }
    }

    try {
      setProxyResult(null); // Clear proxy result when using edge function
      await executeQuery(selectedConnectionId, generatedSql.trim(), {
        statementId: selectedStatement?.id,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  }, [selectedConnectionId, generatedSql, selectedConnection, executeQuery, selectedStatement?.id, proxyEnabled, user, session?.access_token, queryClient]);

  // EXPLAIN 실행
  const handleExecuteExplain = useCallback(async () => {
    if (!selectedConnectionId || !generatedSql.trim()) {
      toast.error("DB 연결과 SQL을 확인해주세요");
      return;
    }

    // 내부망/로컬 IP 체크
    if (selectedConnection) {
      const { isPrivate, reason } = isPrivateOrLocalHost(selectedConnection.host);
      if (isPrivate) {
        // Electron 환경이면 내장 프록시 URL 가져오기, 아니면 저장된 URL 사용
        const proxyUrl = isElectronEnvironment()
          ? await getEmbeddedProxyUrl()
          : getProxyUrl();

        if (proxyUrl && proxyEnabled) {
          setIsProxyExecuting(true);
          setProxyResult(null);
          try {
            const proxyConnection: ProxyConnectionInfo = {
              db_type: selectedConnection.db_type,
              host: selectedConnection.host,
              port: selectedConnection.port,
              database_name: selectedConnection.database_name,
              username: selectedConnection.username,
              password: selectedConnection.password_encrypted || "",
            };
            const { data, error } = await supabaseFetch.executeQueryViaProxy(
              proxyUrl,
              proxyConnection,
              generatedSql.trim(),
              { explainOnly: true }
            );

            // 쿼리 이력 저장 (EXPLAIN도 이력에 기록)
            if (user) {
              try {
                await supabaseFetch.saveQueryHistory({
                  connection_id: selectedConnectionId,
                  statement_id: selectedStatement?.id || null,
                  sql_query: `EXPLAIN ${generatedSql.trim()}`,
                  result_row_count: null,
                  execution_time_ms: data?.executionTimeMs || null,
                  error_message: error?.message || null,
                  executed_by: user.id,
                }, session?.access_token);

                // 이력 캐시 무효화
                queryClient.invalidateQueries({
                  queryKey: ["query-history", selectedConnectionId],
                });
              } catch (historyError) {
                console.error("쿼리 이력 저장 실패:", historyError);
              }
            }

            if (error) {
              toast.error(`실행 계획 조회 실패: ${error.message}`);
            } else if (data) {
              setProxyResult(data);
              toast.success("실행 계획 조회 완료");
            }
          } finally {
            setIsProxyExecuting(false);
          }
          return;
        }
        toast.warning(reason + " 프록시 서버를 설정하세요.");
        return;
      }
    }

    try {
      setProxyResult(null); // Clear proxy result when using edge function
      await executeExplain(selectedConnectionId, generatedSql.trim(), {
        statementId: selectedStatement?.id,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  }, [selectedConnectionId, generatedSql, selectedConnection, executeExplain, selectedStatement?.id, proxyEnabled, user, session?.access_token, queryClient]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">MyBatis 쿼리 테스터</h1>
            <p className="text-sm text-muted-foreground">
              MyBatis XML 매퍼를 파싱하고 쿼리를 테스트하세요
            </p>
          </div>
        </div>

        {/* 팀 & DB 연결 선택 */}
        {user && (
          <div className="flex items-center gap-3">
            {/* 팀 선택 */}
            <Select
              value={selectedTeamId || ""}
              onValueChange={(v) => {
                setSelectedTeamId(v);
                setSelectedConnectionId(null);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="팀 선택" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* DB 연결 선택 */}
            <Select
              value={selectedConnectionId || ""}
              onValueChange={setSelectedConnectionId}
              disabled={!selectedTeamId || connectionsLoading}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="DB 연결 선택" />
              </SelectTrigger>
              <SelectContent>
                {connections
                  .filter((c) => c.is_active)
                  .map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {DB_TYPE_LABELS[conn.db_type]}
                        </Badge>
                        {conn.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* 연결 관리 버튼 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setEditingConnection(null);
                setConnectionDialogOpen(true);
              }}
              disabled={!selectedTeamId}
            >
              <Plus className="w-4 h-4" />
            </Button>

            {/* 프록시 설정 버튼 */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l">
              {proxyEnabled && (
                <Badge
                  variant={proxyHealthy ? "default" : proxyHealthy === false ? "destructive" : "secondary"}
                  className="gap-1"
                >
                  {proxyHealthy ? (
                    <Wifi className="w-3 h-3" />
                  ) : proxyHealthy === false ? (
                    <WifiOff className="w-3 h-3" />
                  ) : (
                    <Server className="w-3 h-3" />
                  )}
                  프록시
                </Badge>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setProxyDialogOpen(true)}
                title="프록시 서버 설정"
              >
                <Server className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 선택된 연결 정보 */}
      {selectedConnection && (
        <Card className="mb-6">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{DB_TYPE_LABELS[selectedConnection.db_type]}</Badge>
                  <span className="font-medium">{selectedConnection.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedConnection.host}:{selectedConnection.port} / {selectedConnection.database_name}
                </div>
                <ConnectionTestBadge
                  lastTestedAt={selectedConnection.last_tested_at}
                  lastTestResult={selectedConnection.last_test_result}
                />
                {selectedConnection.is_read_only && (
                  <Badge variant="secondary" className="text-xs">
                    읽기 전용
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestConnection(selectedConnection.id)}
                  disabled={isTesting}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-1", isTesting && "animate-spin")} />
                  {isTesting ? "테스트 중..." : "테스트"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(selectedConnection)}>
                      <Edit className="w-4 h-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(selectedConnection)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: XML 입력 */}
        <div className="lg:col-span-1">
          <Card className="h-[550px] flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="w-5 h-5" />
                XML 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
              {/* 파일 업로드 */}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" asChild>
                  <label>
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".xml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>

              {/* XML 에디터 */}
              <Textarea
                value={xmlContent}
                onChange={(e) => setXmlContent(e.target.value)}
                placeholder={`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">
  <select id="findById" resultType="User">
    SELECT * FROM users WHERE id = #{id}
  </select>
</mapper>`}
                className="font-mono text-sm flex-1 min-h-0 resize-none"
              />

              <Button onClick={handleParse} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                파싱
              </Button>

              {/* 에러/경고 표시 */}
              {parseErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    {parseErrors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {parseWarnings.length > 0 && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    {parseWarnings.map((warn, i) => (
                      <div key={i}>{warn}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 중간: Statement 목록 */}
        <div className="lg:col-span-1">
          <Card className="h-[550px] flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                쿼리 목록
                {mapper && (
                  <Badge variant="secondary" className="ml-auto">
                    {mapper.statements.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden">
              {mapper ? (
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {/* Namespace */}
                    <div className="text-xs text-muted-foreground mb-3">
                      <span className="font-medium">Namespace:</span>{" "}
                      {mapper.namespace || "(없음)"}
                    </div>

                    {/* ResultMaps */}
                    {mapper.resultMaps.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          ResultMaps
                        </div>
                        {mapper.resultMaps.map((rm) => (
                          <div
                            key={rm.id}
                            className="text-xs p-2 bg-muted/50 rounded mb-1"
                          >
                            <span className="font-medium">{rm.id}</span>
                            <span className="text-muted-foreground ml-2">→ {rm.type}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator className="my-3" />

                    {/* Statements */}
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Statements
                    </div>
                    {mapper.statements.map((stmt) => (
                      <div
                        key={stmt.id}
                        onClick={() => handleSelectStatement(stmt)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedStatement?.id === stmt.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{stmt.id}</span>
                          <Badge variant={getStatementTypeBadgeVariant(stmt.type)}>
                            {stmt.type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {stmt.sql.substring(0, 50)}...
                        </div>
                        {stmt.parameters.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {stmt.parameters.slice(0, 3).map((p) => (
                              <Badge key={p.name} variant="outline" className="text-xs">
                                #{p.name}
                              </Badge>
                            ))}
                            {stmt.parameters.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{stmt.parameters.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Database className="w-12 h-12 mb-4 opacity-20" />
                  <p>XML을 파싱하면 쿼리 목록이 표시됩니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 상세 및 SQL 생성 */}
        <div className="lg:col-span-1">
          <Card className="h-[550px] flex flex-col">
            {selectedStatement ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Statement 상세 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-lg">{selectedStatement.id}</span>
                      <Badge variant={getStatementTypeBadgeVariant(selectedStatement.type)}>
                        {selectedStatement.type.toUpperCase()}
                      </Badge>
                    </div>

                    <Tabs defaultValue="sql">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="sql">SQL</TabsTrigger>
                        <TabsTrigger value="xml">원본 XML</TabsTrigger>
                      </TabsList>
                      <TabsContent value="sql" className="mt-3">
                        <div className="relative">
                          <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                            {selectedStatement.sql}
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(selectedStatement.sql)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="xml" className="mt-3">
                        <div className="relative">
                          <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                            {selectedStatement.rawXml}
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(selectedStatement.rawXml)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* 메타 정보 */}
                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                      {selectedStatement.parameterType && (
                        <div>
                          <span className="font-medium">parameterType:</span>{" "}
                          {selectedStatement.parameterType}
                        </div>
                      )}
                      {selectedStatement.resultType && (
                        <div>
                          <span className="font-medium">resultType:</span>{" "}
                          {selectedStatement.resultType}
                        </div>
                      )}
                      {selectedStatement.resultMap && (
                        <div>
                          <span className="font-medium">resultMap:</span>{" "}
                          {selectedStatement.resultMap}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* 파라미터 입력 */}
                  {selectedStatement.parameters.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">파라미터 입력</h4>
                      {selectedStatement.parameters.map((param) => (
                        <div key={param.name} className="space-y-1">
                          <Label className="text-sm">
                            #{param.name}
                            {param.jdbcType && (
                              <span className="text-muted-foreground ml-2">
                                ({param.jdbcType})
                              </span>
                            )}
                          </Label>
                          <Input
                            value={parameterValues[param.name] || ""}
                            onChange={(e) =>
                              setParameterValues((prev) => ({
                                ...prev,
                                [param.name]: e.target.value,
                              }))
                            }
                            placeholder={`${param.name} 값 입력`}
                          />
                        </div>
                      ))}

                      <Button onClick={handleGenerateSql} className="w-full mt-2">
                        <Play className="w-4 h-4 mr-2" />
                        SQL 생성
                      </Button>
                    </div>
                  )}

                  {/* 파라미터가 없는 경우 바로 SQL 생성 버튼 */}
                  {selectedStatement.parameters.length === 0 && !generatedSql && (
                    <Button onClick={handleGenerateSql} className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      SQL 생성
                    </Button>
                  )}

                  {/* 생성된 SQL */}
                  {generatedSql && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <h4 className="font-medium text-sm">생성된 SQL</h4>
                        </div>
                        <div className="relative">
                          <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[120px]">
                            {generatedSql}
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(generatedSql)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* 실행 버튼 */}
                        {selectedConnection && (
                          <div className="flex gap-2">
                            <Button
                              onClick={handleExecuteQuery}
                              disabled={isExecuting || isProxyExecuting || !selectedConnectionId}
                              className="flex-1"
                              size="sm"
                            >
                              {(isExecuting || isProxyExecuting) ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4 mr-2" />
                              )}
                              실행
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleExecuteExplain}
                              disabled={isExecuting || isProxyExecuting || !selectedConnectionId}
                              size="sm"
                            >
                              {(isExecuting || isProxyExecuting) ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <FileSearch className="w-4 h-4 mr-2" />
                              )}
                              EXPLAIN
                            </Button>
                          </div>
                        )}

                        {!selectedConnection && (
                          <Alert>
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription className="text-xs">
                              쿼리를 실행하려면 DB 연결을 선택하세요
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Database className="w-12 h-12 mb-4 opacity-20" />
                <p>쿼리를 선택하면 상세 정보가 표시됩니다</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* 하단: 쿼리 결과 영역 */}
      {(proxyResult || lastResult) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 쿼리 결과 - rows가 있을 때만 표시 */}
          {(proxyResult?.rows?.length || lastResult?.rows?.length) ? (
            <div className={cn(
              (proxyResult?.explainPlan || lastResult?.explainPlan)
                ? "lg:col-span-2"
                : "lg:col-span-3"
            )}>
              <ResultTable
                result={proxyResult || lastResult}
                isLoading={isExecuting || isProxyExecuting}
              />
            </div>
          ) : null}

          {/* EXPLAIN 결과 */}
          {(proxyResult?.explainPlan || lastResult?.explainPlan) && (
            <div className={cn(
              (proxyResult?.rows?.length || lastResult?.rows?.length)
                ? "lg:col-span-1"
                : "lg:col-span-3"
            )}>
              <ExplainViewer
                result={proxyResult || lastResult}
                dbType={selectedConnection?.db_type as "postgresql" | "mysql" | "oracle" | "mssql"}
              />
            </div>
          )}
        </div>
      )}

      {/* 하단: 쿼리 실행 이력 */}
      {selectedConnectionId && (
        <QueryHistoryList
          connectionId={selectedConnectionId}
          onSelectQuery={(sql) => setGeneratedSql(sql)}
        />
      )}

      {/* DB 연결 다이얼로그 */}
      {selectedTeamId && (
        <DbConnectionDialog
          open={connectionDialogOpen}
          onOpenChange={(open) => {
            setConnectionDialogOpen(open);
            if (!open) setEditingConnection(null);
          }}
          teamId={selectedTeamId}
          connection={editingConnection}
          onSubmit={editingConnection ? handleUpdateConnection : handleCreateConnection}
          isSubmitting={isCreating || isUpdating}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>DB 연결 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{connectionToDelete?.name}&quot; 연결을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 프록시 설정 다이얼로그 */}
      <Dialog open={proxyDialogOpen} onOpenChange={setProxyDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              프록시 서버 설정
            </DialogTitle>
            <DialogDescription>
              내부망 DB(192.168.x.x 등)에 접근하려면 프록시 서버를 설정하세요.
              프록시 서버는 내부망에서 실행되어야 합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 현재 상태 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">프록시 모드</span>
              <Badge variant={proxyEnabled ? (proxyHealthy ? "default" : "destructive") : "secondary"}>
                {proxyEnabled
                  ? proxyHealthy
                    ? "활성 (연결됨)"
                    : proxyHealthy === false
                    ? "활성 (연결 실패)"
                    : "활성 (미확인)"
                  : "비활성"}
              </Badge>
            </div>

            {/* URL 입력 */}
            <div className="space-y-2">
              <Label htmlFor="proxy-url">프록시 서버 URL</Label>
              <div className="flex gap-2">
                <Input
                  id="proxy-url"
                  value={proxyUrlInput}
                  onChange={(e) => setProxyUrlInput(e.target.value)}
                  placeholder="http://192.168.1.100:3001"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleCheckProxyHealth}
                  disabled={proxyChecking || !proxyUrlInput.trim()}
                >
                  {proxyChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                프록시 서버 주소를 입력하세요 (예: http://localhost:3001)
              </p>
            </div>

            {/* 헬스 체크 결과 */}
            {proxyHealthy !== null && (
              <Alert variant={proxyHealthy ? "default" : "destructive"}>
                {proxyHealthy ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  {proxyHealthy
                    ? "프록시 서버에 연결되었습니다"
                    : "프록시 서버에 연결할 수 없습니다"}
                </AlertDescription>
              </Alert>
            )}

            {/* 안내 문구 */}
            <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg border">
              <p className="font-medium">프록시 서버 실행 방법:</p>
              <code className="block bg-muted p-2 rounded text-xs">
                cd server && npm install && npm run dev
              </code>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {proxyEnabled && (
              <Button variant="outline" onClick={handleClearProxyUrl}>
                설정 해제
              </Button>
            )}
            <Button onClick={handleSaveProxyUrl} disabled={!proxyUrlInput.trim()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MybatisQueryTester;
