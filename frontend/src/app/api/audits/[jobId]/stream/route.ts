import { backendFetchWithSession } from "@/lib/backend-server";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { jobId } = await params;
  const response = await backendFetchWithSession(`/audits/${jobId}/stream`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
    },
  });

  if (!response.ok) {
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
