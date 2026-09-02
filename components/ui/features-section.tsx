"use client";

const PROCESS_STEPS = ["Design", "Print", "Brand", "Finish", "Deliver"];

const FEATURES = [
    {
        number: "01",
        title: "One team.",
        description: "Design and production under one roof.",
    },
    {
        number: "02",
        title: "Quality you can see.",
        description: "Colour, finishing and detail matter.",
    },
    {
        number: "03",
        title: "Built around your deadline.",
        description: "Because sometimes you needed it yesterday.",
    },
];

export default function FeaturesSection() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

                * {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>

            <div className="relative bg-gradient-to-b from-white via-indigo-50/30 to-white">
                <svg className="size-full absolute -z-10 inset-0" width="1440" height="720" viewBox="0 0 1440 720" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="#E2E8F0" strokeOpacity=".7" d="M-15.227 702.342H1439.7" />
                    <circle cx="711.819" cy="372.562" r="308.334" stroke="#E2E8F0" strokeOpacity=".7" />
                    <circle cx="16.942" cy="20.834" r="308.334" stroke="#E2E8F0" strokeOpacity=".7" />
                    <path stroke="#E2E8F0" strokeOpacity=".7" d="M-15.227 573.66H1439.7M-15.227 164.029H1439.7" />
                    <circle cx="782.595" cy="411.166" r="308.334" stroke="#E2E8F0" strokeOpacity=".7" />
                </svg>

                <section className="flex flex-col max-md:gap-20 md:flex-row pb-20 items-center justify-between pt-16 px-4 md:px-16 lg:px-24 xl:px-32">
                    <div className="flex flex-col items-center md:items-start">
                        <h1 className="text-center md:text-left text-4xl leading-tight md:text-5xl md:leading-[1.15] font-medium max-w-xl text-slate-900">
                            From Idea to <span className="text-brand-yellow">Finished Product.</span>
                        </h1>
                        <p className="text-center md:text-left text-lg text-slate-700 max-w-lg mt-2">
                            You don&apos;t need five different suppliers.
                        </p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-2 mt-6 text-sm font-semibold text-brand-blue">
                            {PROCESS_STEPS.map((step, i) => (
                                <span key={step} className="flex items-center gap-2">
                                    <span className="rounded-full bg-brand-blue/10 px-4 py-1.5">{step}</span>
                                    {i < PROCESS_STEPS.length - 1 && (
                                        <span className="text-slate-400">→</span>
                                    )}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 mt-8 text-sm">
                            <a href="mailto:query@printduka.co.ke" className="bg-brand-blue hover:bg-brand-blue/90 text-white active:scale-95 rounded-md px-7 h-11 flex items-center justify-center transition">
                                Get Quote
                            </a>
                            <a href="tel:0795332766" className="flex items-center gap-2 border border-slate-600 active:scale-95 hover:bg-white/10 transition text-slate-600 rounded-md px-6 h-11">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>Call Us</span>
                            </a>
                        </div>
                    </div>
                    <img src="/banner/van.jpg" alt="Print Duka Printing Services" className="max-w-xs sm:max-w-sm lg:max-w-md transition-all duration-300 rounded-2xl shadow-xl" />
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 px-4 md:px-16 lg:px-24 xl:px-32 pb-20">
                    {FEATURES.map((feature) => (
                        <div key={feature.title} className="text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2.5">
                                <span className="h-px w-6 bg-brand-yellow" />
                                <span className="text-3xl sm:text-4xl font-light text-brand-blue/25">
                                    {feature.number}
                                </span>
                            </div>
                            <h3 className="mt-3 text-lg font-semibold text-slate-900">{feature.title}</h3>
                            <p className="mt-1.5 text-sm text-slate-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
