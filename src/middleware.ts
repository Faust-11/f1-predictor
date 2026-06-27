import { NextResponse, type NextRequest } from "next/server";

import {
  USER_ID_COOKIE,
  USER_ID_COOKIE_MAX_AGE,
} from "@/lib/constants";

export function middleware(request: NextRequest) {
  const existingUserId = request.cookies.get(USER_ID_COOKIE)?.value;

  if (existingUserId) {
    return NextResponse.next();
  }

  const userId = crypto.randomUUID();
  const response = NextResponse.next();

  response.cookies.set({
    name: USER_ID_COOKIE,
    value: userId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_ID_COOKIE_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
