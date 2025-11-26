import { Binary } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Base64Tool } from "@/components/encoding/Base64Tool";
import { UrlEncoder } from "@/components/encoding/UrlEncoder";
import { UuidGenerator } from "@/components/encoding/UuidGenerator";
import { HashGenerator } from "@/components/encoding/HashGenerator";

const EncodingTools = () => {
  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Binary className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">인코딩 도구</h1>
          <p className="text-sm text-muted-foreground">
            Base64, URL 인코딩, UUID, 해시 생성 도구
          </p>
        </div>
      </div>

      {/* 탭 레이아웃 */}
      <Tabs defaultValue="base64" className="h-[calc(100%-5rem)]">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="base64">Base64</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="uuid">UUID</TabsTrigger>
          <TabsTrigger value="hash">해시</TabsTrigger>
        </TabsList>

        <div className="mt-4 h-[calc(100%-3rem)] overflow-auto">
          <TabsContent value="base64" className="m-0">
            <Base64Tool />
          </TabsContent>

          <TabsContent value="url" className="m-0">
            <UrlEncoder />
          </TabsContent>

          <TabsContent value="uuid" className="m-0">
            <UuidGenerator />
          </TabsContent>

          <TabsContent value="hash" className="m-0">
            <HashGenerator />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default EncodingTools;
