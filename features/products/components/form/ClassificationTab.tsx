"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PlusIcon, TagIcon } from "lucide-react";
import type { ProductFormValues } from "@/types/products";
import {
    createProductTag,
    fetchPrintCategories,
    fetchProductCategories,
    fetchProductFamilies,
    fetchProductSubCategories,
    fetchProductTags,
} from "@/services/product-catalog-setup";
import FormField, { inputCls, selectCls } from "./FormField";

interface ClassificationTabProps {
    values: ProductFormValues;
    onValuesChange: (values: ProductFormValues) => void;
}

export default function ClassificationTab({ values, onValuesChange }: ClassificationTabProps): ReactElement {
    const queryClient = useQueryClient();
    const [newTagName, setNewTagName] = useState("");
    const [tagError, setTagError] = useState("");

    const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void => {
        onValuesChange({ ...values, [key]: value });
    };

    const selectedCategoryId = values.primary_category ? Number(values.primary_category) : undefined;

    const { data: printCategories = [] } = useQuery({
        queryKey: ["print-categories"],
        queryFn: fetchPrintCategories,
        staleTime: 0,
    });

    const { data: productCategories = [] } = useQuery({
        queryKey: ["product-categories"],
        queryFn: fetchProductCategories,
        staleTime: 0,
    });

    const { data: subCategories = [] } = useQuery({
        queryKey: ["product-subcategories", selectedCategoryId],
        queryFn: () => fetchProductSubCategories(selectedCategoryId),
        enabled: Boolean(selectedCategoryId),
        staleTime: 0,
    });

    const { data: productFamilies = [] } = useQuery({
        queryKey: ["product-families"],
        queryFn: fetchProductFamilies,
        staleTime: 0,
    });

    const { data: availableTags = [] } = useQuery({
        queryKey: ["product-tags"],
        queryFn: fetchProductTags,
        staleTime: 0,
    });

    const createTagMutation = useMutation({
        mutationFn: createProductTag,
        onSuccess: (tag) => {
            queryClient.invalidateQueries({ queryKey: ["product-tags"] });
            set("tag_ids", [...values.tag_ids, tag.id]);
            setNewTagName("");
            setTagError("");
        },
        onError: async (_err, name) => {
            // Our local `availableTags` list can be behind the server's (stale
            // cache, or the tag was just created by someone else) — the create
            // POST 400s on the backend's uniqueness constraint. Re-fetch and
            // select the match instead of dead-ending with an error.
            const fresh = await queryClient.fetchQuery({ queryKey: ["product-tags"], queryFn: fetchProductTags });
            const existing = fresh.find((t) => t.name.toLowerCase() === name.toLowerCase());
            if (existing) {
                if (!values.tag_ids.includes(existing.id)) set("tag_ids", [...values.tag_ids, existing.id]);
                setNewTagName("");
                setTagError("");
            } else {
                setTagError("Failed to create tag. Please try again.");
            }
        },
    });

    const handleCategoryChange = (categoryId: string): void => {
        onValuesChange({ ...values, primary_category: categoryId, sub_category: "" });
    };

    const toggleTag = (tagId: number): void => {
        const next = values.tag_ids.includes(tagId)
            ? values.tag_ids.filter((id) => id !== tagId)
            : [...values.tag_ids, tagId];
        set("tag_ids", next);
    };

    const handleCreateTag = (): void => {
        const name = newTagName.trim();
        if (!name || createTagMutation.isPending) return;
        const existing = availableTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            if (!values.tag_ids.includes(existing.id)) set("tag_ids", [...values.tag_ids, existing.id]);
            setNewTagName("");
            setTagError("");
            return;
        }
        createTagMutation.mutate(name);
    };

    return (
        <div className="max-w-2xl space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Print Category" hint="Production category used for internal job routing and press assignment">
                    <select className={selectCls} value={values.print_category} onChange={(e) => set("print_category", e.target.value)}>
                        <option value="">Select print category</option>
                        {printCategories.map((pc) => (
                            <option key={pc.id} value={pc.id.toString()}>{pc.name}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Product Type" hint="Physical requires shipping; Digital is delivered electronically; Service has no physical goods">
                    <select className={selectCls} value={values.product_type} onChange={(e) => set("product_type", e.target.value as ProductFormValues["product_type"])}>
                        <option value="physical">Physical Product</option>
                        <option value="digital">Digital Product</option>
                        <option value="service">Service</option>
                    </select>
                </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Category" hint="Primary storefront category that determines where this product appears in the catalog">
                    <select className={selectCls} value={values.primary_category} onChange={(e) => handleCategoryChange(e.target.value)}>
                        <option value="">Select category</option>
                        {productCategories.map((cat) => (
                            <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                        ))}
                    </select>
                </FormField>
                <FormField
                    label="Sub-Category"
                    hint={selectedCategoryId ? "Optional finer grouping within the selected category" : "Select a category first to enable sub-categories"}
                >
                    <select className={selectCls} value={values.sub_category} onChange={(e) => set("sub_category", e.target.value)} disabled={!selectedCategoryId}>
                        <option value="">Select sub-category</option>
                        {subCategories.map((sc) => (
                            <option key={sc.id} value={sc.id.toString()}>{sc.name}</option>
                        ))}
                    </select>
                </FormField>
            </div>

            <FormField label="Product Family" hint="Groups related products together — e.g. all Business Card variants belong to the same family">
                <select className={selectCls} value={values.product_family} onChange={(e) => set("product_family", e.target.value)}>
                    <option value="">Select product family</option>
                    {productFamilies.map((fam) => (
                        <option key={fam.id} value={fam.id.toString()}>{fam.name}</option>
                    ))}
                </select>
            </FormField>

            <FormField label="Tags" hint="Keywords that help customers find and filter this product on the storefront — also used as SEO search terms">
              <div>
                <div className="flex flex-wrap gap-2 pt-1">
                    {availableTags.map((tag) => {
                        const selected = values.tag_ids.includes(tag.id);
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${selected ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {selected ? <CheckIcon className="h-3 w-3" /> : <TagIcon className="h-3 w-3" />}
                                {tag.name}
                            </button>
                        );
                    })}
                    {availableTags.length === 0 && <p className="text-xs text-gray-400">No tags yet — add your first keyword below.</p>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <input
                        type="text"
                        className={`${inputCls} flex-1`}
                        placeholder="Type a keyword and press Enter (e.g. business cards, matte finish)"
                        value={newTagName}
                        onChange={(e) => { setNewTagName(e.target.value); setTagError(""); }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateTag();
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || createTagMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlusIcon className="h-3.5 w-3.5" />
                        {createTagMutation.isPending ? "Adding…" : "Add Tag"}
                    </button>
                </div>
                {tagError && <p className="mt-1.5 text-xs text-red-500">{tagError}</p>}
              </div>
            </FormField>
        </div>
    );
}
