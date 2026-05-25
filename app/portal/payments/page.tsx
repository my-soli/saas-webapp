import { redirect } from "next/navigation";

export default function PaymentsRedirect(): never {
    redirect("/portal/financials");
}
