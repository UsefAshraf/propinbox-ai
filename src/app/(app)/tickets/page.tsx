import type { Metadata } from "next";
import { TicketsView } from "@/components/tickets/tickets-view";

export const metadata: Metadata = {
  title: "Tickets · PropInbox",
};

export default function TicketsPage() {
  return <TicketsView />;
}
