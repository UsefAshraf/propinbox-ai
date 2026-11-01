import type { Id } from "@convex/_generated/dataModel";
import { ConversationView } from "@/components/inbox/conversation-view";

export default async function ConversationPage({
  params,
}: PageProps<"/inbox/[conversationId]">) {
  const { conversationId } = await params;
  return (
    <ConversationView
      key={conversationId}
      conversationId={conversationId as Id<"conversations">}
    />
  );
}
