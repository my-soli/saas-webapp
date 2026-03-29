import type { SelectionValue } from "@/services/store";
import type { ProductSpecGroup, SpecOption } from "@/types/products";
import type { GroupStates, SelectionsMap, SpecGroupSelectionState } from "./types";

export const GROUP_TYPE_LABELS: Record<string, string> = {
    quantity_tier: "Quantity",
    single_select_modifier: "Select Option",
    multi_select_modifier: "Select Options",
    numeric_input: "Enter Value",
    dimension_input: "Dimensions",
    multiplier: "Multiplier",
    display_only: "Info",
};

export function buildInitialState(groups: ProductSpecGroup[]): GroupStates {
    const state: GroupStates = {};
    for (const g of groups) {
        const defaultOpt = g.options.find((o: SpecOption) => o.is_default);
        state[g.id] = {
            singleOption: defaultOpt?.id ?? null,
            multiOptions: defaultOpt ? [defaultOpt.id] : [],
            numericValue: "",
            dimValue: { width: "", height: "" },
        };
    }
    return state;
}

export function buildSelectionsPayload(
    groups: ProductSpecGroup[],
    states: GroupStates,
): SelectionsMap {
    const selections: SelectionsMap = {};
    for (const g of groups) {
        const s = states[g.id];
        if (!s) continue;
        switch (g.group_type) {
            case "quantity_tier":
            case "single_select_modifier":
            case "multiplier":
                if (s.singleOption !== null) selections[g.id] = s.singleOption;
                break;
            case "multi_select_modifier":
                if (s.multiOptions.length > 0) selections[g.id] = s.multiOptions;
                break;
            case "numeric_input":
                if (s.numericValue.trim()) selections[g.id] = parseFloat(s.numericValue);
                break;
            case "dimension_input":
                if (s.dimValue.width && s.dimValue.height) {
                    selections[g.id] = {
                        width: parseFloat(s.dimValue.width),
                        height: parseFloat(s.dimValue.height),
                    } as SelectionValue;
                }
                break;
        }
    }
    return selections;
}

export function isGroupVisible(
    group: ProductSpecGroup,
    selections: SelectionsMap,
): boolean {
    if (group.parent_option === null) return true;
    for (const value of Object.values(selections)) {
        if (value === group.parent_option) return true;
        if (Array.isArray(value) && (value as number[]).includes(group.parent_option)) return true;
    }
    return false;
}

export function buildDefaultGroupState(): SpecGroupSelectionState {
    return { singleOption: null, multiOptions: [], numericValue: "", dimValue: { width: "", height: "" } };
}
