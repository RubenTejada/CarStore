import { NextResponse, type NextRequest } from "next/server";

// Chequeo optimista: sin cookie de sesión no se entra a /panel ni /admin.
// La autorización real (rol, dueño) se verifica en cada layout y Server Action.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("cs_session")) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/admin/:path*"],
};
