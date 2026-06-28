"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Send } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { strings } from "@/lib/i18n/strings";

interface ShareButtonProps {
  /** Pre-composed prediction text shared alongside the link. */
  text: string;
  /** Relative path the share links to (e.g. "/race/123"). */
  path: string;
}

export function ShareButton({ text, path }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const absoluteUrl = () => `${window.location.origin}${path}`;

  async function copyLink() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(absoluteUrl());
      toast(strings.share.copied, "success");
    } catch {
      toast(strings.share.copyFailed, "error");
    }
  }

  function shareTelegram() {
    setOpen(false);
    const tg = `https://t.me/share/url?url=${encodeURIComponent(
      absoluteUrl(),
    )}&text=${encodeURIComponent(text)}`;
    // Programmatic anchor click — reliable and not blocked like window.open.
    const a = document.createElement("a");
    a.href = tg;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={strings.share.title}
        aria-expanded={open}
        className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary"
      >
        <Send className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-md">
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
          >
            <Link2 className="size-4 shrink-0" />
            {strings.share.copyLink}
          </button>
          <button
            type="button"
            onClick={shareTelegram}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
          >
            <Send className="size-4 shrink-0" />
            {strings.share.telegram}
          </button>
        </div>
      )}
    </div>
  );
}
