const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

interface ContactFormData {
    first_name: string;
    last_name: string;
    email: string;
    message: string;
    inquiry_type: string;
}

interface ContactFormResponse {
    message: string;
}

export async function submitContactForm(data: ContactFormData): Promise<ContactFormResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/contact/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit contact form");
    }

    return response.json();
}
