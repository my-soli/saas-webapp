export function formatKES(amount: string | number | undefined | null): string {
    if (amount === undefined || amount === null) return "KES —";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "KES —";
    return `KES ${num.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
