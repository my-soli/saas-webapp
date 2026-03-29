import type { SelectionValue } from "@/services/store";
import type { ProductSpecGroup } from "@/types/products";

export interface SpecGroupSelectionState {
    singleOption: number | null;
    multiOptions: number[];
    numericValue: string;
    dimValue: { width: string; height: string };
}

export type GroupStates = Record<number, SpecGroupSelectionState>;

export interface SpecGroupSectionProps {
    group: ProductSpecGroup;
    stepNumber: number;
    state: SpecGroupSelectionState;
    onUpdate: (update: Partial<SpecGroupSelectionState>) => void;
}

export type SelectionsMap = Record<number, SelectionValue>;
