"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

// TODO: swap these for real project photography once available — image
// choices below are generic stand-ins matched to each project's category.
const projects = [
    {
        title: "I&M Cohort Gifting",
        category: "Design • Branding • Production",
        image: "/banner/clothing.png",
    },
    {
        title: "Hotpoint",
        category: "Signage • Print • Branding",
        image: "/banner/banner.jpg",
    },
    {
        title: "XYZ",
        category: "Packaging • Print",
        image: "/banner/inkwise.jpg",
    },
];

export default function FeaturedWorkSection() {
    return (
        <section id="featured-work" className="py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-blue">
                        Our Work
                    </span>
                    <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                        Work We&apos;ve Brought to Life
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                        A look at some of the brands we&apos;ve helped bring to life —
                        on signage, apparel, vehicles, and everything in between.
                    </p>
                </div>

                <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {projects.map((project, index) => (
                        <motion.a
                            key={project.title}
                            href="mailto:query@printduka.co.ke"
                            className="group relative block aspect-[4/3] overflow-hidden rounded-3xl"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={project.image}
                                alt={project.title}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-opacity duration-500" />

                            <span className="absolute top-5 left-5 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-brand-blue">
                                {project.category}
                            </span>

                            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                                <h3 className="text-lg sm:text-xl font-semibold text-white leading-snug">
                                    {project.title}
                                </h3>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-brand-blue opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                    <ArrowUpRight className="h-5 w-5" />
                                </span>
                            </div>
                        </motion.a>
                    ))}
                </div>

                <div className="mt-14 flex justify-center">
                    <a
                        href="mailto:query@printduka.co.ke"
                        className="inline-flex items-center rounded-full bg-brand-blue px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm shadow-brand-blue/20 transition-all duration-300 hover:shadow-lg hover:shadow-brand-blue/30 hover:bg-brand-blue/95"
                    >
                        Get a Quote
                    </a>
                </div>
            </div>
        </section>
    );
}
