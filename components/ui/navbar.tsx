"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Image from "next/image";

const navigation = [
  { name: "About", href: "#our-story" },
  { name: "Services", href: "#services" },
  { name: "Featured Work", href: "#featured-work" },
  { name: "Contact", href: "/contact" },
];

interface NavbarProps {
  portalLabel: string;
  portalHref: string;
}

export default function Navbar({ portalLabel, portalHref }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
          : "bg-background/40 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-6">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo/logo.png"
              alt="Print Duka"
              width={200}
              height={90}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="relative px-4 py-2 text-sm font-medium text-foreground/70 hover:text-brand-blue transition-colors group"
              >
                {item.name}
                <span className="absolute left-4 right-4 -bottom-0.5 h-px scale-x-0 bg-brand-yellow transition-transform duration-300 group-hover:scale-x-100 origin-left" />
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              href={portalHref}
              className="group flex items-center gap-2 rounded-full bg-brand-blue pl-5 pr-1.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-brand-blue/20 transition-all duration-300 hover:shadow-lg hover:shadow-brand-blue/30 hover:bg-brand-blue/95"
            >
              {portalLabel}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:scale-105">
                <ArrowUpRight className="h-4 w-4 text-brand-blue" />
              </span>
            </Link>
          </div>

          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="hover:text-brand-blue transition-colors">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] sm:w-[380px] p-0 bg-background/95 backdrop-blur-md border-r border-border/50"
            >
              <SheetHeader className="p-6 text-left border-b border-border/50">
                <SheetTitle>
                  <Image
                    src="/logo/logo.png"
                    alt="Print Duka"
                    width={320}
                    height={100}
                    className="h-16 w-auto"
                  />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-6 space-y-1">
                {navigation.map((item) => (
                  <Button
                    key={item.name}
                    variant="ghost"
                    asChild
                    className="justify-start rounded-full px-4 h-12 text-base font-medium hover:bg-accent/50 hover:text-brand-blue transition-colors"
                  >
                    <Link href={item.href}>{item.name}</Link>
                  </Button>
                ))}
              </nav>
              <Separator className="mx-6" />
              <div className="p-6">
                <Button asChild className="w-full h-12 rounded-full bg-brand-blue hover:bg-brand-blue/90 transition-all duration-300 shadow-lg">
                  <Link href={portalHref}>
                    {portalLabel}
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
