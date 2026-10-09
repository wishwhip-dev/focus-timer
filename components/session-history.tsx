"use client";

/**
 * The history of finished focus sessions: a bar chart of the last 7 days, a table of the same
 * days, the destructive "Clear history" control, and the export/import pair that is the only way
 * this data moves between browsers.
 */
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDrop } from "@/components/file-drop";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { database } from "@/lib/db";
import { clearSessions, listSessions } from "@/lib/data/sessions";
import { dayLabel, dayOffset, localDateString, weekdayLabel } from "@/lib/dates";
import { useDatabaseTransfer, useStorageStatus } from "@/lib/storage/react";
import { useToday } from "@/lib/use-today";

const chartConfig = { sessions: { label: "Sessions", color: "var(--chart-1)" } } satisfies ChartConfig;

/** The last `count` calendar days ending today, oldest first, derived from the day key. */
function lastDays(today: string, count: number) {
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = dayOffset(new Date(year!, month! - 1, day!), count - 1 - index);
    return { date, key: localDateString(date) };
  });
}

export function SessionHistory() {
  const today = useToday();
  const storageStatus = useStorageStatus(database);
  const { data: sessions, isLoading } = useStoredQuery(database, listSessions);
  const { exportToFile, importFromFile, state: transferState } = useDatabaseTransfer(database);
  const [clearOpen, setClearOpen] = useState(false);

  const rows = useMemo(() => {
    if (!today) return null;
    const counts = new Map<string, number>();
    let total = 0;
    for (const session of sessions ?? []) {
      counts.set(session.date, (counts.get(session.date) ?? 0) + 1);
      total += 1;
    }
    return {
      total,
      days: lastDays(today, 7).map(({ date, key }) => ({
        key,
        day: weekdayLabel(date),
        label: dayLabel(date, today),
        sessions: counts.get(key) ?? 0,
        isToday: key === today,
      })),
    };
  }, [sessions, today]);

  const handleClear = async () => {
    try {
      await clearSessions();
      setClearOpen(false);
      toast.success("History cleared.");
    } catch (error: unknown) {
      toast.error(`Could not clear the history: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  const handleImportFiles = (files: File[]) => {
    const file = files[0];
    if (file) void importFromFile(file, "replace");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Focus sessions finished per day, over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {storageStatus === "memory" && (
          <Alert>
            <AlertTitle>This browser will not keep your data</AlertTitle>
            <AlertDescription>
              Storage was refused here, so your sessions last only until the tab closes. Export them to a file to keep them.
            </AlertDescription>
          </Alert>
        )}

        {!rows || isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={rows.days} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {/* `minPointSize` keeps a zero-day visible as a sliver — today counts, even at zero. */}
                <Bar dataKey="sessions" fill="var(--color-sessions)" radius={4} minPointSize={2} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>

            {rows.total === 0 && (
              <p className="rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
                No sessions yet — finish a focus session and it will show up here.
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows.days].reverse().map((row) => (
                  <TableRow key={row.key} className={row.isToday ? "bg-muted/50" : undefined}>
                    <TableCell className="font-medium">
                      {row.label}
                      {row.isToday && <span className="sr-only"> (today)</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="h-11" onClick={() => void exportToFile()}>
                  Export data
                </Button>
                <Button variant="destructive" size="sm" className="h-11" onClick={() => setClearOpen(true)}>
                  Clear history
                </Button>
              </div>
              <FileDrop
                accept=".json,application/json"
                maxBytes={5 * 1024 * 1024}
                label="Load data file"
                onFiles={handleImportFiles}
                className="p-4"
              >
                or drop a backup here — loading one replaces the history in this browser
              </FileDrop>
              {transferState.kind === "error" && (
                <p className="text-sm text-destructive">{transferState.message}</p>
              )}
              {transferState.kind === "imported" && (
                <p className="text-sm text-muted-foreground">
                  Loaded {transferState.result.rows} {transferState.result.rows === 1 ? "row" : "rows"} from the file.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear history?</DialogTitle>
            <DialogDescription>
              This permanently deletes all {rows?.total ?? 0} recorded{" "}
              {rows?.total === 1 ? "session" : "sessions"}. The timer itself is not affected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Keep history
            </Button>
            <Button variant="destructive" onClick={() => void handleClear()}>
              Clear history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
