import type { Metadata } from "next";
import type { Id } from "@convex/_generated/dataModel";
import { RunDetailView } from "@/components/runs/run-detail-view";

export const metadata: Metadata = {
  title: "Agent run · PropInbox",
};

export default async function RunPage({ params }: PageProps<"/runs/[runId]">) {
  const { runId } = await params;
  return <RunDetailView key={runId} runId={runId as Id<"agentRuns">} />;
}
