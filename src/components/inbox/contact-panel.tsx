import type { ReactNode } from "react";
import { format } from "date-fns";
import {
  AtSign,
  Building2,
  CalendarDays,
  DoorOpen,
  Euro,
  Layers,
  MapPin,
  Phone,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHANNELS,
  ROLE_LABELS,
  formatEur,
  type ConversationDetail,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { StatusBadge } from "./status-badge";
import { ConversationTickets } from "./conversation-tickets";

export function ContactPanel({
  data,
  className,
}: {
  data: ConversationDetail | undefined;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "w-72 shrink-0 flex-col overflow-y-auto border-l bg-white",
        className,
      )}
    >
      {data === undefined ? <PanelSkeleton /> : <PanelBody data={data} />}
    </aside>
  );
}

function PanelBody({ data }: { data: ConversationDetail }) {
  const { conversation, contact } = data;
  const channel = CHANNELS[conversation.channel];

  if (!contact) {
    return (
      <>
        <div className="flex flex-col items-center border-b px-5 pt-6 pb-5 text-center">
          <ContactAvatar name="?" unknown size="lg" />
          <h3 className="mt-3 text-sm font-semibold">Unknown sender</h3>
          <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
            {conversation.handle}
          </p>
          <div className="mt-3">
            <StatusBadge status={conversation.status} />
          </div>
        </div>
        <Section title="Sender">
          <Field icon={channel.icon} label={channel.label}>
            {conversation.handle}
          </Field>
          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            This address isn&apos;t linked to any tenant, owner or vendor in
            your portfolio.
          </p>
        </Section>
        <ConversationTickets conversationId={conversation._id} />
      </>
    );
  }

  const { unit, building } = contact;

  return (
    <>
      <div className="flex flex-col items-center border-b px-5 pt-6 pb-5 text-center">
        <ContactAvatar name={contact.name} size="lg" />
        <h3 className="mt-3 text-sm font-semibold">{contact.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ROLE_LABELS[contact.role]}
          {unit && ` · Unit ${unit.label}`}
        </p>
        <div className="mt-3">
          <StatusBadge status={conversation.status} />
        </div>
      </div>

      <Section title="Contact">
        <Field icon={AtSign} label="Email">
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="hover:underline">
              {contact.email}
            </a>
          ) : null}
        </Field>
        <Field icon={Phone} label="Phone">
          {contact.phone ? (
            <a href={`tel:${contact.phone}`} className="tabular-nums hover:underline">
              {contact.phone}
            </a>
          ) : null}
        </Field>
        {contact.moveInDate && (
          <Field icon={CalendarDays} label="Move-in">
            {format(new Date(contact.moveInDate), "d MMM yyyy")}
          </Field>
        )}
      </Section>

      <ConversationTickets conversationId={conversation._id} />

      {unit && (
        <Section title={`Unit ${unit.label}`}>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Layers} label="Floor" value={unit.floor === 0 ? "Ground" : String(unit.floor)} />
            <Stat icon={DoorOpen} label="Rooms" value={String(unit.rooms)} />
            <Stat icon={Ruler} label="Size" value={`${unit.sizeSqm} m²`} />
            <Stat icon={Euro} label="Rent" value={formatEur(unit.rentCents)} />
          </div>
        </Section>
      )}

      {building && (
        <Section title="Building">
          <Field icon={Building2} label="Name">
            {building.name}
          </Field>
          <Field icon={MapPin} label="Address">
            <span>
              {building.street}
              <br />
              {building.postalCode} {building.city}
            </span>
          </Field>
          {building.yearBuilt && (
            <Field icon={CalendarDays} label="Built">
              {building.yearBuilt}
            </Field>
          )}
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5 border-b px-5 py-4 last:border-b-0">
      <h4 className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5 text-[13px]">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
      <div className="min-w-0">
        <div className="text-[11px] text-zinc-400">{label}</div>
        <div className="break-words text-zinc-800">
          {children ?? <span className="text-zinc-400">—</span>}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-medium tabular-nums text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
