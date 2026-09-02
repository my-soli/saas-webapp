export default function LogoCloud() {
    // Add more brands here any time — the marquee duplicates this list
    // automatically to loop seamlessly, no other changes needed.
    const logos = [
        { name: "Africa's Voices", url: "/logo/clients/africas-voices.png" },
        { name: "Afroinnovation", url: "/logo/clients/afroinnovation.png" },
        { name: "AHK", url: "/logo/clients/ahk.png" },
        { name: "Alliance Française", url: "/logo/clients/alliance-francaise.png" },
        { name: "Artisan Makers Market", url: "/logo/clients/artisan-makers-market.png" },
        { name: "Ashut", url: "/logo/clients/ashut.png" },
        { name: "BDDL", url: "/logo/clients/bddl.jpg" },
        { name: "Bolt", url: "/logo/clients/bolt.png" },
        { name: "BuuPass", url: "/logo/clients/buupass.png" },
        { name: "CHRIPS", url: "/logo/clients/chrips.jpg" },
        { name: "CrissCross", url: "/logo/clients/crisscross.png" },
        { name: "Dalberg", url: "/logo/clients/dalberg.png" },
        { name: "European Union", url: "/logo/clients/eu.png" },
        { name: "France Embassy", url: "/logo/clients/france-embassy.png" },
        { name: "Galana Energies", url: "/logo/clients/galana-energies.png" },
        { name: "Gulfcap Real Estate", url: "/logo/clients/gulfcap-real-estate.png" },
        { name: "Hackhouse Africa", url: "/logo/clients/hackhouse-africa.png" },
        { name: "Hotpoint", url: "/logo/clients/hotpoint.png" },
        { name: "I&M Bank", url: "/logo/clients/im-bank.png" },
        { name: "Infraco Africa", url: "/logo/clients/infraco-africa.png" },
        { name: "JTL Faiba", url: "/logo/clients/jtl-faiba.png" },
        { name: "Kilimani Community Foundation", url: "/logo/clients/kilimani-community-foundation.png" },
        { name: "Kiota School", url: "/logo/clients/kiota-school.jpg" },
        { name: "KPMG", url: "/logo/clients/kpmg.png" },
        { name: "Kraftory", url: "/logo/clients/kraftory.jpg" },
        { name: "Kunta Content", url: "/logo/clients/kunta-content.jpg" },
        { name: "Maa Trust", url: "/logo/clients/maa-trust.png" },
        { name: "Macaash", url: "/logo/clients/macaash.png" },
        { name: "Maiyan Homes", url: "/logo/clients/maiyan-homes.jpg" },
        { name: "Networks Padel Village", url: "/logo/clients/networks-padel-village.jpg" },
        { name: "NTU", url: "/logo/clients/ntu.png" },
        { name: "Oxford University Press", url: "/logo/clients/oxford-university-press.png" },
        { name: "Oyana School", url: "/logo/clients/oyana-school.png" },
        { name: "Purpink", url: "/logo/clients/purpink.png" },
        { name: "Rubi Ranch", url: "/logo/clients/rubi-ranch.png" },
        { name: "Rubis Energy", url: "/logo/clients/rubis-energy.png" },
        { name: "SIB Bank", url: "/logo/clients/sib-bank.jpg" },
        { name: "Sling Money", url: "/logo/clients/sling-money.png" },
        { name: "SOMO", url: "/logo/clients/somo.png" },
        { name: "Startinev", url: "/logo/clients/startinev.jpg" },
        { name: "Stitch Money", url: "/logo/clients/stitch-money.jpg" },
        { name: "Tessen", url: "/logo/clients/tessen.png" },
        { name: "TV47", url: "/logo/clients/tv47.jpg" },
        { name: "Uncover Africa", url: "/logo/clients/uncover-africa.jpg" },
        { name: "United Nations", url: "/logo/clients/united-nations.png" },
        { name: "VAAL", url: "/logo/clients/vaal.png" },
        { name: "Victoria Furniture", url: "/logo/clients/victoria-furniture.png" },
        { name: "Waridi Health", url: "/logo/clients/waridi-health.png" },
        { name: "Young Engineers", url: "/logo/clients/young-engineers.png" },
    ];

    const industries = [
        "Banking",
        "FMCG",
        "Technology",
        "Tours and Travel",
        "NGOs",
        "Retail",
        "Events",
        "Corporate",
        "Real Estate",
        "Agriculture",
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
                    animation: pd-marquee 170s linear infinite;
                }
                .pd-marquee-track:hover {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="mx-auto max-w-2xl text-center px-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Trusted by 50+ brands
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                    From growing businesses to global organisations.
                </p>
            </div>

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
                                className="h-8 sm:h-10 w-auto object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="mx-auto mt-12 max-w-3xl px-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Industries we&apos;ve worked across
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    {industries.map((industry) => (
                        <span
                            key={industry}
                            className="rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-brand-blue"
                        >
                            {industry}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
