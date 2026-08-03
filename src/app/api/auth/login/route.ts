import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPanelCredentials, getRolePath } from "@/lib/panel-users";
import { createSessionToken, panelSessionCookie } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128)
});

export async function POST(request: Request) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }

  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Enter a valid email and password." },
      { status: 400 }
    );
  }

  const user = await verifyPanelCredentials(
    parsed.data.email,
    parsed.data.password
  );

  if (!user) {
    return NextResponse.json(
      { message: "Incorrect email or password." },
      { status: 401 }
    );
  }

  const { token, expiresAt } = await createSessionToken(user.email, user.role);
  const response = NextResponse.json({
    ok: true,
    redirectTo: getRolePath(user.role)
  });

  response.cookies.set(panelSessionCookie.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high"
  });

  return response;
}
