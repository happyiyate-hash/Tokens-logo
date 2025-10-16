
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const { origin } = new URL(request.url);

  return NextResponse.json(
    {
      error: "This endpoint is deprecated.",
      message: "Please use the new endpoint to fetch all tokens for a given network.",
      new_endpoint_format: `${origin}/api/tokens/{network_id_or_name}`,
      example: `${origin}/api/tokens/ethereum`
    },
    { status: 404 }
  );
}
