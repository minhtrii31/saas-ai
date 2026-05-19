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
import type { Cv } from "@/types/cv"

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

const getParserTone = (cv: Cv) => {
  if (cv.parserStatus === "parsed") {
    return "success"
  }

  if (cv.parserStatus === "failed") {
    return "destructive"
  }

  return "info"
}

type SelectionCardProps = {
  cv: Cv
  isSelected: boolean
  onSelect: (cv: Cv) => void
}

export function SelectionCard({ cv, isSelected, onSelect }: SelectionCardProps) {
  const isParsed = cv.parserStatus === "parsed"

  return (
    <div
      className="min-w-0 max-w-full rounded-lg border bg-muted/20 p-4 data-[selected=true]:border-foreground data-[selected=true]:bg-background"
      data-selected={isSelected}
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0 max-w-full">
          <p className="max-w-full break-all text-sm font-medium sm:truncate">
            {cv.originalFileName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {formatDate(cv.uploadedAt)}
          </p>
        </div>
        <StatusBadge className="max-w-full" tone={getParserTone(cv)}>
          {cv.parserStatus}
        </StatusBadge>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
        <MetadataChip
          label="Text"
          value={`${cv.parsedTextCharacterCount.toLocaleString()} chars`}
        />
        <MetadataChip
          label="Pages"
          value={cv.parserMetadata?.pageCount ?? "Unknown"}
        />
      </div>
      <Button
        type="button"
        variant={isSelected ? "default" : "outline"}
        className="mt-4 w-full min-w-0"
        aria-pressed={isSelected}
        onClick={() => onSelect(cv)}
      >
        {isSelected ? "Selected" : isParsed ? "Use parsed CV" : "Select CV"}
      </Button>
    </div>
  )
}

type CvSelectorProps = {
  cvs: Cv[]
  onSelect: (cv: Cv) => void
  selectedCv: Cv | null
}

export function CvSelector({ cvs, onSelect, selectedCv }: CvSelectorProps) {
  const parsedCount = cvs.filter((cv) => cv.parserStatus === "parsed").length

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <CardTitle>CV context</CardTitle>
          <CardDescription>
            Choose the CV used by this workflow. Analysis requires a parsed CV.
          </CardDescription>
        </div>
        <StatusBadge
          className="max-w-full"
          tone={selectedCv ? "success" : "neutral"}
        >
          {selectedCv ? `${parsedCount} parsed` : "waiting"}
        </StatusBadge>
      </CardHeader>
      <CardContent>
        {cvs.length === 0 ? (
          <EmptyState
            title="No CVs found"
            message="Upload and parse a CV before using this workflow route."
            action={
              <Button asChild>
                <Link href="/dashboard/cvs">Upload CV</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid min-w-0 max-w-full gap-3 lg:grid-cols-3">
            {cvs.slice(0, 6).map((cv) => (
              <SelectionCard
                key={cv.id}
                cv={cv}
                isSelected={selectedCv?.id === cv.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
