import Image from "next/image";
import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

const QUICK_LINKS = [
    { name: "About", href: "/#our-story" },
    { name: "Services", href: "/#services" },
    { name: "Featured Work", href: "/#featured-work" },
    { name: "Store", href: "/store" },
    { name: "Contact", href: "/contact" },
];

const SOCIALS = [
    {
        name: "X/Twitter",
        href: "https://twitter.com/printduka",
        path: "M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z",
    },
    {
        name: "LinkedIn",
        href: "https://linkedin.com/company/printduka",
        path: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z",
    },
    {
        name: "Facebook",
        href: "https://facebook.com/printduka",
        path: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95",
    },
    {
        name: "Instagram",
        href: "https://instagram.com/printduka",
        path: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3",
    },
];

export default function FooterSection() {
    return (
        <footer className="bg-brand-blue text-white">
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link href="/" aria-label="Go home" className="inline-block">
                            <Image
                                src="/logo/pd.png"
                                alt="Print Duka"
                                width={140}
                                height={54}
                                className="h-12 w-auto brightness-0 invert"
                            />
                        </Link>
                        <p className="mt-4 text-sm text-white/70 leading-relaxed max-w-xs">
                            Kenya&apos;s leading print &amp; branding partner. Quality you can see and trust.
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                            {SOCIALS.map((social) => (
                                <Link
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                    className="text-white/70 hover:text-brand-yellow transition-colors"
                                >
                                    <svg className="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path fill="currentColor" d={social.path} />
                                    </svg>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Quick links */}
                    <div>
                        <h4 className="text-sm font-bold text-brand-yellow mb-4">Quick Links</h4>
                        <ul className="space-y-2.5">
                            {QUICK_LINKS.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Get in touch */}
                    <div className="sm:col-span-2 lg:col-span-2">
                        <h4 className="text-sm font-bold text-brand-yellow mb-4">Get in Touch</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-white">
                                    <MailIcon className="h-4 w-4 text-brand-yellow shrink-0" />
                                    <span className="text-sm font-semibold">Email Support</span>
                                </div>
                                <p className="mt-1.5 text-xs text-white/60">Our team can respond in real time.</p>
                                <a href="mailto:query@printduka.co.ke" className="mt-1.5 block text-sm text-white/90 hover:text-brand-yellow transition-colors">
                                    query@printduka.co.ke
                                </a>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white">
                                    <MapPinIcon className="h-4 w-4 text-brand-yellow shrink-0" />
                                    <span className="text-sm font-semibold">Visit Our Office</span>
                                </div>
                                <p className="mt-1.5 text-xs text-white/60">Visit our location in real life.</p>
                                <p className="mt-1.5 text-sm text-white/90">
                                    Parsonic Business Centre, Kweria/Kirinyaga Rd
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-white">
                                    <PhoneIcon className="h-4 w-4 text-brand-yellow shrink-0" />
                                    <span className="text-sm font-semibold">Call Us Directly</span>
                                </div>
                                <p className="mt-1.5 text-xs text-white/60">Available during working hours.</p>
                                <a href="tel:0795332766" className="mt-1.5 block text-sm text-white/90 hover:text-brand-yellow transition-colors">
                                    0795 332766
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/50">
                    <p>© {new Date().getFullYear()} Print Duka. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
