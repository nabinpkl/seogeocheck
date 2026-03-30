import { backendFetchWithSession } from "@/lib/backend-server";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const requestUrl = new URL(_request.url);
  const { jobId } = await params;
  const claim = requestUrl.searchParams.get("claim");
  const response = await backendFetchWithSession(
    `/audits/${jobId}/report${claim ? `?claim=${encodeURIComponent(claim)}` : ""}`,
    {
    method: "GET",
    }
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
