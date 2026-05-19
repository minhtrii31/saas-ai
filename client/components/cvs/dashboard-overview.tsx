import {
  ChartAnalysisIcon,
  Clock01Icon,
  FileUploadIcon,
  MailEdit01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const dashboardRoutes = [
  {
    title: "CVs",
    description: "Upload a PDF or DOCX CV and review parser status.",
    href: "/dashboard/cvs",
    icon: FileUploadIcon,
  },
  {
    title: "Analysis",
    description: "Generate a normalized analysis report for a parsed CV.",
    href: "/dashboard/analysis",
    icon: ChartAnalysisIcon,
  },
  {
    title: "Job match",
    description: "Compare a selected CV against a pasted job description.",
    href: "/dashboard/job-match",
    icon: Target02Icon,
  },
  {
    title: "Cover letters",
    description: "Generate and edit drafts from saved comparison context.",
    href: "/dashboard/cover-letters",
    icon: MailEdit01Icon,
  },
  {
    title: "History",
    description: "Review saved CVs, reports, matches, and documents.",
    href: "/dashboard/history",
    icon: Clock01Icon,
  },
]

export function DashboardOverview() {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      aria-label="Dashboard routes"
    >
      {dashboardRoutes.map((route, index) => (
        <Link key={route.href} href={route.href} className="group block">
          <Card className="h-full transition-colors group-hover:border-primary/30 group-hover:bg-accent/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  /{index + 1}
                </span>
              </div>
              <CardTitle className="font-serif text-xl font-semibold tracking-wide">
                {route.title}
              </CardTitle>
              <CardDescription>{route.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </section>
  )
}
