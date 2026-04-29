import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "Print Duka - Creative Duka | We Build Brands Through Print",
  description: "A printing & design company with a passion for bringing ideas to life on paper. Offering signage, banners, clothing, marketing materials, stationery, and promotional products.",
  keywords: ["printing", "design", "signage", "banners", "marketing materials", "branding", "promotional products"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
