import { NextRequest, NextResponse } from "next/server";
import { computeDijkstraRoute } from "@/lib/dijkstra";

export interface RouteRequest {
  source: string;
  destination: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: RouteRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body: object with 'source' and 'destination' is required" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body: object required" },
        { status: 400 }
      );
    }

    const { source, destination } = body;

    if (typeof source !== "string" || typeof destination !== "string") {
      return NextResponse.json(
        { error: "Source and destination must be non-empty strings" },
        { status: 400 }
      );
    }

    const trimmedSource = source.trim();
    const trimmedDestination = destination.trim();

    if (!trimmedSource || !trimmedDestination) {
      return NextResponse.json(
        { error: "Source and destination are required" },
        { status: 400 }
      );
    }

    if (trimmedSource.toLowerCase() === trimmedDestination.toLowerCase()) {
      return NextResponse.json(
        { error: "Source and destination cannot be the same" },
        { status: 400 }
      );
    }

    // 1. Try Python Flask backend first if available
    const flaskUrl = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const flaskRes = await fetch(`${flaskUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: trimmedSource, destination: trimmedDestination }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (flaskRes.ok) {
        const data = await flaskRes.json();
        return NextResponse.json(data, { status: 200 });
      }
    } catch {
      // Python backend unreachable / timed out -> fallback seamlessly to built-in Next.js Dijkstra engine
    }

    // 2. High-Performance Zero-Downtime Fallback
    // Directly computes the exact Dijkstra shortest highway route with OSRM curves and turn-by-turn guidance
    try {
      const fallbackRoute = await computeDijkstraRoute(trimmedSource, trimmedDestination);
      return NextResponse.json(fallbackRoute, { status: 200 });
    } catch (routeError: any) {
      return NextResponse.json(
        { error: routeError?.message || "Failed to find highway route" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("API Error in /api/shortest-path:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
