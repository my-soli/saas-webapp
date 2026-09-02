"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
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

export default function CreateQuotePage() {
    return (
        <Suspense fallback={null}>
            <CreateQuotePageContent />
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

function CreateQuotePageContent() {
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
    const [quoteDate, setQuoteDate] = useState(
        new Date().toISOString().split("T")[0]
    );
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
        queryFn: () =>
            fetchClients({
                page: 1,
                pageSize: 100,
                search: "",
                status: "all",
                clientType: "all",
            }),
    });

    const { data: leadsData, isLoading: leadsLoading, error: leadsError } = useQuery({
        queryKey: ["leads-for-quotes", 1, 100, ""],
        queryFn: () =>
            fetchLeads({
                page: 1,
                pageSize: 100,
                search: "",
                status: "Qualified",
                source: "all",
            }),
    });

    const { data: productsData, isLoading: productsLoading } = useQuery({
        queryKey: ["products", 1, 200, ""],
        queryFn: () =>
            fetchProducts({
                page: 1,
                pageSize: 200,
                search: "",
                status: "published",
                pricingMode: "all",
                printCategory: "",
                category: "",
            }),
    });

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const clients = clientsData?.results || [];
    const leads = leadsData?.results || [];
    const products = productsData?.results || [];

    const displayUserName = currentUser
        ? (currentUser.first_name + " " + currentUser.last_name).trim() || currentUser.email
        : "Loading...";

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
                estimated_cost: item.estimated_cost != null ? Number(item.estimated_cost) : undefined,
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

            // Upload any attached files
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
                    router.push("/account-manager/quotes");
                }
            } else {
                toast.success(isEditMode ? "Quote updated successfully" : "Quote created successfully");
                router.push("/account-manager/quotes");
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
            router.push("/account-manager/quotes");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to send quote to PT");
        },
    });


    const addProductToLine = (product: Product): void => {
        const newItem: LineItem = {
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
        };
        setLineItems(prev => [...prev, newItem]);
    };

    const addCustomLine = (): void => {
        const newItem: LineItem = {
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
        };
        setLineItems(prev => [...prev, newItem]);
    };

    const removeLineItem = (tempId: string): void => {
        setLineItems(prev => prev.filter((item) => item.tempId !== tempId));
    };

    const updateLineItem = (
        tempId: string,
        field: keyof LineItem,
        value: string | number
    ): void => {
        setLineItems(prev =>
            prev.map((item) =>
                item.tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const calculateLineTotal = (item: LineItem): number => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const variableAmount = Number(item.variable_amount) || 0;
        const discountAmount = Number(item.discount_amount) || 0;
        const subtotal = quantity * (unitPrice + variableAmount);
        const discount =
            item.discount_type === "percent"
                ? subtotal * (discountAmount / 100)
                : discountAmount;
        return subtotal - discount;
    };

    const calculateSubtotal = (): number => {
        return lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
    };

    const calculateDiscountTotal = (): number => {
        return lineItems.reduce((sum, item) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unit_price) || 0;
            const variableAmount = Number(item.variable_amount) || 0;
            const discountAmount = Number(item.discount_amount) || 0;
            const subtotal = quantity * (unitPrice + variableAmount);
            const discount =
                item.discount_type === "percent"
                    ? subtotal * (discountAmount / 100)
                    : discountAmount;
            return sum + discount;
        }, 0);
    };

    const calculateTaxTotal = (): number => {
        if (!enableTax) return 0;
        return calculateSubtotal() * ((Number(taxRate) || 0) / 100);
    };

    const calculateGrandTotal = (): number => {
        const subtotal = calculateSubtotal();
        const tax = calculateTaxTotal();
        const shipping = enableShipping ? (Number(shippingCharges) || 0) : 0;
        const adjustment = enableAdjustment ? (Number(adjustmentAmount) || 0) : 0;
        return subtotal + tax + shipping + adjustment;
    };

    const calculateEstimatedCostTotal = (): number =>
        lineItems.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0) * (Number(item.quantity) || 0), 0);

    const calculateEstimatedMargin = (): number | null => {
        const grandTotal = calculateGrandTotal();
        const costTotal = calculateEstimatedCostTotal();
        if (grandTotal <= 0 || costTotal <= 0) return null;
        return ((grandTotal - costTotal) / grandTotal) * 100;
    };

    const resolveDisplayName = (): string => {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) return (client.client_type === "B2B" && client.company) ? client.company : client.name;
        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return "Valued Customer";
        return (lead.preferred_client_type === "B2B" && lead.company) ? lead.company : lead.name;
    };

    const handleCustomerChange = (type: "client" | "lead", id: number | null): void => {
        setClientType(type);
        if (type === "client") {
            setSelectedClientId(id);
            setSelectedLeadId(null);
        } else {
            setSelectedLeadId(id);
            setSelectedClientId(null);
        }
    };

    const handleSubmit = async (action: "draft" | "send_pt" | "send_customer"): Promise<void> => {
        if (!selectedClientId && !selectedLeadId) {
            toast.error("Please select a client or lead");
            return;
        }

        if (lineItems.length === 0) {
            toast.error("Please add at least one product");
            return;
        }

        const invalidItems = lineItems.filter(
            (item) => item.quantity <= 0 || (!item.product_id && !item.is_custom) || (item.is_custom && !item.product_name.trim())
        );
        if (invalidItems.length > 0) {
            toast.error("Please complete all line items — custom products need a name, and all items need a valid quantity");
            return;
        }

        if (action === "send_customer" && calculateGrandTotal() === 0) {
            toast.error("Cannot send a quote with KES 0 total to the client. Set the Rate (KES) on each line item first.");
            return;
        }

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
            line_items: lineItems.map((item) => ({
                product_id: item.is_custom ? 0 : item.product_id,
                product_name: item.product_name,
                description: item.description || "",
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: item.discount_amount || undefined,
                discount_type: item.discount_type,
                variable_amount: item.variable_amount || undefined,
                estimated_cost: item.estimated_cost || undefined,
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
        if (savedQuoteId) {
            await sendToPTMutation.mutateAsync({ quoteId: savedQuoteId, assignedTo: memberId });
        }
    };

    const handleCancelAction = (): void => {
        setShowPTModal(false);
        toast.success(isEditMode ? "Quote updated successfully" : "Quote created successfully");
        router.push("/account-manager/quotes");
    };

    const handleWhatsApp = async (): Promise<void> => {
        const resolvedQuoteId = existingQuote?.id ?? savedQuoteId;

        if (!resolvedQuoteId) {
            toast.info("Save the quote first to share via WhatsApp. Click 'Email Client' to save and generate a link.");
            return;
        }

        const clientLabel = resolveDisplayName();
        const quoteRef = existingQuote?.quote_id || savedQuoteDisplayId || "";
        const refLabel = quoteRef ? ` *${quoteRef}*` : referenceNumber ? ` (Ref: ${referenceNumber})` : "";

        let approvalUrl = "";
        try {
            const result = await getApprovalLink(resolvedQuoteId);
            approvalUrl = result.approval_url;
        } catch (err) {
            console.error("Failed to get approval link for WhatsApp:", err);
        }

        const linkLine = approvalUrl
            ? `\nKindly review and approve your quote here:\n${approvalUrl}\n`
            : "";
        const msg = `Hello ${clientLabel},\n\nPlease find your quote${refLabel} from Print Duka Ltd.${linkLine}\nThank you!`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    };

    if (isEditMode && quoteLoading) {
        return (
            <AccountManagerLayout>
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
                                <div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 lg:py-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="h-48 bg-white border border-gray-200 rounded-lg animate-pulse" />
                                <div className="h-64 bg-white border border-gray-200 rounded-lg animate-pulse" />
                                <div className="h-36 bg-white border border-gray-200 rounded-lg animate-pulse" />
                            </div>
                            <div className="w-full lg:w-72 flex-shrink-0">
                                <div className="h-80 bg-white border border-gray-200 rounded-lg animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </AccountManagerLayout>
        );
    }

    if (isEditMode && !quoteLoading && !existingQuote) {
        return (
            <AccountManagerLayout>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-brand-red font-semibold">Quote not found</p>
                        <button
                            onClick={(): void => router.push("/account-manager/quotes")}
                            className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 text-sm"
                        >
                            Back to Quotes
                        </button>
                    </div>
                </div>
            </AccountManagerLayout>
        );
    }

    return (
        <AccountManagerLayout>
            <div className="min-h-screen bg-gray-50">
                <QuoteTopBar
                    isEditMode={isEditMode}
                    quoteDisplayId={existingQuote?.quote_id}
                    quoteStatus={existingQuote?.status}
                    isWithinEditWindow={isWithinEditWindow}
                    isSaving={createMutation.isPending || isSubmitting}
                    onBack={(): void => router.back()}
                    onSaveDraft={(): void => { handleSubmit("draft"); }}
                    onSendToPT={(): void => { handleSubmit("send_pt"); }}
                    onEmailClient={(): void => { handleSubmit("send_customer"); }}
                    onWhatsApp={handleWhatsApp}
                    clientName={(() => {
                        const name = resolveDisplayName();
                        return name === "Valued Customer" ? undefined : name;
                    })()}
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
                                estimatedCostTotal={calculateEstimatedCostTotal()}
                                estimatedMargin={calculateEstimatedMargin()}
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
                                onClick={(): void => {
                                    navigator.clipboard.writeText(quoteLink);
                                    toast.success("Link copied!");
                                }}
                                className="shrink-0 text-xs font-medium text-brand-blue hover:text-brand-blue/80 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                            >
                                Copy
                            </button>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={(): void => {
                                    const clientLabel = resolveDisplayName();
                                    const quoteRef = existingQuote?.quote_id || savedQuoteDisplayId || "";
                                    const refLabel = quoteRef ? ` *${quoteRef}*` : "";
                                    const msg = `Hello ${clientLabel},\n\nPlease find your quote${refLabel} from Print Duka Ltd.\n\nKindly review and approve your quote here:\n${quoteLink}\n\nThank you!`;
                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                WhatsApp
                            </button>
                            <a
                                href="https://mail.zoho.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue/90 transition-colors"
                            >
                                Open Zoho Mail
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                            <button
                                onClick={(): void => router.push("/account-manager/quotes")}
                                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AccountManagerLayout>
    );
}
