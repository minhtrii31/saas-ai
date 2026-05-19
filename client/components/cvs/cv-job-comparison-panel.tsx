"use client"

import * as React from "react"
import Link from "next/link"

import { ErrorState } from "@/components/feedback/error-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { comparisonsApi } from "@/lib/api/comparisons"
import { jobsApi } from "@/lib/api/jobs"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"
import type { CvJobComparison } from "@/types/comparison"
import type { Cv } from "@/types/cv"
import {
  AiMetadataRow,
  FieldGroup,
  InlineLoadingStatus,
  ReportList,
  ReportSection,
  ResultPanel,
  StatusSummary,
  WorkflowPanel,
} from "./workflow-panel-primitives"

const MAX_JOB_DESCRIPTION_CHARACTERS = 10000

type ComparisonState =
  | "idle"
  | "saving-job"
  | "comparing"
  | "success"
  | "failed"

type CvJobComparisonPanelProps = {
  cv: Cv | null
  onComparisonReady?: (comparison: CvJobComparison) => void
}

const getComparisonErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return "The CV and job comparison could not be completed."
  }

  if (error.code === "CV_JOB_COMPARISON_LIMIT_EXCEEDED") {
    return "You have reached the daily comparison limit. Try again tomorrow."
  }

  if (error.code === "JOB_DESCRIPTION_TOO_LONG") {
    return "Job descriptions must be 10,000 characters or fewer."
  }

  if (error.code === "CV_NOT_PARSED") {
    return "This CV must be parsed successfully before comparison."
  }

  if (error.code === "AI_PROVIDER_TIMEOUT") {
    return "The AI provider timed out. Retry the comparison in a moment."
  }

  if (
    error.code === "AI_PROVIDER_UNAVAILABLE" ||
    error.code === "AI_RESPONSE_INVALID"
  ) {
    return "The AI comparison service returned an unusable response. Retry is available."
  }

  return error.message
}

const canRetryComparisonError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return true
  }

  return ![
    "CV_JOB_COMPARISON_LIMIT_EXCEEDED",
    "JOB_DESCRIPTION_TOO_LONG",
    "CV_NOT_PARSED",
  ].includes(error.code)
}

function ComparisonStatusSummary({
  cv,
  descriptionLength,
  isOverLimit,
  lastJobDescriptionId,
  title,
}: {
  cv: Cv | null
  descriptionLength: number
  isOverLimit: boolean
  lastJobDescriptionId: string | null
  title: string
}) {
  const cvReady = cv?.parserStatus === "parsed"
  const descriptionReady = descriptionLength > 0 && !isOverLimit
  const jobTitleReady = title.trim().length > 0
  const comparisonSaved = Boolean(lastJobDescriptionId)

  return (
    <StatusSummary
      ariaLabel="Comparison inputs"
      items={[
        {
          label: "Parsed CV",
          value: cvReady ? "Ready" : "Blocked",
          tone: cvReady ? "success" : "destructive",
          detail: cv
            ? cvReady
              ? cv.originalFileName
              : "Selected CV is not parsed yet."
            : "Select or upload a parsed CV.",
        },
        {
          label: "Job description",
          value: descriptionReady ? "Ready" : "Blocked",
          tone: descriptionReady ? "success" : "destructive",
          detail: isOverLimit
            ? "Description is over the 10,000 character limit."
            : descriptionLength > 0
              ? `${descriptionLength.toLocaleString()} characters ready.`
              : "Paste the job description below.",
        },
        {
          label: "Comparison record",
          value: comparisonSaved
            ? "Complete"
            : jobTitleReady
              ? "Ready"
              : "Blocked",
          tone: comparisonSaved || jobTitleReady ? "success" : "destructive",
          detail: comparisonSaved
            ? "Saved and ready for retry or cover letter context."
            : jobTitleReady
              ? "Will be saved when Compare runs."
              : "Add a job title so the saved record is identifiable.",
        },
      ]}
    />
  )
}

