import { AppSidebar } from "@/components/app-sidebar";
import { ConversationList } from "@/components/inbox/conversation-list";

export default function InboxLayout({ children }: LayoutProps<"/inbox">) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <AppSidebar />
      <ConversationList />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
