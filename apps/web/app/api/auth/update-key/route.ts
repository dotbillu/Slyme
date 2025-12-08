import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "../[...nextauth]/route"; // Adjust import path to your authOptions

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // 1. Verify the user is actually logged in via Google
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the NEW Public Key from the client
    // Note: The server NEVER receives the Private Key.
    const { publicKey } = await req.json();

    if (!publicKey) {
      return NextResponse.json({ error: "Public Key is required" }, { status: 400 });
    }

    // 3. Update the existing user's record
    // We use the email from the secure session to ensure they can only update THEIR own key
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        publicKey: publicKey,
      },
    });

    console.log(`User ${session.user.email} reset their encryption keys.`);

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error("Update Key Error:", err);
    return NextResponse.json(
      { error: "Failed to update encryption keys" },
      { status: 500 }
    );
  }
}
