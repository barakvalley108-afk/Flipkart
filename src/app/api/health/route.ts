import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "quickcart-food-grocery",
    timestamp: new Date().toISOString()
  });
}
