import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionLayoutProps = {
  children: ReactNode
  className?: string
  eyebrow?: string
  title?: string
  description?: string
}

export function SectionLayout({
  children,
  className,
  eyebrow,
  title,
  description,
}: SectionLayoutProps) {
  return (
    <section className={cn("border-b", className)}>
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {(eyebrow || title || description) && (
          <div className="mb-8 max-w-2xl">
            {eyebrow && (
              <p className="text-sm font-medium text-muted-foreground">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-3 font-serif text-2xl font-semibold tracking-wide sm:text-3xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
