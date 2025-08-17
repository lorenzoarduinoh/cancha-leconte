import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cancha Leconte - Gestión de Partidos de Fútbol",
  description: "Sistema de gestión para organizar partidos de fútbol, registro de jugadores y pagos en Cancha Leconte.",
  keywords: ["fútbol", "cancha", "partidos", "Argentina", "registro", "jugadores", "gestión"],
  authors: [{ name: "Cancha Leconte" }],
  creator: "Cancha Leconte",
  publisher: "Cancha Leconte",
  robots: {
    index: false,
    follow: false,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: "#2E7D32",
  colorScheme: "light",
  category: "sports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <div id="__next">{children}</div>
      </body>
    </html>
  );
}
