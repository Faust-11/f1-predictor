import { strings } from "@/lib/i18n/strings";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>{strings.footer.disclaimer}</p>
        <p className="shrink-0">
          © {year} · {strings.app.title}
        </p>
      </div>
    </footer>
  );
}
