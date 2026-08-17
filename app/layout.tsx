import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "@/components/providers";
import { BrandingProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "Print Duka | We Build Brands Through Print",
  description: "A printing & design company with a passion for bringing ideas to life on paper. Offering signage, banners, clothing, marketing materials, stationery, and promotional products.",
  keywords: ["printing", "design", "signage", "banners", "marketing materials", "branding", "promotional products"],
};

interface Branding {
  name: string;
  logo_url: string | null;
  color_primary: string;
  color_secondary: string;
}

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://localhost:8000";

async function fetchBranding(): Promise<Branding | null> {
  try {
    const headerList = await headers();
    const host = headerList.get("host") ?? "";
    const res = await fetch(`${DJANGO_API_URL}/api/public/branding/`, {
      headers: { "X-Tenant-Host": host },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Branding;
  } catch {
    // Tenant branding is a progressive enhancement — never block rendering on it.
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await fetchBranding();
  const colorOverrides = branding && (branding.color_primary || branding.color_secondary)
    ? `:root{${branding.color_primary ? `--brand-blue:${branding.color_primary};` : ""}${branding.color_secondary ? `--brand-yellow:${branding.color_secondary};` : ""}}`
    : null;

  return (
    <html lang="en">
      <head>
        {colorOverrides && <style dangerouslySetInnerHTML={{ __html: colorOverrides }} />}
      </head>
      <body
        className="antialiased"
      >
        <Providers>
          <BrandingProvider branding={branding}>{children}</BrandingProvider>
        </Providers>
      </body>
    </html>
  );
}
