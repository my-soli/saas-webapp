"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";

export default function WallDukaTeaserSection() {
    return (
        <section className="py-8 sm:py-12 px-4">
            <motion.div
                className="mx-auto max-w-5xl rounded-3xl relative overflow-hidden min-h-[440px] sm:min-h-[520px] flex flex-col justify-between"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                {/* Background photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/wallduka/coming-soon-bg.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Brand-toned gradient overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-blue via-brand-blue/70 to-brand-blue/30" />

                {/* Top bar: wordmark + badge */}
                <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7">
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
                        Wall<span className="text-brand-yellow">Duka</span>
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                        Coming Soon
                    </span>
                </div>

                {/* Giant headline */}
                <div className="relative z-10 px-6 sm:px-10">
                    <h2 className="text-[15vw] sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.95]">
                        Coming Soon
                    </h2>
                </div>

                {/* Bottom row: copy + CTA */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
                    <p className="max-w-sm text-sm sm:text-base text-white/80 leading-relaxed">
                        A new way to bring art and personality to your walls —
                        from the makers of Print Duka.
                    </p>
                    <a
                        href="mailto:query@printduka.co.ke?subject=Notify%20me%20about%20WallDuka"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-yellow px-6 py-3 text-sm font-semibold text-brand-blue shadow-lg hover:opacity-90 transition-opacity shrink-0"
                    >
                        <Mail className="h-4 w-4" />
                        Notify Me
                    </a>
                </div>
            </motion.div>
        </section>
    );
}