function JobDescriptionInput({
  company,
  descriptionText,
  isLoading,
  isOverLimit,
  onCompanyChange,
  onDescriptionChange,
  onTitleChange,
  title,
}: {
  company: string
  descriptionText: string
  isLoading: boolean
  isOverLimit: boolean
  onCompanyChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  title: string
}) {
  const normalizedLength = descriptionText.trim().length
  const descriptionHelpIds = isOverLimit
    ? "job-description-help job-description-count job-description-error"
    : "job-description-help job-description-count"

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="job-title">Job title</Label>
          <Input
            id="job-title"
            value={title}
            onChange={onTitleChange}
            disabled={isLoading}
            placeholder="Senior Backend Engineer"
            aria-describedby="job-title-help"
          />
          <p id="job-title-help" className="text-xs text-muted-foreground">
            Required for saving the job context before comparison.
          </p>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="job-company">Company</Label>
          <Input
            id="job-company"
            value={company}
            onChange={onCompanyChange}
            disabled={isLoading}
            placeholder="Optional"
          />
        </FieldGroup>
      </div>

      <FieldGroup>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="job-description">Job description</Label>
          <span
            id="job-description-count"
            className={
              isOverLimit
                ? "text-xs font-medium text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {normalizedLength.toLocaleString()} /{" "}
            {MAX_JOB_DESCRIPTION_CHARACTERS.toLocaleString()}
          </span>
        </div>
        <Textarea
          id="job-description"
          aria-describedby={descriptionHelpIds}
          aria-invalid={isOverLimit}
          value={descriptionText}
          onChange={onDescriptionChange}
          disabled={isLoading}
          rows={14}
          className="min-h-[22rem] resize-y text-sm leading-6"
          placeholder="Paste the full job description here"
        />
        <p id="job-description-help" className="text-sm text-muted-foreground">
          This is the main input for the match report. The pasted text is kept
          if comparison fails.
        </p>
        {isOverLimit ? (
          <p id="job-description-error" className="text-sm text-destructive">
            Job descriptions must be 10,000 characters or fewer.
          </p>
        ) : null}
      </FieldGroup>
    </div>
  )
}

function BlockerPanel({
  canCompare,
  cv,
  isOverLimit,
  normalizedDescriptionText,
  normalizedTitle,
}: {
  canCompare: boolean
  cv: Cv | null
  isOverLimit: boolean
  normalizedDescriptionText: string
  normalizedTitle: string
}) {
  if (canCompare) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm" role="status">
        <p className="font-medium">Ready to compare</p>
        <p className="mt-1 text-muted-foreground">
          The selected parsed CV and pasted job description will be used for the
          fit report.
        </p>
      </div>
    )
  }

  const blockers = [
    !cv ? "Select a parsed CV." : null,
    cv && cv.parserStatus !== "parsed"
      ? "Choose a CV with parser status parsed."
      : null,
    !normalizedTitle ? "Add a job title." : null,
    !normalizedDescriptionText ? "Paste a job description." : null,
    isOverLimit ? "Shorten the job description to 10,000 characters." : null,
  ].filter(Boolean)

  return (
    <div className="rounded-lg border bg-muted/20 p-4 text-sm" role="status">
      <p className="font-medium">Compare is blocked</p>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        {blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
    </div>
  )
}

function ComparisonResultPanel({
  comparison,
}: {
  comparison: CvJobComparison
}) {
  return (
    <ResultPanel
      className="mt-6"
      eyebrow="Job match report"
      title="Fit summary"
      status="Completed"
    >
      <ReportSection title="Fit score">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="shrink-0 rounded-lg border bg-muted/20 p-5 text-center lg:w-48">
            <p className="text-xs font-medium text-muted-foreground">
              Fit score
            </p>
            <p className="mt-2 text-5xl font-semibold">
              {comparison.structuredComparison.fitScore}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">out of 100</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mt-2 text-sm leading-6">
              {comparison.structuredComparison.scoreReason}
            </p>
            <div className="mt-4">
              <AiMetadataRow
                confidence={comparison.structuredComparison.confidence}
                metadata={comparison.aiMetadata}
              />
            </div>
          </div>
        </div>
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportList
          title="Strengths"
          items={comparison.structuredComparison.strengths}
          tone="success"
        />
        <ReportList
          title="Gaps"
          items={[
            ...comparison.structuredComparison.missingSkills,
            ...comparison.structuredComparison.missingRequirements,
          ]}
          tone="warning"
          emptyMessage="No major gaps were identified."
        />
        <ReportList
          title="Matched skills"
          items={comparison.structuredComparison.matchedSkills}
          tone="success"
        />
        <ReportList
          title="Weaknesses"
          items={comparison.structuredComparison.weaknesses}
          tone="warning"
        />
      </div>

      <ReportList
        title="Tailoring guidance"
        items={comparison.structuredComparison.applicationAdvice}
        tone="info"
      />
      <ReportList
        title="Evidence notes"
        items={comparison.structuredComparison.evidenceNotes}
        tone="info"
      />

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Next step</p>
          <p className="mt-1 text-muted-foreground">
            Use this comparison context to generate a tailored cover letter.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cover-letters">Generate cover letter</Link>
        </Button>
      </div>
    </ResultPanel>
  )
}

