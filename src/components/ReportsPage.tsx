
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getJobReportPage } from "@/data/jobs";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Download, 
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatOmaniRial } from "@/utils/currency";
import { PageHeader } from "@/components/shell/PageHeader";

type ReportType = "customer" | "salesman" | "branch";

interface ReportData {
  customerName: string;
  salesmanName: string;
  totalJobs: number;
  completedJobs: number;
  totalValue: number;
  averageCompletionTime: number;
  branch: string;
}

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("customer");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalJobs: 0,
    completionRate: 0,
    averageJobValue: 0
  });
  const { toast } = useToast();

  const generateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const selectedDate = new Date(selectedMonth + '-01');
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);


      // Updated query to use the foreign key relationships
      const pageSize = 500;
      let afterId: string | null = null;
      let totalRevenue = 0;
      let totalJobs = 0;
      let completedJobs = 0;
      const groupedData = new Map<string, {
        name: string;
        totalJobs: number;
        completedJobs: number;
        totalValue: number;
        branch: string;
      }>();

      while (true) {
        const jobOrders = await getJobReportPage(
          startDate.toISOString(),
          endDate.toISOString(),
          afterId,
          pageSize,
        );
        if (!jobOrders || jobOrders.length === 0) break;

        for (const job of jobOrders) {
          const groupName = reportType === 'customer'
            ? job.customers?.name || 'Unknown Customer'
            : reportType === 'salesman'
              ? job.salesman_profiles?.full_name || 'Unassigned'
              : job.branch || 'Unknown Branch';
          const group = groupedData.get(groupName) || {
            name: groupName,
            totalJobs: 0,
            completedJobs: 0,
            totalValue: 0,
            branch: job.branch || 'N/A',
          };
          const jobValue = Number(job.total_value || 0);
          const isCompleted = job.status === 'completed' || job.status === 'invoiced';

          group.totalJobs++;
          group.totalValue += jobValue;
          if (isCompleted) group.completedJobs++;
          groupedData.set(groupName, group);
          totalJobs++;
          totalRevenue += jobValue;
          if (isCompleted) completedJobs++;
        }

        afterId = jobOrders[jobOrders.length - 1].id;
        if (jobOrders.length < pageSize) break;
      }

      const processedData: ReportData[] = Array.from(groupedData.values(), (group) => ({
        customerName: reportType === 'customer' ? group.name : '',
        salesmanName: reportType === 'salesman' ? group.name : '',
        totalJobs: group.totalJobs,
        completedJobs: group.completedJobs,
        totalValue: group.totalValue,
        averageCompletionTime: 0,
        branch: group.branch,
      }));
      setReportData(processedData);

      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const averageJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;

      setSummaryStats({
        totalRevenue,
        totalJobs,
        completionRate,
        averageJobValue
      });

      toast({
        title: "Success",
        description: `Report generated successfully with ${totalJobs} jobs.`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: `Failed to generate report: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    try {
      const csvContent = generateCSVContent();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportType}_report_${selectedMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Report exported successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export report.",
        variant: "destructive",
      });
    }
  };

  const generateCSVContent = () => {
    const headers = [
      reportType === 'customer' ? 'Customer Name' : reportType === 'salesman' ? 'Salesman Name' : 'Branch Name',
      'Total Jobs',
      'Completed Jobs',
      'Completion Rate (%)',
      'Total Value (ر.ع.)',
      'Average Job Value (ر.ع.)'
    ];

    const rows = reportData.map(row => [
      reportType === 'customer' ? row.customerName : 
      reportType === 'salesman' ? row.salesmanName : row.branch,
      row.totalJobs,
      row.completedJobs,
      row.totalJobs > 0 ? ((row.completedJobs / row.totalJobs) * 100).toFixed(1) : '0.0',
      formatOmaniRial(row.totalValue),
      formatOmaniRial(row.totalJobs > 0 ? row.totalValue / row.totalJobs : 0)
    ]);

    const escapeCell = (value: unknown) => {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    return [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');
  };

  useEffect(() => {
    generateReport();
  }, [reportType, selectedMonth]);

  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Reports & Analytics" description="Generate detailed reports and analyze business performance" />
        
        <Card className="border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15">
          <CardContent className="flex items-center p-6">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-300 me-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Report Generation Failed</h3>
              <p className="text-red-600 dark:text-red-300">{error}</p>
              <Button 
                onClick={generateReport} 
                className="mt-2"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate detailed reports and analyze business performance"
        actions={<Button onClick={exportReport} className="flex items-center gap-2" disabled={reportData.length === 0}><Download className="w-4 h-4" />Export Report</Button>}
      />

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value) => {
                if (value === "customer" || value === "salesman" || value === "branch") {
                  setReportType(value);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer-wise Report</SelectItem>
                  <SelectItem value="salesman">Salesman-wise Report</SelectItem>
                  <SelectItem value="branch">Branch-wise Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="month">Select Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isLoading} className="w-full">
                {isLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-300" />
            <div className="ms-4">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatOmaniRial(summaryStats.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-300" />
            <div className="ms-4">
              <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
              <p className="text-2xl font-bold">{summaryStats.totalJobs}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-300" />
            <div className="ms-4">
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">{summaryStats.completionRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-300" />
            <div className="ms-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Job Value</p>
              <p className="text-2xl font-bold">{formatOmaniRial(summaryStats.averageJobValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{reportType} Performance Report</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ms-2">Loading report data...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available for the selected period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {reportType === 'customer' ? 'Customer Name' : 
                     reportType === 'salesman' ? 'Salesman Name' : 'Branch Name'}
                  </TableHead>
                  <TableHead>Total Jobs</TableHead>
                  <TableHead>Completed Jobs</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Average Job Value</TableHead>
                  {reportType !== 'branch' && <TableHead>Branch</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, index) => {
                  const completionRate = row.totalJobs > 0 ? (row.completedJobs / row.totalJobs) * 100 : 0;
                  const avgJobValue = row.totalJobs > 0 ? row.totalValue / row.totalJobs : 0;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {reportType === 'customer' ? row.customerName : 
                         reportType === 'salesman' ? row.salesmanName : row.branch}
                      </TableCell>
                      <TableCell>{row.totalJobs}</TableCell>
                      <TableCell>{row.completedJobs}</TableCell>
                      <TableCell>
                        <Badge variant={completionRate >= 80 ? "default" : completionRate >= 60 ? "secondary" : "destructive"}>
                          {completionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatOmaniRial(row.totalValue)}</TableCell>
                      <TableCell>{formatOmaniRial(avgJobValue)}</TableCell>
                      {reportType !== 'branch' && <TableCell>{row.branch}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
