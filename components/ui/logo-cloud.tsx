export default function LogoCloud() {
    // Add more brands here any time — the marquee duplicates this list
    // automatically to loop seamlessly, no other changes needed.
    const logos = [
        {
            name: "Safaricom",
            url: "/logo/SAF-MAIN-LOGO.png",
        },
        {
            name: "Hotpoint",
            url: "/logo/hotpoint.png",
        },
        {
            name: "Asshut",
            url: "/logo/asshut.png",
        },
        {
            name: "IM",
            url: "/logo/im.png",
        },
        {
            name: "JTL",
            url: "/logo/jtl.png",
        },
        {
            name: "Njoodada",
            url: "/logo/njoodada.jpg",
        },
        {
            name: "Tumaini Innovation Center",
            url: "/logo/tumaini-innovation-center.png",
        },
        {
            name: "Victorial",
            url: "/logo/victorial.png",
        },
        {
            name: "European Union",
            url: "/logo/Flag-European-Union.webp",
        },
    ];

    const track = [...logos, ...logos];

    return (
        <section className="bg-background py-16 sm:py-20 overflow-hidden">
            <style>{`
                @keyframes pd-marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .pd-marquee-track {
                    animation: pd-marquee 32s linear infinite;
                }
                .pd-marquee-track:hover {
                    animation-play-state: paused;
                }
            `}</style>

            <h2 className="text-center text-sm sm:text-base font-semibold uppercase tracking-wider text-muted-foreground">
                Trusted by leading brands across the world
            </h2>

            <div
                className="relative mt-12 w-full"
                style={{
                    maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
                    WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
                }}
            >
                <div className="pd-marquee-track flex w-max items-center gap-16 sm:gap-20">
                    {track.map((logo, i) => (
                        <div
                            key={`${logo.name}-${i}`}
                            className="flex shrink-0 items-center justify-center opacity-90 transition-all duration-300 hover:opacity-100 hover:scale-105"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={logo.url}
                                alt={logo.name}
                                className={logo.name === "Safaricom" ? "h-16 sm:h-20 w-auto object-contain" : "h-8 sm:h-10 w-auto object-contain"}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
