"use client";

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { generateSalesReport } from '@/ai/flows/generate-sales-report';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { sales } = useInventoryStore();
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [report, setReport] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!date?.from || !date?.to) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a date range.',
      });
      return;
    }
    
    setIsLoading(true);
    setReport(null);

    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= date.from! && saleDate <= date.to!;
    });

    if (filteredSales.length === 0) {
      setReport("No sales data found for the selected period.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await generateSalesReport({
        startDate: format(date.from, 'yyyy-MM-dd'),
        endDate: format(date.to, 'yyyy-MM-dd'),
        salesData: JSON.stringify(filteredSales),
      });
      setReport(result.reportSummary);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate sales report.',
      });
      setReport("An error occurred while generating the report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Sales Reports" />
      <main className="flex-1 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Sales Report</CardTitle>
            <CardDescription>
              Select a date range to generate a sales summary with AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal sm:w-[300px]',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'LLL dd, y')} -{' '}
                          {format(date.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(date.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleGenerateReport} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>

            {(isLoading || report) && (
              <Card className="mt-4 bg-secondary/50">
                <CardHeader>
                  <CardTitle>AI Generated Report</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    report
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
