"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Share2, Clock3, Trophy, ArrowUpRight } from "lucide-react";

const DOCUMENTARY_YOUTUBE_ID = "PgZQfHBH01g";
const DOCUMENTARY_TITLE = "The Making of Nairobi's Best";
const DOCUMENTARY_CHANNEL = "Print Duka";
// YouTube's own thumbnail for this video (via the oEmbed API), so the cover
// matches exactly what's shown on YouTube itself.
const DOCUMENTARY_POSTER = `https://i.ytimg.com/vi/${DOCUMENTARY_YOUTUBE_ID}/maxresdefault.jpg`;
// TODO: dummy placeholder — replace with the real URL to wherever the award
// was announced (awarding body's site, press release, LinkedIn post, etc.)
// once that's available.
const AWARDS_URL = "https://example.com/print-duka-award";

export default function DocumentarySection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="our-story" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-blue">
              Our Story
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-foreground">
              Every Print Has a
              <br />
              <span className="text-brand-yellow">Story Behind It.</span>
            </h2>
            <p className="mt-5 max-w-md text-base sm:text-lg text-muted-foreground leading-relaxed">
              Step inside our workshop and see how an idea becomes a finished
              piece — from first sketch to final finish, told by the people
              who make it happen every day.
            </p>

            <div className="mt-8">
              <a
                href={AWARDS_URL}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-brand-blue transition-colors"
              >
                <Trophy className="h-4 w-4 text-brand-yellow" />
                View our awards
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </motion.div>

          {/* Right — YouTube facade card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-2xl shadow-brand-blue/10 ring-1 ring-black/5"
          >
            {playing ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${DOCUMENTARY_YOUTUBE_ID}?autoplay=1`}
                title={DOCUMENTARY_TITLE}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Play ${DOCUMENTARY_TITLE}`}
                className="group absolute inset-0 h-full w-full text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DOCUMENTARY_POSTER}
                  alt={DOCUMENTARY_TITLE}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

                {/* Title bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-4 sm:p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow ring-2 ring-white/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/pd.png" alt="" className="h-5 w-5 object-contain" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm sm:text-base font-semibold text-white">{DOCUMENTARY_TITLE}</p>
                    <p className="text-xs text-white/70">{DOCUMENTARY_CHANNEL}</p>
                  </div>
                </div>

                {/* Play button */}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-7 w-7 sm:h-8 sm:w-8 text-white fill-white ml-1" />
                  </span>
                </span>

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                      <Share2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    Watch on
                    <svg viewBox="0 0 28 20" className="h-3.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M27.4 3.1a3.5 3.5 0 0 0-2.46-2.48C22.7 0 14 0 14 0S5.3 0 3.06.62A3.5 3.5 0 0 0 .6 3.1 36.6 36.6 0 0 0 0 10a36.6 36.6 0 0 0 .6 6.9 3.5 3.5 0 0 0 2.46 2.48C5.3 20 14 20 14 20s8.7 0 10.94-.62a3.5 3.5 0 0 0 2.46-2.48A36.6 36.6 0 0 0 28 10a36.6 36.6 0 0 0-.6-6.9Z" fill="#FF0000"/>
                      <path d="M11.2 14.3 18.5 10l-7.3-4.3v8.6Z" fill="#fff"/>
                    </svg>
                    YouTube
                  </span>
                </div>
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
