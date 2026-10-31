import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import MetaPixel from "@/components/analytics/MetaPixel";

const playfair = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Manrope({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Free Facial Volume Scan · Harley Street Aesthetics",
  description:
    "Still you. A free scan of eight facial areas shows where volume has changed, and what we'd leave alone. Then a free online consultation with a GMC-registered doctor. London & Glasgow.",
  openGraph: {
    title: "Free Facial Volume Scan · Harley Street Aesthetics",
    description:
      "Still you. A free scan of eight facial areas shows where volume has changed, and what we'd leave alone. Then a free online consultation with a GMC-registered doctor. London & Glasgow.",
    url: SITE_URL,
    siteName: "Harley Street Aesthetics",
    locale: "en_GB",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GB"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
