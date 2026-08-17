import type { ReactElement } from "react";

export type StatusPillTone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<StatusPillTone, string> = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-500",
};

interface StatusPillProps {
    label: string;
    tone: StatusPillTone;
}

export default function StatusPill({ label, tone }: StatusPillProps): ReactElement {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TONE_CLASSES[tone]}`}>
            {label}
        </span>
    );
}
