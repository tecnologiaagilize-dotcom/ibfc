import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function proxy(
  request: NextRequest
) {
  if (request.nextUrl.pathname === "/membro/apoiamento" || request.nextUrl.pathname.startsWith("/membro/apoiamento/")) {
    return new NextResponse(null, { status: 404 });
  }
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  if (
    pathname.startsWith(
      "/membro"
    ) &&
    !user
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/entrar";

    return NextResponse.redirect(
      url
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/membro/:path*",
  ],
};
