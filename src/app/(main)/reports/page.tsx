'use client';

import * as React from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInventoryStore } from '@/hooks/use-inventory-store';

// ⚠️ Este import puede fallar si el flujo de AI no existe o no expone esta función.
// Lo manejamos con fallback.
import * as AiFlows from '@/ai/flows/generate-sales-report';

type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  date: string; // ISO
};

const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (iso: string) =>
  format(new Date(iso), "d 'de' MMM y, HH:mm", { locale: es });

function toCSV(rows: Record<string, string | number>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] ?? '');
          // Escapar comas y saltos de línea
          if (/[,"\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
          return val;
        })
        .join(',')
    ),
  ].join('\n');
  return csv;
}

export default function ReportsPage() {
  const { sales, isInitialized, deleteSale } = useInventoryStore();
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [report, setReport] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deletingSaleId, setDeletingSaleId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const hasRange = Boolean(date?.from && date?.to);

  // Aplicamos el filtro de fechas con start/endOfDay para incluir todo el último día.
  const filteredSales = React.useMemo(() => {
    if (!hasRange) return sales;
    const from = startOfDay(date!.from!);
    const to = endOfDay(date!.to!);
    return sales.filter((s) => {
      const d = new Date(s.date);
      return d >= from && d <= to;
    });
  }, [sales, hasRange, date]);

  const total = React.useMemo(
    () => filteredSales.reduce((acc, s) => acc + s.totalAmount, 0),
    [filteredSales]
  );

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;

    setDeletingSaleId(saleId);
    const ok = await deleteSale(saleId);
    setDeletingSaleId(null);

    if (ok) {
      toast({
        title: 'Venta eliminada',
        description: 'La venta se eliminó y la lista se actualizó.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar',
        description: 'Intenta nuevamente en unos segundos.',
      });
    }
  };

  const handleGenerateReport = async () => {
    if (!hasRange) {
      toast({
        variant: 'destructive',
        title: 'Falta rango de fechas',
        description: 'Selecciona un rango de fechas para generar el reporte.',
      });
      return;
    }

    setIsLoading(true);
    setReport(null);

    if (filteredSales.length === 0) {
      setReport('No se encontraron ventas en el periodo seleccionado.');
      setIsLoading(false);
      return;
    }

    // Intentar usar el flujo de AI si está disponible; si no, hacer fallback local.
    try {
      const fn = (AiFlows as any).generateSalesReport as
        | ((args: { startDate: string; endDate: string; salesData: string }) => Promise<{ reportSummary: string }>)
        | undefined;

      if (typeof fn === 'function') {
        const res = await fn({
          startDate: format(startOfDay(date!.from!), 'yyyy-MM-dd'),
          endDate: format(endOfDay(date!.to!), 'yyyy-MM-dd'),
          salesData: JSON.stringify(filteredSales),
        });
        setReport(res.reportSummary);
      } else {
        // Fallback local si el flujo no existe
        const msg =
          `Resumen (local)\n\n` +
          `Periodo: ${format(startOfDay(date!.from!), 'dd/MM/yyyy')} - ${format(
            endOfDay(date!.to!),
            'dd/MM/yyyy'
          )}\n` +
          `Ventas: ${filteredSales.length}\n` +
          `Total: ${money(total)}\n\n` +
          `Top productos:\n` +
          Object.entries(
            filteredSales.reduce<Record<string, number>>((acc, s) => {
              acc[s.productName] = (acc[s.productName] ?? 0) + s.quantity;
              return acc;
            }, {})
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => `• ${name}: ${qty}`)
            .join('\n');
        setReport(msg);
      }
    } catch (err) {
      console.error('Fallo generateSalesReport, usando resumen local:', err);
      const msg =
        `Resumen (local)\n\n` +
        `Periodo: ${format(startOfDay(date!.from!), 'dd/MM/yyyy')} - ${format(
          endOfDay(date!.to!),
          'dd/MM/yyyy'
        )}\n` +
        `Ventas: ${filteredSales.length}\n` +
        `Total: ${money(total)}\n`;
      setReport(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = filteredSales.map((s: Sale) => ({
      Fecha: fmtDate(s.date),
      Producto: s.productName,
      Cantidad: s.quantity,
      Total: s.totalAmount,
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Reportes de ventas" />
      <main className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Estado inicial de store */}
        {!isInitialized ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Generar reporte</CardTitle>
              <CardDescription>
                Selecciona un rango de fechas y obtén un resumen (con IA si está disponible).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-center">
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
                            {format(date.from, 'dd/MM/yyyy')} - {format(date.to, 'dd/MM/yyyy')}
                          </>
                        ) : (
                          format(date.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        <span>Selecciona un rango</span>
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

                <Button className="w-full sm:w-auto" onClick={handleGenerateReport} disabled={isLoading}>
                  {isLoading ? 'Generando…' : 'Generar reporte'}
                </Button>

                <Button
                  className="w-full sm:w-auto"
                  variant="secondary"
                  onClick={exportCSV}
                  disabled={!filteredSales.length}
                >
                  Exportar CSV
                </Button>
              </div>

              {/* Tabla con ventas filtradas */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:nth-child(odd)]:bg-muted/20">
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No hay ventas en este periodo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{fmtDate(s.date)}</TableCell>
                          <TableCell>{s.productName}</TableCell>
                          <TableCell>{s.quantity}</TableCell>
                          <TableCell className="text-right">{money(s.totalAmount)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleDeleteSale(s.id)}
                              disabled={deletingSaleId === s.id}
                              aria-label="Eliminar venta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-muted-foreground">
                Total del periodo: <span className="font-medium">{money(total)}</span>
              </div>

              {(isLoading || report) && (
                <Card className="mt-2 bg-secondary/50">
                  <CardHeader>
                    <CardTitle>Reporte</CardTitle>
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
        )}
      </main>
    </>
  );
}

