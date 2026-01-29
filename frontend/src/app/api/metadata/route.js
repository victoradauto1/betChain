import { NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

if (!PINATA_JWT) {
  throw new Error("Missing PINATA_JWT in environment variables");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const { betId, title, description, imageUrl } = body;

    if (!betId) {
      return NextResponse.json(
        { message: "betId is required" },
        { status: 400 }
      );
    }

    const metadata = {
      betId,
      title,
      description,
      image: imageUrl,
      timestamp: Date.now(),
    };

    const pinataRes = await fetch(PINATA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `bet-${betId}`,
        },
      }),
    });

    if (!pinataRes.ok) {
      const err = await pinataRes.text();
      throw new Error(err);
    }

    const data = await pinataRes.json();
    const uri = `ipfs://${data.IpfsHash}`;

    return NextResponse.json({ uri });
  } catch (err) {
    console.error("[API /metadata] Error:", err);
    return NextResponse.json(
      { message: "Failed to upload metadata" },
      { status: 500 }
    );
  }
}