export function CvJobComparisonPanel({
  cv,
  onComparisonReady,
}: CvJobComparisonPanelProps) {
  const { accessToken } = useAuth()
  const [title, setTitle] = React.useState("")
  const [company, setCompany] = React.useState("")
  const [descriptionText, setDescriptionText] = React.useState("")
  const [comparisonState, setComparisonState] =
    React.useState<ComparisonState>("idle")
  const [comparison, setComparison] = React.useState<CvJobComparison | null>(
    null
  )
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [canRetry, setCanRetry] = React.useState(true)
  const [lastJobDescriptionId, setLastJobDescriptionId] = React.useState<
    string | null
  >(null)

  const normalizedTitle = title.trim()
  const normalizedCompany = company.trim()
  const normalizedDescriptionText = descriptionText.trim()
  const isOverLimit =
    normalizedDescriptionText.length > MAX_JOB_DESCRIPTION_CHARACTERS
  const canCompare = Boolean(
    cv &&
    cv.parserStatus === "parsed" &&
    normalizedTitle &&
    normalizedDescriptionText &&
    !isOverLimit
  )
  const isLoading =
    comparisonState === "saving-job" || comparisonState === "comparing"
  const isRetryBlocked = comparisonState === "failed" && !canRetry
  const blockerId = canCompare ? undefined : "job-match-blockers"

  function resetForInputChange() {
    setLastJobDescriptionId(null)
    setComparison(null)
    setErrorMessage(null)
    setCanRetry(true)
    setComparisonState("idle")
  }

  async function runComparison() {
    if (!cv) {
      setErrorMessage("Upload a parsed CV before comparing against a job.")
      setCanRetry(false)
      setComparisonState("failed")
      return
    }

    if (cv.parserStatus !== "parsed") {
      setErrorMessage("This CV must be parsed successfully before comparison.")
      setCanRetry(false)
      setComparisonState("failed")
      return
    }

    if (!normalizedTitle || !normalizedDescriptionText) {
      setErrorMessage("Add a title and pasted job description first.")
      setCanRetry(false)
      setComparisonState("failed")
      return
    }

    if (isOverLimit) {
      setErrorMessage("Job descriptions must be 10,000 characters or fewer.")
      setCanRetry(false)
      setComparisonState("failed")
      return
    }

    try {
      setErrorMessage(null)
      setCanRetry(true)
      setComparisonState(lastJobDescriptionId ? "comparing" : "saving-job")

      const jobDescriptionId =
        lastJobDescriptionId ??
        (
          await jobsApi.create(
            {
              title: normalizedTitle,
              ...(normalizedCompany ? { company: normalizedCompany } : {}),
              descriptionText: normalizedDescriptionText,
            },
            accessToken
          )
        ).job.id

      setLastJobDescriptionId(jobDescriptionId)
      setComparisonState("comparing")
      const result = await comparisonsApi.compare(
        { cvId: cv.id, jobDescriptionId },
        accessToken
      )
      setComparison(result.comparison)
      onComparisonReady?.(result.comparison)
      setComparisonState("success")
    } catch (error) {
      setErrorMessage(getComparisonErrorMessage(error))
      setCanRetry(canRetryComparisonError(error))
      setComparisonState("failed")
    }
  }

  function onDescriptionChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescriptionText(event.target.value)
    resetForInputChange()
  }

  function onTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
    resetForInputChange()
  }

  function onCompanyChange(event: React.ChangeEvent<HTMLInputElement>) {
    setCompany(event.target.value)
    resetForInputChange()
  }

  return (
    <WorkflowPanel
      title="Job comparison"
      description="Use one parsed CV and one pasted job description to generate a fit report."
      actions={
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={runComparison}
          aria-describedby={blockerId}
          disabled={!canCompare || isLoading || isRetryBlocked}
        >
          {isLoading
            ? comparisonState === "saving-job"
              ? "Saving JD"
              : "Comparing"
            : comparisonState === "failed" && canRetry
              ? "Retry"
              : "Compare"}
        </Button>
      }
    >
      <div className="space-y-5">
        <ComparisonStatusSummary
          cv={cv}
          descriptionLength={normalizedDescriptionText.length}
          isOverLimit={isOverLimit}
          lastJobDescriptionId={lastJobDescriptionId}
          title={title}
        />

        <JobDescriptionInput
          company={company}
          descriptionText={descriptionText}
          isLoading={isLoading}
          isOverLimit={isOverLimit}
          onCompanyChange={onCompanyChange}
          onDescriptionChange={onDescriptionChange}
          onTitleChange={onTitleChange}
          title={title}
        />

        <div id={blockerId}>
          <BlockerPanel
            canCompare={canCompare}
            cv={cv}
            isOverLimit={isOverLimit}
            normalizedDescriptionText={normalizedDescriptionText}
            normalizedTitle={normalizedTitle}
          />
        </div>
      </div>

      {isLoading ? (
        <InlineLoadingStatus
          className="mt-5"
          title={
            comparisonState === "saving-job"
              ? "Saving pasted job description"
              : "Generating comparison report"
          }
          message="The comparison will attach to the selected parsed CV."
        />
      ) : null}

      {comparisonState === "failed" && errorMessage ? (
        <ErrorState
          className="mt-5"
          title="Comparison failed"
          message={errorMessage}
          action={
            canCompare && canRetry ? (
              <Button type="button" variant="outline" onClick={runComparison}>
                Retry comparison
              </Button>
            ) : null
          }
        />
      ) : null}

      {comparison ? <ComparisonResultPanel comparison={comparison} /> : null}
    </WorkflowPanel>
  )
}
