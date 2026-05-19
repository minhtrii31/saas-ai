import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import Image from "next/image"

type PublicPageShellProps = {
  children: ReactNode
}

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader />
      <main>{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>SaaS AI CV. CV analysis, job matching, and cover letters.</p>
          <nav className="flex gap-4" aria-label="Footer">
            <Link className="hover:text-foreground" href="/login">
              Log in
            </Link>
            <Link className="hover:text-foreground" href="/register">
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold"
        >
          <Image src={"/logo.png"} alt="Logo" width={64} height={48} />
        </Link>

        <nav className="flex items-center gap-2" aria-label="Public">
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="hidden sm:inline-flex"
          >
            <Link href="/login"> Log in</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
