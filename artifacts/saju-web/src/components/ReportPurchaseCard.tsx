import type { MonetizationBirthInfo } from "@workspace/api-client-react";
import { Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReportPurchaseOptions } from "./ReportPurchaseOptions";

interface ReportPurchaseCardProps {
  birthInfo: MonetizationBirthInfo;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}

export function ReportPurchaseCard(props: ReportPurchaseCardProps) {
  return (
    <Card className="glass-panel border-amber-400/30 bg-amber-400/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <Crown className="h-5 w-5" /> 사주 PDF 리포트
        </CardTitle>
        <CardDescription>지금 고민을 먼저 고르고, 필요한 범위만 담아 보세요.</CardDescription>
      </CardHeader>
      <CardContent><ReportPurchaseOptions key={JSON.stringify(props.birthInfo)} {...props} /></CardContent>
    </Card>
  );
}
