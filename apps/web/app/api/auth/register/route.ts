import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "../[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { username, publicKey } = await req.json();

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername && existingUsername.email !== session.user.email) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  try {
    const user = await prisma.user.upsert({
      where: {
        email: session.user.email,
      },
      update: {
        username: username,
        publicKey: publicKey, 
      },
      create: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        username: username,
        publicKey: publicKey,
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("Database Error:", err);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}
