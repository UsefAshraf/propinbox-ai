"use client";

import { useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const STRING_LIMIT = 220;

/** Collapsible, syntax-coloured JSON tree with truncated long strings. */
export function JsonViewer({
  value,
  defaultDepth = 2,
  className,
}: {
  value: unknown;
  defaultDepth?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-x-auto rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 font-mono text-[11.5px] leading-5",
        className,
      )}
    >
      <CopyButton value={value} />
      <JsonNode value={value} depth={0} defaultDepth={defaultDepth} last />
    </div>
  );
}

function CopyButton({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(JSON.stringify(value, null, 2))
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          })
          .catch(() => {});
      }}
      className="absolute top-1.5 right-1.5 rounded p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700"
      aria-label="Copy JSON"
      title="Copy JSON"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

function JsonNode({
  value,
  depth,
  defaultDepth,
  name,
  last,
}: {
  value: unknown;
  depth: number;
  defaultDepth: number;
  name?: string;
  last: boolean;
}) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < defaultDepth);
  const comma = last ? null : <span className="text-zinc-400">,</span>;
  const key =
    name !== undefined ? (
      <>
        <span className="text-sky-800">&quot;{name}&quot;</span>
        <span className="text-zinc-400">: </span>
      </>
    ) : null;

  if (!isObject) {
    return (
      <div className="pl-4 break-words whitespace-pre-wrap">
        {key}
        <Primitive value={value} />
        {comma}
      </div>
    );
  }

  const entries: [string | undefined, unknown][] = isArray
    ? (value as unknown[]).map((v) => [undefined, v])
    : Object.entries(value as Record<string, unknown>);
  const [openBr, closeBr] = isArray ? ["[", "]"] : ["{", "}"];

  if (entries.length === 0) {
    return (
      <div className="pl-4">
        {key}
        <span className="text-zinc-500">
          {openBr}
          {closeBr}
        </span>
        {comma}
      </div>
    );
  }

  return (
    <div className="relative pl-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute top-0.5 left-0 rounded text-zinc-400 hover:text-zinc-700"
        aria-label={open ? "Collapse" : "Expand"}
        aria-expanded={open}
      >
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
      </button>
      <span
        className="cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        {key}
        <span className="text-zinc-500">{openBr}</span>
      </span>
      {open ? (
        <>
          <div className="border-l border-zinc-200 ml-[3px]">
            {entries.map(([k, v], i) => (
              <JsonNode
                key={k ?? i}
                name={k}
                value={v}
                depth={depth + 1}
                defaultDepth={defaultDepth}
                last={i === entries.length - 1}
              />
            ))}
          </div>
          <span className="text-zinc-500">{closeBr}</span>
          {comma}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mx-1 rounded bg-zinc-200/70 px-1 text-[10px] text-zinc-500 hover:bg-zinc-300/70"
          >
            {entries.length} {isArray ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"}
          </button>
          <span className="text-zinc-500">{closeBr}</span>
          {comma}
        </>
      )}
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-400 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-violet-700">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-amber-700">{value}</span>;
  }
  if (typeof value === "string") return <JsonString value={value} />;
  return <span>{String(value)}</span>;
}

function JsonString({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = value.length > STRING_LIMIT;
  const shown = long && !expanded ? `${value.slice(0, STRING_LIMIT)}…` : value;
  return (
    <>
      <span className="text-emerald-700">&quot;{shown}&quot;</span>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-1.5 rounded px-1 font-sans text-[10px] font-medium text-sky-700 hover:bg-sky-100"
        >
          {expanded ? "show less" : `show more (${value.length.toLocaleString()} chars)`}
        </button>
      )}
    </>
  );
}
