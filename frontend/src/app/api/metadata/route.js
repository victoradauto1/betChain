import { NextResponse } from "next/server";

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_QUERY_URL = "https://api.pinata.cloud/data/pinList";

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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const betId = searchParams.get("betId");

    if (!betId) {
      return NextResponse.json(
        { message: "betId parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${PINATA_QUERY_URL}?metadata[name]=bet-${betId}&status=pinned`,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to query Pinata");
    }

    const data = await response.json();

    if (!data.rows || data.rows.length === 0) {
      return NextResponse.json(
        { message: "Metadata not found" },
        { status: 404 }
      );
    }

    const pin = data.rows[0];
    const ipfsHash = pin.ipfs_pin_hash;

    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      throw new Error("Failed to fetch metadata from IPFS");
    }

    const metadata = await metadataResponse.json();

    return NextResponse.json(metadata);
  } catch (err) {
    console.error("[API /metadata GET] Error:", err);
    return NextResponse.json(
      { message: "Failed to retrieve metadata" },
      { status: 500 }
    );
  }
}