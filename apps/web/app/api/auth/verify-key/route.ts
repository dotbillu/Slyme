import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "../[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicKey } = await req.json();

  if (!publicKey) {
    return NextResponse.json({ error: "Public Key required" }, { status: 400 });
  }

  try {
    // Check if the user with this email actually has this specific public key
    const user = await prisma.user.findFirst({
      where: {
        email: session.user.email,
        publicKey: publicKey,
      },
    });

    if (user) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Key mismatch" }, { status: 403 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
