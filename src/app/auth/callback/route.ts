import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";

const DEFAULT_REDIRECT_PATH = "/dashboard";
const ALLOWED_REDIRECT_PATHS = new Set(["/dashboard", "/redefinir-senha"]);

type CookieToSet = {
  name: string;
  value: string;
  options?: unknown;
};

function getSafeRedirectPath(value: string | null): string {
  if (!value) return DEFAULT_REDIRECT_PATH;

  let decodedValue = value;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    return DEFAULT_REDIRECT_PATH;
  }

  if (
    !decodedValue.startsWith("/") ||
    decodedValue.startsWith("//") ||
    decodedValue.includes("\\")
  ) {
    return DEFAULT_REDIRECT_PATH;
  }

  try {
    const redirectUrl = new URL(decodedValue, "http://localhost");
    if (!ALLOWED_REDIRECT_PATHS.has(redirectUrl.pathname)) {
      return DEFAULT_REDIRECT_PATH;
    }
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return DEFAULT_REDIRECT_PATH;
  }
}

function createErrorUrl(
  request: NextRequest,
  errorCode: string,
  recoveryFlow: boolean,
): URL {
  const url = request.nextUrl.clone();
  url.pathname = recoveryFlow ? "/esqueci-minha-senha" : "/login";
  url.search = "";
  url.hash = "";
  url.searchParams.set("erro", errorCode);
  return url;
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const code = request.nextUrl.searchParams.get("code");
  const safeRedirectPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );
  const isRecoveryFlow = safeRedirectPath.startsWith("/redefinir-senha");
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      createErrorUrl(request, "link_invalido", isRecoveryFlow),
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      createErrorUrl(request, "configuracao_indisponivel", isRecoveryFlow),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      createErrorUrl(request, "codigo_ausente", isRecoveryFlow),
    );
  }

  const destinationUrl = new URL(safeRedirectPath, request.nextUrl.origin);
  const response = NextResponse.redirect(destinationUrl);
  response.headers.set("Cache-Control", "no-store");

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(
              name,
              value,
              options as Parameters<typeof response.cookies.set>[2],
            );
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorResponse = NextResponse.redirect(
      createErrorUrl(
        request,
        "codigo_invalido_ou_expirado",
        isRecoveryFlow,
      ),
    );
    errorResponse.headers.set("Cache-Control", "no-store");
    copyCookies(response, errorResponse);
    return errorResponse;
  }

  return response;
}
