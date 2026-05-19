"use client"

import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MetadataChip } from "@/components/ui/metadata-chip"
import { StatusBadge } from "@/components/ui/status-badge"
import type { CvJobComparisonSummary } from "@/types/comparison"

type ComparisonSelectorProps = {
  comparisons: CvJobComparisonSummary[]
  onSelect: (comparisonId: string) => void
  selectedComparisonId: string | null
}

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown date"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function ComparisonSelector({
  comparisons,
  onSelect,
  selectedComparisonId,
}: ComparisonSelectorProps) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <CardTitle>Comparison context</CardTitle>
          <CardDescription>
            Choose the saved job match that should power this cover letter.
          </CardDescription>
        </div>
        <StatusBadge
          className="max-w-full"
          tone={selectedComparisonId ? "success" : "neutral"}
        >
          {selectedComparisonId ? "selected" : "blocked"}
        </StatusBadge>
      </CardHeader>
      <CardContent>
        {comparisons.length === 0 ? (
          <EmptyState
            title="No job match available"
            message="Generate a job match first. The cover letter uses that comparison to tailor the draft."
            action={
              <Button asChild>
                <Link href="/dashboard/job-match">Go to job match</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid min-w-0 max-w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
            {comparisons.slice(0, 6).map((comparison) => {
              const isSelected = selectedComparisonId === comparison.id

              return (
                <button
                  key={comparison.id}
                  type="button"
                  className="min-w-0 max-w-full rounded-lg border bg-background p-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-60 data-[selected=true]:border-foreground data-[selected=true]:bg-muted/40"
                  data-selected={isSelected}
                  onClick={() => onSelect(comparison.id)}
                >
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <div className="min-w-0 max-w-full">
                      <p className="truncate text-sm font-medium">
                        Job match from {formatDate(comparison.comparedAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Comparison {comparison.id.slice(0, 8)}
                      </p>
                    </div>
                    <StatusBadge
                      className="max-w-full"
                      tone={isSelected ? "success" : "neutral"}
                    >
                      {isSelected ? "selected" : "use"}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                    {comparison.scoreReason}
                  </p>
                  <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                    <MetadataChip label="Fit" value={`${comparison.fitScore}/100`} />
                    <MetadataChip
                      label="Confidence"
                      value={comparison.confidence}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
