import { revalidateTag } from "next/cache";
import { handleHistoryRevalidation } from "@/lib/server/historyRevalidation";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleHistoryRevalidation(request, {
    secret: process.env.REVALIDATION_SECRET,
    revalidateTag,
  });
}
