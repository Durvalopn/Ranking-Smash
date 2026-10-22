import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const AUTH_ROUTES = ["/login", "/cadastro", "/esqueci-minha-senha"];
const PROTECTED_ROUTES = ["/dashboard", "/perfil", "/partidas", "/classificacao", "/notificacoes", "/historico"];
const ADMIN_ROUTES = ["/admin"];

type CookieToSet = { name: string; value: string; options?: unknown };
type ProfileRoleRow = { role?: "admin" | "atleta" | "user" | null };
type RoleRow = { role?: string | null };

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function redirectWithCookies(destination: URL, source: NextResponse) {
  const response = NextResponse.redirect(destination);
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie.name, cookie.value, cookie));
  return response;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]));
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);
  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);
  const isAdminRoute = matchesRoute(pathname, ADMIN_ROUTES);

  if ((isProtectedRoute || isAdminRoute) && (error || !user)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${request.nextUrl.pathname}${request.nextUrl.search}`;
    return redirectWithCookies(loginUrl, response);
  }

  if (user && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return redirectWithCookies(dashboardUrl, response);
  }

  if (isAdminRoute && user) {
    const emailIsAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    let isAdmin = emailIsAdmin;

    if (!isAdmin) {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const roleRow = roleData as RoleRow | null;
      isAdmin = !roleError && roleRow?.role?.trim().toLowerCase() === "admin";
    }

    if (!isAdmin) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      dashboardUrl.searchParams.set("erro", "acesso_negado");
      return redirectWithCookies(dashboardUrl, response);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
