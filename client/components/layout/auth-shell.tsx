import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import Image from "next/image"

type AuthShellProps = {
  title: string
  children: ReactNode
  className?: string
}

export function AuthShell({ children, className, title }: AuthShellProps) {
  return (
    <main className="min-h-svh bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-6xl flex-col">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold"
        >
          <Image src={"/logo.png"} alt="Logo" width={64} height={48} />
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <section className={cn("w-full max-w-sm", className)}>
            <div className="mb-6 space-y-2">
              <h1 className="text-center font-serif text-4xl font-bold tracking-wide text-foreground">
                {title}
              </h1>
            </div>
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
