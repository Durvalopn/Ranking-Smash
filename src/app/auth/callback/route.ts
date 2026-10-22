import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";

const DEFAULT_REDIRECT_PATH = "/dashboard";

const ALLOWED_REDIRECT_PATHS = new Set([
  "/dashboard",
  "/redefinir-senha",
]);

/**
 * Evita redirecionamentos externos ou para caminhos não autorizados.
 */
function getSafeRedirectPath(value: string | null): string {
  if (!value) {
    return DEFAULT_REDIRECT_PATH;
  }

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

  let redirectUrl: URL;

  try {
    redirectUrl = new URL(decodedValue, "http://localhost");
  } catch {
    return DEFAULT_REDIRECT_PATH;
  }

  if (!ALLOWED_REDIRECT_PATHS.has(redirectUrl.pathname)) {
    return DEFAULT_REDIRECT_PATH;
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
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

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const code = request.nextUrl.searchParams.get("code");
  const requestedPath = request.nextUrl.searchParams.get("next");
  const safeRedirectPath = getSafeRedirectPath(requestedPath);

  const isRecoveryFlow = safeRedirectPath.startsWith("/redefinir-senha");

  const providerError = request.nextUrl.searchParams.get("error");
  const providerErrorCode = request.nextUrl.searchParams.get("error_code");
  const providerErrorDescription = request.nextUrl.searchParams.get(
    "error_description",
  );

  if (providerError) {
    console.error("Erro retornado pelo Supabase Auth:", {
      error: providerError,
      code: providerErrorCode,
      description: providerErrorDescription,
    });

    return NextResponse.redirect(
      createErrorUrl(
        request,
        providerErrorCode ?? "link_invalido",
        isRecoveryFlow,
      ),
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "As variáveis NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas.",
    );

    return NextResponse.redirect(
      createErrorUrl(
        request,
        "configuracao_indisponivel",
        isRecoveryFlow,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      createErrorUrl(request, "codigo_ausente", isRecoveryFlow),
    );
  }

  const destinationUrl = new URL(
    safeRedirectPath,
    request.nextUrl.origin,
  );

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

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      "Não foi possível trocar o código pela sessão:",
      error.message,
    );

    const errorResponse = NextResponse.redirect(
      createErrorUrl(
        request,
        "codigo_invalido_ou_expirado",
        isRecoveryFlow,
      ),
    );

    errorResponse.headers.set("Cache-Control", "no-store");

    response.cookies.getAll().forEach((cookie) => {
      errorResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return errorResponse;
  }

  return response;
}
