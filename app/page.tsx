"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { checkSession } from "@/lib/api/auth";
import Navbar from "@/components/ui/navbar";
import DocumentarySection from "@/components/ui/documentary-section";
import LogoCloud from "@/components/ui/logo-cloud";
import FeaturesSection from "@/components/ui/features-section";
import FeaturedWorkSection from "@/components/ui/featured-work-section";
import ContactCTASection from "@/components/ui/contact-cta-section";
import FooterSection from "@/components/ui/footer-section";
import { Palette, Printer, Building2, Shirt, Package, ClipboardList } from "lucide-react";

const services = [
  {
    title: "Design & Artwork",
    icon: Palette,
    image: "/banner/marketing.jpg",
  },
  {
    title: "Printing",
    icon: Printer,
    image: "/banner/banner.jpg",
  },
  {
    title: "Branding & Signage",
    icon: Building2,
    image: "/banner/vinyl.jpg",
  },
  {
    title: "Apparel & Merchandise",
    icon: Shirt,
    image: "/banner/clothing.png",
  },
  {
    title: "Packaging",
    icon: Package,
    image: "/banner/inkwise.jpg",
  },
  {
    title: "Stationery & Marketing Materials",
    icon: ClipboardList,
    image: "/banner/stationary.jpg",
  },
];

import type { PortalRole } from "@/types/auth";

const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  admin: "Admin Portal",
  account_manager: "Account Manager Portal",
  production_team: "Staff Portal",
  business_admin: "Business Portal",
  client: "Client Portal",
  vendor: "Vendor Portal",
};

const ROLE_DASHBOARD: Record<PortalRole, string> = {
  client: "/portal",
  admin: "/admin/dashboard",
  account_manager: "/account-manager",
  production_team: "/production/dashboard",
  business_admin: "/business/dashboard",
  vendor: "/vendors",
};

export default function Home() {
  const { data: session } = useQuery({
    queryKey: ["home-session"],
    queryFn: checkSession,
    staleTime: 60_000,
    retry: false,
  });

  const portalLabel: string =
    session?.authenticated && session.user?.portal_role
      ? PORTAL_ROLE_LABELS[session.user.portal_role]
      : "Sign In";

  const portalHref: string =
    session?.authenticated && session.user?.portal_role
      ? ROLE_DASHBOARD[session.user.portal_role]
      : "/login";
  return (
    <>
      <Navbar portalLabel={portalLabel} portalHref={portalHref} />
      <div className="w-full relative container px-2 mx-auto max-w-7xl min-h-screen">
      <div id="home" className="mt-6 bg-accent/50 rounded-2xl relative overflow-hidden">
        {/* Hero section */}
        <motion.section
          className="w-full px-4 py-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <span className="bg-gradient-to-r from-[#093756] via-[#093756]/80 to-[#093756] bg-clip-text text-transparent">
                We Build{" "}
              </span>
              <span className="text-brand-yellow">Brands</span>
              <br />
              <span className="text-foreground">Through Print.</span>
            </motion.h1>
            <motion.p
              className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            >
              From design to production, we help brands look good, show up boldly and stay memorable.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
            >
              <Button asChild size="lg" className="bg-brand-blue hover:bg-brand-blue/90 text-white px-8 rounded-full shadow-lg hover:shadow-xl transition-all">
                <a href="mailto:query@printduka.co.ke">Get a Quote</a>
              </Button>
            </motion.div>
          </div>
        </motion.section>
      </div>

      {/* Documentary */}
      <DocumentarySection />

      {/* Services grid — 6 solution pillars */}
      <section id="services" className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center px-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Our Services
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            What We Print
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            From signage to stationery — everything your brand needs, printed
            to the highest standard.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mt-10 px-4 sm:px-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              className="group relative rounded-3xl min-h-[220px] sm:min-h-[260px] w-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={service.image}
                alt={service.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-blue backdrop-blur-sm">
                <service.icon className="h-4.5 w-4.5" />
              </span>
              <h3 className="absolute bottom-4 left-0 right-0 text-center text-xl sm:text-2xl font-bold text-white px-4">
                {service.title}
              </h3>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-center text-base sm:text-lg text-muted-foreground">
          Need something specific?{" "}
          <a
            href="/contact"
            className="font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors"
          >
            Reach out to us →
          </a>
        </p>
      </section>

      {/* Logo Cloud */}
      <LogoCloud />

      {/* Features Section */}
      <FeaturesSection />

      {/* Featured Work Section */}
      <FeaturedWorkSection />

      {/* Contact CTA */}
      <ContactCTASection />

      {/* Footer */}
      <FooterSection />
      </div>
    </>
  );
}

