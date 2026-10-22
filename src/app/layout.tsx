import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "App Ranking Smash",
    template: "%s | App Ranking Smash",
  },
  description:
    "Gerencie temporadas, rodadas, confrontos, resultados e classificações do Ranking Smash.",
  applicationName: "App Ranking Smash",
  keywords: [
    "Ranking Smash",
    "ranking de tênis",
    "tênis",
    "temporadas",
    "rodadas",
    "classificação",
    "confrontos",
  ],
  authors: [
    {
      name: "Ranking Smash",
    },
  ],
  creator: "Ranking Smash",
  publisher: "Ranking Smash",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: appUrl,
    siteName: "App Ranking Smash",
    title: "App Ranking Smash",
    description:
      "Temporadas, rodadas, resultados e classificações do Ranking Smash.",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Ranking Smash",
    description:
      "Temporadas, rodadas, resultados e classificações do Ranking Smash.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#020617",
  colorScheme: "dark",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.variable} min-h-screen bg-slate-950 font-sans text-slate-100 antialiased`}
      >
        <a
          href="#conteudo-principal"
          className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-smash-500 px-4 py-2 font-semibold text-slate-950 focus:not-sr-only"
        >
          Ir para o conteúdo principal
        </a>

        <div className="flex min-h-screen flex-col">
          <main id="conteudo-principal" className="flex-1">
            {children}
          </main>

          <footer className="border-t border-slate-800 bg-slate-950">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
              <p>
                © {new Date().getFullYear()} App Ranking Smash. Todos os
                direitos reservados.
              </p>

              <nav
                aria-label="Links institucionais"
                className="flex flex-wrap gap-x-5 gap-y-2"
              >
                <Link
                  href="/termos"
                  className="transition-colors hover:text-smash-400 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smash-400"
                >
                  Termos de uso
                </Link>

                <Link
                  href="/privacidade"
                  className="transition-colors hover:text-smash-400 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smash-400"
                >
                  Privacidade
                </Link>

                <Link
                  href="/login"
                  className="transition-colors hover:text-smash-400 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smash-400"
                >
                  Entrar
                </Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
