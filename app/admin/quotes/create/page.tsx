"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/admin-layout";
import type { Client } from "@/types/clients";
import type { Lead } from "@/types/leads";
import type { Product } from "@/types/products";
import type { CreateQuoteInput, Quote, MultiProductQuote, QuoteLineItem } from "@/types/quotes";
import type { LineItem } from "@/features/quotes/types";
import { fetchClients } from "@/services/clients";
import { fetchLeads } from "@/services/leads";
import { fetchProducts } from "@/services/products";
import { createMultiProductQuote, fetchQuote, updateQuote, sendQuoteToPT, uploadQuoteAttachments, getApprovalLink } from "@/services/quotes";
import { getCurrentUser } from "@/services/users";
import QuoteTopBar from "@/features/quotes/components/QuoteTopBar";
import QuoteHeaderSection from "@/features/quotes/components/QuoteHeaderSection";
import QuoteLineItemsTable from "@/features/quotes/components/QuoteLineItemsTable";
import QuoteNotesSection from "@/features/quotes/components/QuoteNotesSection";
import QuoteTotalsSidebar from "@/features/quotes/components/QuoteTotalsSidebar";
import QuotePTCostBanner from "@/features/quotes/components/QuotePTCostBanner";
import QuoteAttachmentsSection from "@/features/quotes/components/QuoteAttachmentsSection";
import SelectProductionMemberModal from "@/features/quotes/components/SelectProductionMemberModal";
import { toast } from "sonner";

export default function AdminCreateQuotePage() {
    return (
        <Suspense fallback={null}>
            <AdminCreateQuotePageContent />
        </Suspense>
    );
}

const DEFAULT_NOTES = "Looking forward for your business.";
const DEFAULT_TERMS =
`1. A 70% advance payment or a valid purchase order (PO) is required to initiate production.
2. The remaining payment must be settled within 14 days after the items are delivered.
3. The quoted price remains valid for 30 days from the date of the initial quotation.
4. Late payments may incur additional charges as per our policy.`;
const DEFAULT_PAYMENT_OPTIONS =
`Account transfer
Bank: I&M Bank Limited
Acc name: Print Duka Limited
Acc: 04404566816350
Branch: Tatu City
Branch code: 044
Bank code: 57
Branch full code: 57044
Swift code: IMBLKENA

M-Pesa
Paybill: 542542
Account: 35450`;

function AdminCreateQuotePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const editId = searchParams.get("edit");
    const isEditMode = !!editId;
    const quoteId = editId ? Number(editId) : null;

    const [clientType, setClientType] = useState<"client" | "lead">("client");
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
    const [referenceNumber, setReferenceNumber] = useState("");
    const [projectName, setProjectName] = useState("");
    const [productionCost, setProductionCost] = useState("");
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
    const [expiryDate, setExpiryDate] = useState(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
    const [customerNotes, setCustomerNotes] = useState(DEFAULT_NOTES);
    const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_TERMS);
    const [paymentOptions, setPaymentOptions] = useState(DEFAULT_PAYMENT_OPTIONS);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [enableTax, setEnableTax] = useState(true);
    const [taxRate, setTaxRate] = useState(16);
    const [enableShipping, setEnableShipping] = useState(false);
    const [shippingCharges, setShippingCharges] = useState(0);
    const [enableAdjustment, setEnableAdjustment] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState(0);
    const [adjustmentReason, setAdjustmentReason] = useState("");
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [pendingAction, setPendingAction] = useState<"draft" | "send_pt" | "send_customer" | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
    const [savedQuoteDisplayId, setSavedQuoteDisplayId] = useState<string | null>(null);
    const [showPTModal, setShowPTModal] = useState(false);
    const [quoteLink, setQuoteLink] = useState<string | null>(null);

    const { data: existingQuote, isLoading: quoteLoading } = useQuery({
        queryKey: ["quote", quoteId],
        queryFn: () => fetchQuote(quoteId!),
        enabled: isEditMode && quoteId !== null,
    });

    const { data: clientsData, isLoading: clientsLoading, error: clientsError } = useQuery({
        queryKey: ["clients", 1, 100, ""],
        queryFn: () => fetchClients({ page: 1, pageSize: 100, search: "", status: "all", clientType: "all" }),
    });

    const { data: leadsData, isLoading: leadsLoading, error: leadsError } = useQuery({
        queryKey: ["leads-for-quotes", 1, 100, ""],
        queryFn: () => fetchLeads({ page: 1, pageSize: 100, search: "", status: "Qualified", source: "all" }),
    });

    const { data: productsData } = useQuery({
        queryKey: ["products", 1, 200, ""],
        queryFn: () => fetchProducts({ page: 1, pageSize: 200, search: "", status: "published", pricingMode: "all", printCategory: "", category: "" }),
    });

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const clients = clientsData?.results || [];
    const leads = leadsData?.results || [];
    const products = productsData?.results || [];
    const displayUserName = currentUser ? (currentUser.first_name + " " + currentUser.last_name).trim() || currentUser.email : "Loading...";

    const isWithinEditWindow = (() => {
        if (!existingQuote || existingQuote.status !== "Approved") return true;
        const ref = existingQuote.first_sent_at || existingQuote.approved_at;
        if (!ref) return true;
        return Date.now() - new Date(ref).getTime() < 30 * 24 * 60 * 60 * 1000;
    })();

    useEffect(() => {
        if (isEditMode && existingQuote && existingQuote.line_items) {
            if (existingQuote.client) {
                setClientType("client");
                setSelectedClientId(existingQuote.client);
            } else if (existingQuote.lead) {
                setClientType("lead");
                setSelectedLeadId(existingQuote.lead);
            }
            setReferenceNumber(existingQuote.reference_number || "");
            setProjectName(existingQuote.project_name || "");
            setProductionCost(existingQuote.production_cost ? String(existingQuote.production_cost) : "");
            setQuoteDate(existingQuote.quote_date);
            setExpiryDate(existingQuote.valid_until);
            setCustomerNotes(existingQuote.customer_notes || existingQuote.notes || DEFAULT_NOTES);
            setTermsAndConditions(existingQuote.custom_terms || DEFAULT_TERMS);
            setPaymentOptions(existingQuote.payment_options || DEFAULT_PAYMENT_OPTIONS);
            setEnableTax(existingQuote.include_vat ?? true);
            setTaxRate(existingQuote.tax_rate || 16);
            setEnableShipping((existingQuote.shipping_charges ?? 0) > 0);
            setShippingCharges(existingQuote.shipping_charges || 0);
            setEnableAdjustment((existingQuote.adjustment_amount ?? 0) !== 0);
            setAdjustmentAmount(existingQuote.adjustment_amount || 0);
            setAdjustmentReason(existingQuote.adjustment_reason || "");
            const mappedLineItems = existingQuote.line_items.map((item, index) => ({
                tempId: `existing-${item.id || index}`,
                product_id: item.product || 0,
                product_name: item.product_name,
                product_sku: "",
                pricing_mode: item.customization_level_snapshot || "",
                quantity: item.quantity,
                unit_price: typeof item.unit_price === "string" ? parseFloat(item.unit_price) : (item.unit_price || 0),
                discount_amount: item.discount_amount || 0,
                discount_type: (item.discount_type as "percent" | "fixed") || "percent",
                variable_amount: item.variable_amount || 0,
                description: (item as QuoteLineItem & { description?: string }).description || "",
                is_custom: !item.product,
            }));
            setLineItems(mappedLineItems);
        }
    }, [isEditMode, existingQuote]);

    const createMutation = useMutation<Quote | MultiProductQuote, Error, CreateQuoteInput>({
        mutationFn: (data: CreateQuoteInput) =>
            isEditMode && quoteId ? updateQuote(quoteId, data) : createMultiProductQuote(data),
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            if (isEditMode && quoteId) {
                queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
            }
            const createdQuoteId = data.id;
            setSavedQuoteId(createdQuoteId);
            setSavedQuoteDisplayId((data as { quote_id?: string }).quote_id || null);

            if (attachmentFiles.length > 0) {
                try {
                    await uploadQuoteAttachments(createdQuoteId, attachmentFiles);
                } catch (err) {
                    toast.error(`Quote saved but file upload failed: ${(err as Error).message}`);
                }
            }

            if (pendingAction === "send_pt") {
                setShowPTModal(true);
            } else if (pendingAction === "send_customer") {
                try {
                    const linkData = await getApprovalLink(data.id);
                    setQuoteLink(linkData.approval_url);
                } catch (err) {
                    toast.error(`Quote saved but could not generate link: ${(err as Error).message}`);
                    router.push("/admin/quotes");
                }
            } else {
                toast.success(isEditMode ? "Quote updated successfully" : "Quote created successfully");
                router.push("/admin/quotes");
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to save quote");
        },
    });

    const sendToPTMutation = useMutation({
        mutationFn: ({ quoteId, assignedTo }: { quoteId: number; assignedTo: number }) =>
            sendQuoteToPT(quoteId, assignedTo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            toast.success("Quote sent to Production Team successfully");
            setShowPTModal(false);
            router.push("/admin/quotes");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to send quote to PT");
        },
    });

    const addProductToLine = (product: Product): void => {
        setLineItems(prev => [...prev, {
            tempId: Date.now().toString(),
            product_id: product.id,
            product_name: product.name,
            product_sku: product.internal_code || "",
            pricing_mode: product.pricing_mode,
            quantity: 1,
            unit_price: 0,
            discount_amount: 0,
            discount_type: "percent",
            variable_amount: 0,
            description: "",
        }]);
    };

    const addCustomLine = (): void => {
        setLineItems(prev => [...prev, {
            tempId: `custom-${Date.now()}`,
            product_id: 0,
            product_name: "",
            product_sku: "",
            pricing_mode: "custom",
            quantity: 1,
            unit_price: 0,
            discount_amount: 0,
            discount_type: "percent",
            variable_amount: 0,
            description: "",
            is_custom: true,
        }]);
    };

    const removeLineItem = (tempId: string): void => {
        setLineItems(prev => prev.filter(item => item.tempId !== tempId));
    };

    const updateLineItem = (tempId: string, field: keyof LineItem, value: string | number): void => {
        setLineItems(prev => prev.map(item => item.tempId === tempId ? { ...item, [field]: value } : item));
    };

    const calculateLineTotal = (item: LineItem): number => {
        const subtotal = Number(item.quantity) * (Number(item.unit_price) + Number(item.variable_amount));
        const discount = item.discount_type === "percent"
            ? subtotal * (Number(item.discount_amount) / 100)
            : Number(item.discount_amount);
        return subtotal - discount;
    };

    const calculateSubtotal = (): number => lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);

    const calculateDiscountTotal = (): number => lineItems.reduce((sum, item) => {
        const subtotal = Number(item.quantity) * (Number(item.unit_price) + Number(item.variable_amount));
        const discount = item.discount_type === "percent"
            ? subtotal * (Number(item.discount_amount) / 100)
            : Number(item.discount_amount);
        return sum + discount;
    }, 0);

    const calculateTaxTotal = (): number => enableTax ? calculateSubtotal() * ((Number(taxRate) || 0) / 100) : 0;

    const calculateGrandTotal = (): number => {
        return calculateSubtotal() + calculateTaxTotal()
            + (enableShipping ? Number(shippingCharges) : 0)
            + (enableAdjustment ? Number(adjustmentAmount) : 0);
    };

    const handleCustomerChange = (type: "client" | "lead", id: number | null): void => {
        setClientType(type);
        if (type === "client") { setSelectedClientId(id); setSelectedLeadId(null); }
        else { setSelectedLeadId(id); setSelectedClientId(null); }
    };

    const resolveDisplayName = (): string => {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) return (client.client_type === "B2B" && client.company) ? client.company : client.name;
        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return "Valued Customer";
        return (lead.preferred_client_type === "B2B" && lead.company) ? lead.company : lead.name;
    };

    const handleSubmit = async (action: "draft" | "send_pt" | "send_customer"): Promise<void> => {
        if (!selectedClientId && !selectedLeadId) { toast.error("Please select a client or lead"); return; }
        if (lineItems.length === 0) { toast.error("Please add at least one product"); return; }
        const invalidItems = lineItems.filter(item => item.quantity <= 0 || (!item.product_id && !item.is_custom) || (item.is_custom && !item.product_name.trim()));
        if (invalidItems.length > 0) { toast.error("Please complete all line items — custom products need a name, and all items need a valid quantity"); return; }
        if (action === "send_customer" && calculateGrandTotal() === 0) { toast.error("Cannot send a quote with KES 0 total to the client."); return; }

        setIsSubmitting(true);
        setPendingAction(action);
        const quoteData: CreateQuoteInput = {
            client_id: clientType === "client" ? selectedClientId || undefined : undefined,
            lead_id: clientType === "lead" ? selectedLeadId || undefined : undefined,
            reference_number: referenceNumber || undefined,
            project_name: projectName || undefined,
            quote_date: quoteDate,
            valid_until: expiryDate,
            payment_terms: "Prepaid",
            include_vat: enableTax,
            tax_rate: taxRate,
            shipping_charges: enableShipping ? shippingCharges : undefined,
            adjustment_amount: enableAdjustment ? adjustmentAmount : undefined,
            adjustment_reason: adjustmentReason || undefined,
            notes: customerNotes || undefined,
            custom_terms: termsAndConditions || undefined,
            payment_options: paymentOptions || undefined,
            production_cost: productionCost ? Number(productionCost) : undefined,
            line_items: lineItems.map(item => ({
                product_id: item.is_custom ? 0 : item.product_id,
                product_name: item.product_name,
                description: item.description || "",
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: item.discount_amount || undefined,
                discount_type: item.discount_type,
                variable_amount: item.variable_amount || undefined,
            })),
        };
        try {
            await createMutation.mutateAsync(quoteData);
        } catch {
            setPendingAction(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSendToPT = async (memberId: number): Promise<void> => {
        if (savedQuoteId) await sendToPTMutation.mutateAsync({ quoteId: savedQuoteId, assignedTo: memberId });
    };

    const handleCancelAction = (): void => {
        setShowPTModal(false);
        toast.success(isEditMode ? "Quote updated successfully" : "Quote created successfully");
        router.push("/admin/quotes");
    };

    const handleWhatsApp = async (): Promise<void> => {
        const resolvedQuoteId = existingQuote?.id ?? savedQuoteId;
        if (!resolvedQuoteId) { toast.info("Save the quote first to share via WhatsApp."); return; }
        const clientLabel = resolveDisplayName();
        const quoteRef = existingQuote?.quote_id || savedQuoteDisplayId || "";
        const refLabel = quoteRef ? ` *${quoteRef}*` : referenceNumber ? ` (Ref: ${referenceNumber})` : "";
        let approvalUrl = "";
        try {
            const result = await getApprovalLink(resolvedQuoteId);
            approvalUrl = result.approval_url;
        } catch { /* ignore */ }
        const linkLine = approvalUrl ? `\nKindly review and approve your quote here:\n${approvalUrl}\n` : "";
        const msg = `Hello ${clientLabel},\n\nPlease find your quote${refLabel} from Print Duka Ltd.${linkLine}\nThank you!`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    };

    if (isEditMode && quoteLoading) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-gray-50">
                    <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
                        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-gray-200 rounded-md animate-pulse" />
                                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse" />
                                <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (isEditMode && !quoteLoading && !existingQuote) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-600 font-semibold">Quote not found</p>
                        <button onClick={() => router.push("/admin/quotes")} className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 text-sm">
                            Back to Quotes
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50">
                <QuoteTopBar
                    isEditMode={isEditMode}
                    quoteDisplayId={existingQuote?.quote_id}
                    quoteStatus={existingQuote?.status}
                    isWithinEditWindow={isWithinEditWindow}
                    isSaving={createMutation.isPending || isSubmitting}
                    onBack={() => router.back()}
                    onSaveDraft={() => handleSubmit("draft")}
                    onSendToPT={() => handleSubmit("send_pt")}
                    onEmailClient={() => handleSubmit("send_customer")}
                    onWhatsApp={handleWhatsApp}
                    clientName={resolveDisplayName()}
                />

                <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 min-w-0 w-full space-y-4">
                            {isEditMode && existingQuote?.status === "Costed" && (
                                <QuotePTCostBanner
                                    productionCost={typeof existingQuote.production_cost === "string" ? parseFloat(existingQuote.production_cost) : (existingQuote.production_cost ?? 0)}
                                    currentSellingTotal={calculateGrandTotal()}
                                    costedByName={existingQuote.costed_by ? String(existingQuote.costed_by) : undefined}
                                />
                            )}

                            <QuoteHeaderSection
                                clients={clients}
                                leads={leads}
                                clientsLoading={clientsLoading}
                                leadsLoading={leadsLoading}
                                clientsError={clientsError as Error | null}
                                leadsError={leadsError as Error | null}
                                clientType={clientType}
                                selectedClientId={selectedClientId}
                                selectedLeadId={selectedLeadId}
                                onCustomerChange={handleCustomerChange}
                                referenceNumber={referenceNumber}
                                onReferenceChange={setReferenceNumber}
                                projectName={projectName}
                                onProjectNameChange={setProjectName}
                                quoteDate={quoteDate}
                                onQuoteDateChange={setQuoteDate}
                                expiryDate={expiryDate}
                                onExpiryDateChange={setExpiryDate}
                                salesperson={displayUserName}
                                quoteId={existingQuote?.quote_id}
                                productionCost={productionCost}
                                onProductionCostChange={setProductionCost}
                            />

                            <QuoteLineItemsTable
                                lineItems={lineItems}
                                products={products}
                                onAddProduct={addProductToLine}
                                onAddCustomLine={addCustomLine}
                                onRemoveItem={removeLineItem}
                                onUpdateItem={updateLineItem}
                                includeVat={enableTax}
                                taxRate={taxRate}
                            />

                            <QuoteNotesSection
                                customerNotes={customerNotes}
                                termsAndConditions={termsAndConditions}
                                paymentOptions={paymentOptions}
                                onCustomerNotesChange={setCustomerNotes}
                                onTermsChange={setTermsAndConditions}
                                onPaymentOptionsChange={setPaymentOptions}
                            />

                            <QuoteAttachmentsSection
                                files={attachmentFiles}
                                onFilesChange={setAttachmentFiles}
                            />
                        </div>

                        <div className="w-full lg:w-72 flex-shrink-0">
                            <QuoteTotalsSidebar
                                subtotal={calculateSubtotal()}
                                discountTotal={calculateDiscountTotal()}
                                taxTotal={calculateTaxTotal()}
                                grandTotal={calculateGrandTotal()}
                                enableTax={enableTax}
                                taxRate={taxRate}
                                enableShipping={enableShipping}
                                shippingCharges={shippingCharges}
                                enableAdjustment={enableAdjustment}
                                adjustmentAmount={adjustmentAmount}
                                adjustmentReason={adjustmentReason}
                                onEnableTaxChange={setEnableTax}
                                onTaxRateChange={setTaxRate}
                                onEnableShippingChange={setEnableShipping}
                                onShippingChargesChange={setShippingCharges}
                                onEnableAdjustmentChange={setEnableAdjustment}
                                onAdjustmentAmountChange={setAdjustmentAmount}
                                onAdjustmentReasonChange={setAdjustmentReason}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {showPTModal && savedQuoteId && (
                <SelectProductionMemberModal
                    quoteId={String(savedQuoteId)}
                    onClose={handleCancelAction}
                    onConfirm={handleConfirmSendToPT}
                />
            )}

            {quoteLink && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Quote saved &amp; link ready</p>
                                <p className="text-xs text-gray-500">Copy the link and paste it in your Zoho Mail email</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-4">
                            <p className="flex-1 text-xs text-gray-700 break-all leading-relaxed">{quoteLink}</p>
                            <button
                                onClick={() => { navigator.clipboard.writeText(quoteLink); toast.success("Link copied!"); }}
                                className="shrink-0 text-xs font-medium text-brand-blue hover:text-brand-blue/80 px-2 py-1 rounded hover:bg-blue-50"
                            >
                                Copy
                            </button>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => {
                                    const clientLabel = resolveDisplayName();
                                    const quoteRef = existingQuote?.quote_id || savedQuoteDisplayId || "";
                                    const refLabel = quoteRef ? ` *${quoteRef}*` : "";
                                    const msg = `Hello ${clientLabel},\n\nPlease find your quote${refLabel} from Print Duka Ltd.\n\nKindly review and approve your quote here:\n${quoteLink}\n\nThank you!`;
                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                WhatsApp
                            </button>
                            <a
                                href="https://mail.zoho.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue/90 transition-colors"
                            >
                                Open Zoho Mail
                            </a>
                            <button
                                onClick={() => router.push("/admin/quotes")}
                                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
