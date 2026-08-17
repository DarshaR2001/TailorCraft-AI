import { NextRequest, NextResponse } from "next/server";

// Increase the Next.js serverless function timeout for long AI inference calls
export const maxDuration = 300; // seconds

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = `${BACKEND_URL}/${path.join("/")}${
    req.nextUrl.search ?? ""
  }`;

  // Forward relevant headers, strip host
  const forwardHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      lower === "authorization" ||
      lower === "content-type" ||
      lower === "accept"
    ) {
      forwardHeaders.set(key, value);
    }
  }

  let body: BodyInit | null = null;
  const contentType = req.headers.get("content-type") ?? "";

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      // Let the browser/fetch reconstruct the boundary — pass FormData as-is
      body = await req.formData();
      // Remove content-type so fetch re-generates correct boundary
      forwardHeaders.delete("content-type");
    } else {
      body = await req.text();
    }
  }

  try {
    // 270-second timeout for long AI tailoring calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 270_000);

    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      signal: controller.signal,
      // Required for Node 18+ streaming
      // @ts-expect-error next flag
      duplex: "half",
    });

    clearTimeout(timeoutId);

    const responseContentType =
      backendResponse.headers.get("content-type") ?? "";

    // Stream binary (PDF/DOCX) responses directly
    if (
      responseContentType.includes("application/pdf") ||
      responseContentType.includes(
        "application/vnd.openxmlformats-officedocument"
      ) ||
      responseContentType.includes("application/octet-stream")
    ) {
      const blob = await backendResponse.blob();
      return new NextResponse(blob, {
        status: backendResponse.status,
        headers: {
          "Content-Type": responseContentType,
          "Content-Disposition":
            backendResponse.headers.get("Content-Disposition") ?? "",
        },
      });
    }

    // JSON / text responses
    const data = await backendResponse.text();
    return new NextResponse(data, {
      status: backendResponse.status,
      headers: { "Content-Type": responseContentType || "application/json" },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error("[Proxy] Error forwarding request:", err);
    return NextResponse.json(
      {
        detail: isTimeout
          ? "The AI is taking longer than expected. Please try again."
          : "Failed to connect to TailorCraft AI backend.",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
