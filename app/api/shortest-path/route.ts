import { NextRequest, NextResponse } from "next/server";

export interface AlternateRouteDetail {
  path: string[];
  distance: number;
  time: string;
  hours: number;
  method: string;
}

export interface RouteRequest {
  source: string;
  destination: string;
}

export interface RouteResponse {
  path: string[];
  distance: number;
  time: string;
  alternate_routes?: string[][];
  alternate_route_details?: AlternateRouteDetail[];
  coordinates?: [number, number][];
  geometry?: [number, number][];
  prediction_method?: string;
  predicted_hours?: number;
  ml_estimated_time?: string;
  osrm_estimated_time?: string | null;
  source?: string;
  destination?: string;
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

    // Strict input validation
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

    // Call Python Flask API
    const flaskUrl = process.env.FLASK_API_URL || "http://localhost:5000";

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      response = await fetch(`${flaskUrl}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: trimmedSource,
          destination: trimmedDestination,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      console.error(`Flask API unreachable at ${flaskUrl}:`, fetchError);
      return NextResponse.json(
        {
          error: `Python routing service is unreachable at ${flaskUrl}. Please verify the Flask backend is running on port 5000.`,
          service_unavailable: true,
        },
        { status: 503 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to find route" },
        { status: response.status }
      );
    }

    return NextResponse.json(data as RouteResponse, { status: 200 });
  } catch (error) {
    console.error("API Error in /api/shortest-path:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
