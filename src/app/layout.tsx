import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Planificador de visitas",
  description: "Planificación de visitas de técnicos a obras",
};

const enlaces = [
  { href: "/", texto: "Visitas" },
  { href: "/visitas/nueva", texto: "Programar visita" },
  { href: "/tecnicos-y-obras", texto: "Técnicos y obras" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <span className="font-semibold text-blue-800">Planificador de visitas</span>
            {enlaces.map((enlace) => (
              <Link key={enlace.href} href={enlace.href} className="text-sm text-slate-600 hover:text-blue-800">
                {enlace.texto}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
