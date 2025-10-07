import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const username = process.env.BASIC_AUTH_USERNAME;
const password = process.env.BASIC_AUTH_PASSWORD;

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !username ||
    !password ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return unauthorizedResponse();
  }

  const [scheme, encoded] = authorization.split(" ");
  if (scheme !== "Basic" || !encoded) {
    return unauthorizedResponse();
  }

  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorizedResponse();
  }

  const [providedUser, ...rest] = decoded.split(":");
  const providedPassword = rest.join(":");

  if (providedUser === username && providedPassword === password) {
    return NextResponse.next();
  }

  return unauthorizedResponse();
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="imgdose", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/((?!api/healthz).*)"],
};
