import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, MousePointer, Calendar, Globe } from "lucide-react";
import { format } from "date-fns";

interface AffiliateReportData {
  affiliateName: string;
  totalClicks: number;
  last30Days: number;
  last7Days: number;
  bySource: Record<string, number>;
  recentClicks: Array<{
    date: string | null;
    source: string | null;
    referrer: string | null;
  }>;
}

export default function AffiliateReport() {
  const { token } = useParams<{ token: string }>();

  const { data: report, isLoading, error } = useQuery<AffiliateReportData>({
    queryKey: ["/api/affiliate-report", token],
    queryFn: async () => {
      const response = await fetch(`/api/affiliate-report/${token}`);
      if (!response.ok) throw new Error("Report not found");
      return response.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Report Not Found</h1>
          <p className="text-muted-foreground">
            This report link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const getSourceLabel = (source: string | null) => {
    switch (source) {
      case "redirect":
        return "External Link";
      case "website":
        return "Website";
      case "detail_page":
        return "Partner Page";
      default:
        return source || "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-report-title">
            {report.affiliateName} Referral Report
          </h1>
          <p className="opacity-90">
            Powered by RE Data Metrix
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Total Clicks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-total-clicks">
                {report.totalClicks}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last 30 Days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-last-30-days">
                {report.last30Days}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last 7 Days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-last-7-days">
                {report.last7Days}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Clicks by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(report.bySource).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(report.bySource)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <div key={source} className="flex justify-between items-center">
                        <span className="text-sm">{getSourceLabel(source)}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No click data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average per day (30d)</span>
                  <span className="font-medium">
                    {(report.last30Days / 30).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average per day (7d)</span>
                  <span className="font-medium">
                    {(report.last7Days / 7).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Top source</span>
                  <span className="font-medium">
                    {Object.entries(report.bySource).sort(([, a], [, b]) => b - a)[0]?.[0]
                      ? getSourceLabel(Object.entries(report.bySource).sort(([, a], [, b]) => b - a)[0][0])
                      : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
            <CardDescription>
              Showing the most recent 50 clicks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.recentClicks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Referrer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.recentClicks.map((click, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {click.date
                            ? format(new Date(click.date), "MMM d, yyyy h:mm a")
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSourceLabel(click.source)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {click.referrer || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No clicks recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>This report is generated by RE Data Metrix</p>
          <p>For questions, contact info@redatametrix.com</p>
        </div>
      </div>
    </div>
  );
}
