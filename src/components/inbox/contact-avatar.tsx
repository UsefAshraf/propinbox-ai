import { UserRound } from "lucide-react";
import { avatarTone, initials } from "@/lib/inbox";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
} as const;

export function ContactAvatar({
  name,
  unknown,
  size = "md",
  className,
}: {
  name: string;
  unknown?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight",
        SIZES[size],
        unknown ? "bg-zinc-100 text-zinc-400" : avatarTone(name),
        className,
      )}
    >
      {unknown ? <UserRound className="size-[45%]" /> : initials(name)}
    </div>
  );
}
