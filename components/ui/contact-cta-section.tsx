export default function ContactCTASection() {
    return (
        <div className="max-w-5xl w-full mx-auto p-10 text-gray-800 py-16 md:py-20 text-center">
            <span className="px-2 py-1 text-xs border border-gray-300 rounded-full">Reach Out To Us</span>
            <h1 className="text-4xl font-bold mt-4">
                We'd love to Hear From You.
            </h1>
            <p className="mt-4">
                Or just reach out manually to{" "}
                <a href="mailto:query@printduka.co.ke" className="text-brand-blue hover:underline">
                    query@printduka.co.ke
                </a>
            </p>
        </div>
    );
}
