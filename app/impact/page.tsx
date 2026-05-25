import Link from "next/link";
import {
    ArrowRight,
    ArrowUpRight,
    Leaf,
    ShieldCheck,
    Users,
    Scale,
    Globe2,
    Mail,
    MessageCircle,
    FileText,
    Menu,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import FooterSection from "@/components/ui/footer-section";
import { Logo } from "@/components/logo";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const heroImg = "/impact.jpg";
const climateImg = "/banner/marketing.jpg";
const climateForestryImg = "/banner/banner.jpg";
const climateTechImg = "/banner/stationary.jpg";
const businessImg = "/banner/clothing.png";
const rightsImg = "/banner/van.jpg";

export const metadata = {
    title: "Impact — Creating Value Responsibly",
    description:
        "How we create value responsibly: climate action, responsible business, inclusion, human rights and accountability.",
};

const navigation = [
    { name: "Services", href: "/#services" },
    { name: "About", href: "/#about" },
    { name: "Contact", href: "/contact" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            <span className="h-px w-8 bg-emerald-800/60" />
            {children}
        </div>
    );
}

export default function ImpactPage() {
    const climateCards = [
        {
            image: climateImg,
            alt: "Print production environment and materials",
            title: "Operational efficiency",
            body: (
                <>
                    <p>
                        We continuously refine our processes to reduce waste, optimise resource use
                        and minimise our environmental footprint across operations.
                    </p>
                    <p className="mt-5">
                        We also work with our core suppliers and production partners to improve how
                        environmental performance is managed across the broader value chain.
                    </p>
                </>
            ),
        },
        {
            image: climateForestryImg,
            alt: "Large format print materials and production outputs",
            title: "Responsible partnerships",
            body: (
                <p>
                    We work with partners who demonstrate responsible environmental practices and
                    share our commitment to long-term sustainability across sourcing, production and
                    delivery.
                </p>
            ),
        },
        {
            image: climateTechImg,
            alt: "Organized print and stationery production setup",
            title: "Alternative solutions",
            body: (
                <p>
                    Where feasible, we offer sustainable product options and materials that reduce
                    environmental impact without compromising quality, turnaround or brand
                    presentation.
                </p>
            ),
        },
    ];

    const businessPrinciples = [
        {
            label: "Partner with integrity",
            text: "We engage partners who demonstrate reliability, professionalism and responsible practices across all collaborations.",
        },
        {
            label: "Fair relationships",
            text: "We maintain respectful working relationships and fair terms across engagements, recognising the value each partner brings.",
        },
        {
            label: "Quality & accountability",
            text: "We promote consistency, quality standards and accountability in how work is delivered and how we operate.",
        },
        {
            label: "Diverse collaboration",
            text: "We work with partners and contributors across different scales, backgrounds and specialisations.",
        },
        {
            label: "Market access",
            text: "We support creatives and independent producers by providing access to market opportunities and client networks.",
        },
        {
            label: "Continuous improvement",
            text: "We refine how work is coordinated to expand participation, improve efficiency and create more opportunities.",
        },
    ];

    const rightsFrameworks = [
        {
            icon: Globe2,
            title: "UN Guiding Principles",
            body: "The Business and Human Rights framework guides how we operate.",
        },
        {
            icon: FileText,
            title: "Universal Declaration",
            body: "The Universal Declaration of Human Rights as our foundational reference.",
        },
        {
            icon: Scale,
            title: "ILO Principles",
            body: "Fair and safe working conditions for everyone we work with.",
        },
    ];

    return (
        <>
            <div className="absolute left-0 right-0 top-0 z-30">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="mt-4 flex items-center gap-4">
                        <div className="flex w-full items-center gap-4 rounded-br-2xl bg-white/90 p-3 backdrop-blur-sm md:w-auto md:min-w-[460px]">
                            <Link href="/" className="flex shrink-0 items-center" aria-label="Print Duka home">
                                <Logo variant="black" />
                            </Link>

                            <nav className="hidden items-center gap-2 lg:flex">
                                {navigation.map((item) => (
                                    <Button
                                        key={item.name}
                                        variant="link"
                                        asChild
                                        className="text-foreground transition-colors hover:text-primary"
                                    >
                                        <Link href={item.href}>{item.name}</Link>
                                    </Button>
                                ))}
                            </nav>

                            <Sheet>
                                <SheetTrigger asChild className="ml-auto lg:hidden">
                                    <Button variant="ghost" size="icon" className="transition-colors hover:text-primary">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="left"
                                    className="w-[300px] border-r border-border/50 bg-background/95 p-0 backdrop-blur-md sm:w-[400px]"
                                >
                                    <SheetHeader className="border-b border-border/50 p-6 text-left">
                                        <SheetTitle>
                                            <Logo variant="black" />
                                        </SheetTitle>
                                    </SheetHeader>
                                    <nav className="flex flex-col space-y-1 p-6">
                                        {navigation.map((item) => (
                                            <Button
                                                key={item.name}
                                                variant="ghost"
                                                asChild
                                                className="h-12 justify-start px-2 text-base font-medium transition-colors hover:bg-accent/50 hover:text-primary"
                                            >
                                                <Link href={item.href}>{item.name}</Link>
                                            </Button>
                                        ))}
                                    </nav>
                                    <Separator className="mx-6" />
                                    <div className="p-6">
                                        <Button asChild className="h-12 w-full bg-brand-blue shadow-lg transition-all duration-300 hover:bg-brand-blue/90">
                                            <a href="mailto:query@printduka.co.ke">
                                                Get Quote
                                                <ArrowUpRight className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        <div className="ml-auto hidden md:flex">
                            <Button
                                asChild
                                variant="secondary"
                                className="group cursor-pointer rounded-full border border-white/20 bg-white/10 p-0 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
                            >
                                <a href="mailto:query@printduka.co.ke">
                                    <span className="py-2 pl-4 text-sm font-medium">Get Quote</span>
                                    <div className="ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:scale-110">
                                        <ArrowUpRight className="h-5 w-5 text-slate-900" />
                                    </div>
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="bg-white text-neutral-900 antialiased">
                <section className="relative isolate overflow-hidden">
                    <Image
                        src={heroImg}
                        alt="Sunlit modern production facility with greenery"
                        width={1920}
                        height={1080}
                        className="absolute inset-0 h-full w-full object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/55 to-neutral-950/80" />
                    <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-end px-6 py-24 md:py-32 lg:px-12">
                        <div className="max-w-3xl text-white">
                            <Eyebrow>
                                <span className="text-white/80">Our Impact</span>
                            </Eyebrow>
                            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                                Creating value,
                                <br />
                                <span className="italic font-light text-white/85">responsibly.</span>
                            </h1>
                            <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
                                We empower businesses and individuals to build strong brands and express their ideas
                                through accessible, high-quality print and brand solutions — while expanding market
                                access for diverse suppliers and promoting responsible practices within a
                                commercially sustainable ecosystem.
                            </p>
                            <div className="mt-10 flex flex-wrap items-center gap-4">
                                <a
                                    href="#climate"
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                                >
                                    Explore our commitments <ArrowRight className="h-4 w-4" />
                                </a>
                                <a
                                    href="#feedback"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                    Get in touch
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-12 md:py-28 lg:px-12">
                        <div className="md:col-span-4">
                            <Eyebrow>Our approach</Eyebrow>
                            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                                A business built to create value — responsibly.
                            </h2>
                        </div>
                        <div className="md:col-span-7 md:col-start-6">
                            <p className="text-lg leading-relaxed text-neutral-700">
                                We are committed to building a business that creates value responsibly. Our approach
                                focuses on how we work with people, partners and systems to deliver quality outcomes
                                while improving access, inclusion and long-term sustainability.
                            </p>
                            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-neutral-200 pt-10">
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Aligned with
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold tracking-tight">1.5°C</dd>
                                    <p className="mt-1 text-sm text-neutral-600">Paris Agreement pathway</p>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Guided by
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold tracking-tight">UNGP</dd>
                                    <p className="mt-1 text-sm text-neutral-600">UN Guiding Principles</p>
                                </div>
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Anchored in
                                    </dt>
                                    <dd className="mt-2 text-2xl font-semibold tracking-tight">ILO</dd>
                                    <p className="mt-1 text-sm text-neutral-600">Fair, safe working conditions</p>
                                </div>
                            </dl>
                        </div>
                    </div>
                </section>

                <section id="climate" className="bg-white py-12 md:py-16">
                    <div className="mx-auto max-w-[1200px] px-6">
                        <h2 className="border-b border-gray-200 pb-5 text-[28px] font-extrabold tracking-tight text-gray-900">
                            Climate Action
                        </h2>

                        <p className="mt-6 max-w-3xl text-[16px] leading-7 text-gray-700">
                            Supporting global efforts to limit warming to 1.5°C through responsible operations and
                            strategic partnerships.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
                            {climateCards.map((card) => (
                                <article key={card.title} className="flex flex-col">
                                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                                        <Image
                                            src={card.image}
                                            alt={card.alt}
                                            fill
                                            loading="lazy"
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    </div>
                                    <h3 className="mt-6 text-[22px] font-extrabold leading-snug tracking-tight text-gray-900">
                                        {card.title}
                                    </h3>
                                    <div className="mt-4 space-y-0 text-[16px] leading-7 text-gray-700">{card.body}</div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-12">
                        <div className="grid gap-16 md:grid-cols-12">
                            <div className="md:col-span-5">
                                <Eyebrow>02 — Responsible business</Eyebrow>
                                <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                                    Inclusion and access, by design.
                                </h2>
                                <p className="mt-6 text-lg leading-relaxed text-neutral-700">
                                    We are building a system where diverse partners can participate meaningfully — while
                                    maintaining the operational standards our clients depend on.
                                </p>

                                <div className="mt-10 overflow-hidden rounded-2xl">
                                    <Image
                                        src={businessImg}
                                        alt="Diverse team collaborating in a studio"
                                        width={1280}
                                        height={960}
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-7">
                                <ol className="divide-y divide-neutral-200 border-y border-neutral-200">
                                    {businessPrinciples.map((p, index) => (
                                        <li key={p.label} className="grid grid-cols-12 gap-6 py-7">
                                            <div className="col-span-2 text-sm font-mono tabular-nums text-neutral-400">
                                                {String(index + 1).padStart(2, "0")}
                                            </div>
                                            <div className="col-span-10">
                                                <h3 className="text-lg font-semibold tracking-tight text-neutral-900">
                                                    {p.label}
                                                </h3>
                                                <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{p.text}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-neutral-50">
                    <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:px-12">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-2xl bg-white p-8 md:p-10">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-emerald-800" strokeWidth={1.75} />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-900">
                                        Our goal
                                    </h3>
                                </div>
                                <p className="mt-5 text-[20px] font-medium leading-relaxed tracking-tight text-neutral-900">
                                    Build a system where more people can participate meaningfully in delivering value,
                                    while maintaining strong operational standards and sustainable growth.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-neutral-950 p-8 text-white md:p-10">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-emerald-300" strokeWidth={1.75} />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-200">
                                        Our stance
                                    </h3>
                                </div>
                                <p className="mt-5 text-[20px] font-medium leading-relaxed tracking-tight text-white/90">
                                    We do not support practices that involve exploitation or discrimination. We
                                    actively push for safe working conditions and apply these principles in how we
                                    engage our team, partners and clients.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
                    <Image
                        src={rightsImg}
                        alt="Handshake between two professionals"
                        width={1280}
                        height={960}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-25"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-950/90 to-emerald-950/70" />
                    <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-12">
                        <div className="grid gap-16 md:grid-cols-12">
                            <div className="md:col-span-5">
                                <Eyebrow>
                                    <span className="text-emerald-300">03 — Human rights</span>
                                </Eyebrow>
                                <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                                    Respect for human rights, in every relationship.
                                </h2>
                                <p className="mt-6 text-lg leading-relaxed text-white/75">
                                    We are committed to respecting human rights throughout our operations and
                                    relationships, aligned with internationally recognised standards.
                                </p>
                            </div>

                            <div className="md:col-span-7">
                                <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10">
                                    {rightsFrameworks.map(({ icon: Icon, title, body }) => (
                                        <div key={title} className="bg-neutral-950/60 p-8 backdrop-blur md:p-10">
                                            <div className="flex items-start gap-5">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 text-emerald-300">
                                                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
                                                    <p className="mt-2 text-[15px] leading-relaxed text-white/70">{body}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="feedback" className="bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-12">
                        <div className="grid gap-16 md:grid-cols-12">
                            <div className="md:col-span-5">
                                <Eyebrow>04 — Accountability</Eyebrow>
                                <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                                    Open channels.
                                    <br />
                                    Real responses.
                                </h2>
                                <p className="mt-6 text-lg leading-relaxed text-neutral-700">
                                    We provide accessible channels for stakeholders to share feedback, raise concerns or
                                    report issues. All feedback is reviewed within our operational processes — we aim to
                                    respond in a timely and fair manner, and use what we hear to improve.
                                </p>
                            </div>

                            <div className="md:col-span-7">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <a
                                        href="mailto:query@printduka.co.ke"
                                        className="group rounded-2xl border border-neutral-200 p-8 transition hover:border-emerald-700 hover:shadow-sm"
                                    >
                                        <Mail className="h-6 w-6 text-emerald-800" strokeWidth={1.75} />
                                        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                            Email
                                        </h3>
                                        <p className="mt-2 text-lg font-medium tracking-tight text-neutral-900">
                                            query@printduka.co.ke
                                        </p>
                                        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition group-hover:gap-3">
                                            Send a message <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </a>

                                    <a
                                        href="https://wa.me/254795332766"
                                        className="group rounded-2xl border border-neutral-200 p-8 transition hover:border-emerald-700 hover:shadow-sm"
                                    >
                                        <MessageCircle className="h-6 w-6 text-emerald-800" strokeWidth={1.75} />
                                        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                            WhatsApp
                                        </h3>
                                        <p className="mt-2 text-lg font-medium tracking-tight text-neutral-900">
                                            +254 795 332766
                                        </p>
                                        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition group-hover:gap-3">
                                            Start a chat <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-neutral-50">
                    <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-12">
                        <div className="grid gap-12 md:grid-cols-12 md:items-end">
                            <div className="md:col-span-7">
                                <Eyebrow>Continuous improvement</Eyebrow>
                                <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                                    Impact is a process — not a project.
                                </h2>
                            </div>
                            <div className="md:col-span-5">
                                <p className="text-lg leading-relaxed text-neutral-700">
                                    As our business grows, we continue to improve our systems, partnerships and
                                    practices to better align with responsible and sustainable operations. Our approach
                                    is reviewed periodically and updated as needed — keeping us accountable to our
                                    commitments and responsive to emerging challenges.
                                </p>
                                <div className="mt-8 flex items-center gap-3 text-sm">
                                    <Leaf className="h-4 w-4 text-emerald-700" />
                                    <Link
                                        href="/"
                                        className="font-semibold text-emerald-800 hover:text-emerald-900"
                                    >
                                        Back to home
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <FooterSection />
        </>
    );
}