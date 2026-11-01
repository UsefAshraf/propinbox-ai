"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConversationError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <MessageSquareWarning className="size-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Couldn&apos;t load this conversation</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          The link may be invalid, or the backend returned an error.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => retry()}>
          Try again
        </Button>
        <Button size="sm" render={<Link href="/inbox" />} nativeButton={false}>
          Back to inbox
        </Button>
      </div>
    </div>
  );
}
