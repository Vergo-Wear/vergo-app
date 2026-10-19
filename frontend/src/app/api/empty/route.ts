import { NextResponse } from "next/server";

const EMPTY_SOURCE_MAP = JSON.stringify({
  version: 3,
  sources: [],
  mappings: "",
});

export function GET() {
  return new NextResponse(EMPTY_SOURCE_MAP, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

