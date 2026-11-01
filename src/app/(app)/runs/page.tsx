import type { Metadata } from "next";
import { RunsView } from "@/components/runs/runs-view";

export const metadata: Metadata = {
  title: "Agent runs · PropInbox",
};

export default function RunsPage() {
  return <RunsView />;
}
