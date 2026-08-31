"use client";

import { motion } from "framer-motion";
import { Trophy, Award, Medal, Star } from "lucide-react";

// Dummy placeholders — swap in the real awards/recognitions when available.
const awards = [
    { icon: Trophy, title: "Best Print Innovator", year: "2024" },
    { icon: Award, title: "Excellence in Branding", year: "2023" },
    { icon: Medal, title: "Top SME Printer, Nairobi", year: "2023" },
    { icon: Star, title: "Customer Choice Award", year: "2022" },
];

export default function AwardsSection() {
    return (
        <section id="awards" className="py-16 sm:py-20 bg-brand-blue/[0.03] border-y border-border/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-blue">
                        Recognition
                    </span>
                    <h2 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Awards &amp; Recognition
                    </h2>
                </div>

                <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {awards.map((award, index) => (
                        <motion.div
                            key={award.title}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                            className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-yellow/15">
                                <award.icon className="h-6 w-6 text-brand-yellow" strokeWidth={1.75} />
                            </span>
                            <p className="text-sm font-semibold text-foreground leading-snug">{award.title}</p>
                            <p className="text-xs text-muted-foreground">{award.year}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
