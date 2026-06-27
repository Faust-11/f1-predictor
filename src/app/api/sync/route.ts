import type { SyncJobResult, SyncScope } from "@/lib/api/normalized";
import { runSync } from "@/lib/api/sync";

const VALID_SCOPES = new Set<SyncScope>([
  "calendar",
  "roster",
  "results",
  "full",
]);

function parseScope(value: string | null): SyncScope {
  if (value && VALID_SCOPES.has(value as SyncScope)) {
    return value as SyncScope;
  }
  return "full";
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = parseScope(searchParams.get("scope"));

  try {
    const results: SyncJobResult[] = await runSync(scope);
    const success = results.every((r) => r.success);

    return Response.json(
      {
        scope,
        success,
        results,
      },
      { status: success ? 200 : 207 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return Response.json({ scope, success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
