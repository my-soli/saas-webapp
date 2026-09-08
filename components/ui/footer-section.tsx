import Image from "next/image";
import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

const QUICK_LINKS = [
    { name: "About", href: "/#our-story" },
    { name: "Services", href: "/#services" },
    { name: "Store", href: "/store" },
    { name: "Contact", href: "/contact" },
];

const CONTACT_ITEMS = [
    { icon: MailIcon, href: "mailto:query@printduka.co.ke", label: "query@printduka.co.ke" },
    { icon: PhoneIcon, href: "tel:0795332766", label: "0795 332766" },
    { icon: MapPinIcon, href: undefined, label: "Parsonic Business Centre, Kweria/Kirinyaga Rd" },
];

const SOCIALS = [
    {
        name: "Instagram",
        href: "https://www.instagram.com/print.duka/",
        path: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3",
    },
    {
        name: "Facebook",
        href: "https://www.facebook.com/printduka",
        path: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95",
    },
    {
        name: "TikTok",
        href: "https://www.tiktok.com/@print.duka",
        path: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    },
];

export default function FooterSection() {
    return (
        <footer className="bg-brand-blue text-white">
            <div className="mx-auto max-w-6xl px-6 py-14">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
                    {/* Brand */}
                    <div>
                        <Link href="/" aria-label="Go home" className="inline-block">
                            <Image
                                src="/logo/pd.png"
                                alt="Print Duka"
                                width={140}
                                height={54}
                                className="h-11 w-auto brightness-0 invert"
                            />
                        </Link>
                        <p className="mt-3 text-sm text-white/60 leading-relaxed max-w-[220px]">
                            Kenya&apos;s leading print &amp; branding partner.
                        </p>
                        <div className="mt-5 flex items-center gap-4">
                            {SOCIALS.map((social) => (
                                <Link
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                    className="text-white/60 hover:text-brand-yellow transition-colors"
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
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Quick Links</h4>
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

                    {/* Contact */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Contact</h4>
                        <ul className="space-y-2.5">
                            {CONTACT_ITEMS.map(({ icon: Icon, href, label }) => (
                                <li key={label} className="flex items-start gap-2 text-sm text-white/70">
                                    <Icon className="h-4 w-4 mt-0.5 text-brand-yellow shrink-0" />
                                    {href ? (
                                        <a href={href} className="hover:text-white transition-colors">{label}</a>
                                    ) : (
                                        <span>{label}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/40">
                    © {new Date().getFullYear()} Print Duka. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
