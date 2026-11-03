import type { ReactNode } from "react";

export function ProsePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl uppercase leading-tight sm:text-3xl">{title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        {children}
      </div>
    </article>
  );
}
