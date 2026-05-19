import { ArrowRight02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { PublicPageShell } from "@/components/layout/public-shell"
import { SectionLayout } from "@/components/layout/section-layout"
import { HeroWorkflowPreview } from "@/components/public/hero-workflow-preview"
import { WorkflowStepList } from "@/components/public/workflow-step-list"
import { ReportPreviewPanel } from "@/components/reports/report-preview-panel"
import { Button } from "@/components/ui/button"

const trustItems = [
  {
    title: "Supported upload",
    description: "Start with PDF or DOCX CV files before analysis begins.",
  },
  {
    title: "Clear workflow state",
    description: "Parser, analysis, job match, and draft states stay separate.",
  },
  {
    title: "Structured AI output",
    description:
      "Reports are organized as product fields, not raw transcripts.",
  },
]

export default function Page() {
  return (
    <PublicPageShell>
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[6fr_minmax(22rem,4fr)] lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground">
              AI-assisted CV workspace
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-wide text-balance sm:text-5xl lg:text-6xl">
              Smart CV Analysis & Instant Cover Letter Generation.
            </h1>
            <p className="mt-5 max-w-2xl font-serif text-base tracking-wide text-muted-foreground sm:text-lg">
              Match your skills against any job description and build tailored
              applications from one dashboard.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5 text-sm">
                <Link href="/register">
                  Create account
                  <HugeiconsIcon
                    icon={ArrowRight02Icon}
                    size={16}
                    strokeWidth={2}
                  />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-5 text-sm"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 text-sm sm:grid-cols-3">
              {trustItems.map((item) => (
                <div key={item.title} className="border-t pt-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <HeroWorkflowPreview />
        </div>
      </section>

      <SectionLayout
        eyebrow="Workflow"
        title="A readable path from source CV to application draft."
        description="The public page mirrors the product flow users see after account creation, so there is no hidden marketing promise outside the workspace."
      >
        <WorkflowStepList />
      </SectionLayout>

      <SectionLayout
        className="bg-muted/30"
        eyebrow="Output preview"
        title="Report-style results before generation."
        description="Users see analysis and job-fit signals before the cover letter is drafted, keeping the workflow understandable and reviewable."
      >
        <div className="">
          <ReportPreviewPanel />
        </div>
      </SectionLayout>

      <SectionLayout>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-semibold tracking-wide">
              Start with an account, then upload your CV.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Registration opens the protected workflow for CV upload, analysis,
              job matching, and cover letter generation.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5 text-sm">
              <Link href="/register">Create account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-5 text-sm"
            >
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </SectionLayout>
    </PublicPageShell>
  )
}
