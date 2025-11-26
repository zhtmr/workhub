import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Database, 
  FileSpreadsheet, 
  TrendingUp, 
  Clock,
  ArrowRight
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const tools = [
    {
      title: "DDL 변환기",
      description: "DDL 파일을 테이블 정의서 엑셀로 변환",
      icon: Database,
      path: "/ddl-converter",
      available: true,
      stats: { label: "최근 변환", value: "0" }
    },
    {
      title: "엑셀 도구",
      description: "엑셀 파일 병합, 분할, 데이터 정제",
      icon: FileSpreadsheet,
      path: "/excel-tools",
      available: false,
      stats: { label: "준비 중", value: "-" }
    },
    {
      title: "데이터 분석",
      description: "데이터 시각화 및 통계 분석",
      icon: TrendingUp,
      path: "/data-analysis",
      available: false,
      stats: { label: "준비 중", value: "-" }
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
        <p className="text-muted-foreground">
          업무 효율을 높여주는 다양한 도구를 한 곳에서 관리하세요.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">사용 가능한 도구</p>
              <p className="text-2xl font-bold text-foreground mt-2">1개</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">개발 예정</p>
              <p className="text-2xl font-bold text-foreground mt-2">3개</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 도구</p>
              <p className="text-2xl font-bold text-foreground mt-2">4개</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent-foreground" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tools Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">업무 도구</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Card 
              key={tool.title} 
              className={`p-6 bg-card transition-all ${
                tool.available 
                  ? "hover:shadow-lg cursor-pointer border-border hover:border-primary/50" 
                  : "opacity-60"
              }`}
              onClick={() => tool.available && navigate(tool.path)}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <tool.icon className="w-6 h-6 text-primary" />
                  </div>
                  {!tool.available && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      예정
                    </span>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">{tool.stats.label}</p>
                    <p className="text-sm font-medium text-foreground">{tool.stats.value}</p>
                  </div>
                  {tool.available && (
                    <Button variant="ghost" size="sm">
                      시작하기
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Start Guide */}
      <Card className="p-6 bg-card border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">💡</span>
            </div>
            <h3 className="font-semibold text-foreground">시작하기</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            DDL 변환기를 사용하여 데이터베이스 테이블 정의서를 자동으로 생성할 수 있습니다.
            왼쪽 사이드바에서 'DDL 변환기'를 클릭하여 시작하세요.
          </p>
          <Button onClick={() => navigate("/ddl-converter")}>
            DDL 변환기 시작하기
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
