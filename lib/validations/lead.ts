import { z } from "zod";

export const leadFormSchema = z.object({
    name: z.string().min(1, "Contact name is required"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    phone: z.string().optional(),
    source: z.enum(["Website", "Referral", "Cold Call", "Social Media", "Event", "Other", ""]).optional(),
    product_interest: z.string().optional(),
    preferred_contact: z.enum(["Email", "Phone", "WhatsApp"]),
    preferred_client_type: z.enum(["B2B", "B2C"]),
    follow_up_date: z.string().optional(),
    status: z.enum(["New", "Contacted", "Qualified", "Converted", "Lost"]),
    notes: z.string().optional(),
    // B2B fields
    company: z.string().optional(),
    industry: z.string().optional(),
    vat_tax_id: z.string().optional(),
    kra_pin: z.string().optional(),
    primary_contact_name: z.string().optional(),
    primary_contact_email: z.string().email("Invalid email address").optional().or(z.literal("")),
    primary_contact_phone: z.string().optional(),
    primary_contact_role: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.preferred_client_type === "B2B" && !data.company?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["company"],
            message: "Company name is required for B2B leads",
        });
    }
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
