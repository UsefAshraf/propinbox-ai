import { ConversationList } from "@/components/inbox/conversation-list";

export default function InboxLayout({ children }: LayoutProps<"/inbox">) {
  return (
    <>
      <ConversationList />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </>
  );
}
