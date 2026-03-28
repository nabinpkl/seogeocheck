import { backendFetchWithSession, parseJsonResponse } from "@/lib/backend-server";

type RouteContext = {
    params: Promise<{
        jobId: string;
    }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
    const { jobId } = await params;
    const response = await backendFetchWithSession(`/audits/${jobId}/claim-tokens`, {
        method: "POST",
    });

    const payload = await parseJsonResponse<Record<string, unknown>>(response);
    return Response.json(payload ?? {}, { status: response.status });
}
