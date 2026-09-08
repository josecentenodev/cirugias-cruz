import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Seguimiento de Cirugías",
  description:
    "Seguimiento de Cirugías — seguimiento quirúrgico e investigación clínica para médicos",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
