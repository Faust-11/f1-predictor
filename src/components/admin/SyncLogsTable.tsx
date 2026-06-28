import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateUk } from "@/lib/i18n/date";
import { cn } from "@/lib/utils";
import type { SyncLog } from "@/types/sync-log";

export function SyncLogsTable({ logs }: { logs: SyncLog[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Журнал синхронізації</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Записів немає.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary/80 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Час</th>
                  <th className="px-3 py-2 font-medium">Джерело</th>
                  <th className="px-3 py-2 font-medium">Endpoint</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Повідомлення</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatDateUk(log.createdAt, "dd.MM HH:mm:ss")}
                    </td>
                    <td className="px-3 py-2">{log.source}</td>
                    <td className="px-3 py-2 text-muted-foreground">{log.endpoint}</td>
                    <td
                      className={cn(
                        "px-3 py-2 font-medium",
                        log.status === "error" ? "text-destructive" : "text-primary",
                      )}
                    >
                      {log.status}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
