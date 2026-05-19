"use client"

import Link from "next/link"
import * as React from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { Notice } from "@/components/shared/notice"
import { Button } from "@/components/ui/button"
import { MetadataChip } from "@/components/ui/metadata-chip"
import { StatusBadge } from "@/components/ui/status-badge"
import { analysesApi } from "@/lib/api/analyses"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"
import type { CvAnalysis } from "@/types/analysis"
import type { Cv } from "@/types/cv"
import {
  AiMetadataRow,
  InlineLoadingStatus,
  ReportList,
  ReportSection,
  ResultPanel,
  WorkflowPanel,
} from "./workflow-panel-primitives"

type AnalysisState = "idle" | "loading" | "success" | "failed"

type CvAnalysisPanelProps = {
  cv: Cv | null
  onAnalysisReady?: (analysis: CvAnalysis) => void
}

const getAnalysisErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return "The CV analysis could not be completed."
  }

  if (error.code === "CV_ANALYSIS_LIMIT_EXCEEDED") {
    return "You have reached the daily limit of 5 CV analyses. Try again tomorrow."
  }

  if (error.code === "CV_NOT_PARSED") {
    return "This CV must be parsed successfully before analysis."
  }

  if (error.code === "AI_PROVIDER_TIMEOUT") {
    return "The AI provider timed out. Retry the analysis in a moment."
  }

  if (
    error.code === "AI_PROVIDER_UNAVAILABLE" ||
    error.code === "AI_RESPONSE_INVALID"
  ) {
    return "The AI analysis service returned an unusable response. Retry is available."
  }

  return error.message
}

const canRetryAnalysisError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return true
  }

  return !["CV_ANALYSIS_LIMIT_EXCEEDED", "CV_NOT_PARSED"].includes(error.code)
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

const getParserTone = (cv: Cv | null) => {
  if (!cv) {
    return "neutral"
  }

  if (cv.parserStatus === "parsed") {
    return "success"
  }

  if (cv.parserStatus === "failed") {
    return "destructive"
  }

  return "info"
}

function SelectedCvSummary({
  analysisState,
  cv,
  hasAnalysis,
}: {
  analysisState: AnalysisState
  cv: Cv | null
  hasAnalysis: boolean
}) {
  const stateLabel =
    analysisState === "loading"
      ? "Generating report"
      : hasAnalysis
        ? "Report ready"
        : cv?.parserStatus === "parsed"
          ? "Ready to analyze"
          : "Blocked"

  return (
    <div className="min-w-0 max-w-full rounded-lg border bg-muted/20 p-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Selected CV
          </p>
          <p className="mt-2 max-w-full break-all text-base font-semibold sm:truncate">
            {cv?.originalFileName ?? "No CV selected"}
          </p>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {cv
              ? `Uploaded ${formatDate(cv.uploadedAt)}`
              : "Choose or upload a parsed CV before analysis."}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:shrink-0">
          <StatusBadge tone={getParserTone(cv)}>
            {cv?.parserStatus ?? "waiting"}
          </StatusBadge>
          <StatusBadge tone={hasAnalysis ? "success" : "neutral"}>
            {stateLabel}
          </StatusBadge>
        </div>
      </div>
      {cv ? (
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          <MetadataChip
            label="Text"
            value={`${cv.parsedTextCharacterCount.toLocaleString()} chars`}
          />
          <MetadataChip
            label="Pages"
            value={cv.parserMetadata?.pageCount ?? "Unknown"}
          />
          <MetadataChip label="Storage" value={cv.uploadStatus} />
        </div>
      ) : null}
    </div>
  )
}

function BlockerNotice({ cv }: { cv: Cv | null }) {
  if (!cv) {
    return (
      <EmptyState
        className="mt-5"
        title="Upload a parsed CV before running analysis"
        message="Analysis needs parsed CV text. Upload a CV and return here when parsing succeeds."
        action={
          <Button asChild>
            <Link href="/dashboard/cvs">Upload CV</Link>
          </Button>
        }
      />
    )
  }

  if (cv.parserStatus === "parsed") {
    return null
  }

  return (
    <Notice
      className="mt-5"
      title="This CV is not ready for analysis"
      tone={cv.parserStatus === "failed" ? "destructive" : "warning"}
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard/cvs">Upload or parse another CV</Link>
        </Button>
      }
    >
      {cv.parserStatus === "failed"
        ? "Parsing failed for the selected CV. Upload a replacement CV before running analysis."
        : "Parsing has not completed for the selected CV. Analysis unlocks after parser status is parsed."}
    </Notice>
  )
}

function AnalysisResultPanel({ analysis }: { analysis: CvAnalysis }) {
  return (
    <ResultPanel eyebrow="Analysis report" title="Summary" status="Completed">
      <ReportSection title="Summary">
        <p className="text-sm leading-7">
          {analysis.structuredAnalysis.summary}
        </p>
      </ReportSection>

      <ReportSection
        title="Recommendations"
        description="Prioritized improvements to make the CV clearer and stronger."
      >
        {analysis.structuredAnalysis.improvements.length > 0 ? (
          <div className="space-y-3">
            {analysis.structuredAnalysis.improvements.map((item) => (
              <div
                key={`${item.priority}-${item.suggestion}`}
                className="rounded-md border bg-muted/20 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="min-w-0 break-words text-sm font-medium">
                    {item.suggestion}
                  </p>
                  <StatusBadge tone="warning">{item.priority}</StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recommendations returned.
          </p>
        )}
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportList
          title="Gaps"
          items={analysis.structuredAnalysis.weaknesses}
          tone="warning"
        />
        <ReportList
          title="Strengths"
          items={analysis.structuredAnalysis.strengths}
          tone="success"
        />
        <ReportList
          title="Skills"
          items={analysis.structuredAnalysis.skills}
          tone="info"
        />
        <ReportList
          title="Experience highlights"
          items={analysis.structuredAnalysis.experienceHighlights}
          tone="success"
        />
        <ReportList
          title="Education"
          items={analysis.structuredAnalysis.education}
        />
      </div>

      <ReportSection
        title="AI metadata"
        description="Generation details are kept last so the report stays focused on the review."
      >
        <div className="space-y-3">
          <AiMetadataRow
            confidence={analysis.structuredAnalysis.confidence}
            metadata={analysis.aiMetadata}
          />
          <p className="text-sm text-muted-foreground">
            Analyzed {formatDate(analysis.analyzedAt)}
          </p>
        </div>
      </ReportSection>
    </ResultPanel>
  )
}

export function CvAnalysisPanel({ cv, onAnalysisReady }: CvAnalysisPanelProps) {
  const { accessToken } = useAuth()
  const [analysisState, setAnalysisState] =
    React.useState<AnalysisState>("idle")
  const [analysis, setAnalysis] = React.useState<CvAnalysis | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [canRetry, setCanRetry] = React.useState(true)

  async function runAnalysis() {
    if (!cv) {
      setErrorMessage("Upload a parsed CV before running analysis.")
      setCanRetry(false)
      setAnalysisState("failed")
      return
    }

    try {
      setErrorMessage(null)
      setCanRetry(true)
      setAnalysisState("loading")
      const result = await analysesApi.analyzeCv(cv.id, accessToken)
      setAnalysis(result.analysis)
      onAnalysisReady?.(result.analysis)
      setAnalysisState("success")
    } catch (error) {
      setErrorMessage(getAnalysisErrorMessage(error))
      setCanRetry(canRetryAnalysisError(error))
      setAnalysisState("failed")
    }
  }

  const canAnalyze = Boolean(cv && cv.parserStatus === "parsed")
  const isLoading = analysisState === "loading"
  const isRetryBlocked = analysisState === "failed" && !canRetry

  return (
    <div className="space-y-6">
      <WorkflowPanel
        title="Analyze selected CV"
        description="Generate a structured review from the parsed CV text."
        actions={
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={runAnalysis}
            disabled={!canAnalyze || isLoading || isRetryBlocked}
          >
            {isLoading
              ? "Analyzing selected CV"
              : analysisState === "failed" && canRetry
                ? "Retry analysis"
                : "Analyze selected CV"}
          </Button>
        }
      >
        <SelectedCvSummary
          cv={cv}
          analysisState={analysisState}
          hasAnalysis={Boolean(analysis)}
        />

        <BlockerNotice cv={cv} />

        {isLoading ? (
          <InlineLoadingStatus
            className="mt-5"
            title="Generating analysis report"
            message="The selected CV stays locked while the request runs."
          />
        ) : null}

        {analysisState === "failed" && errorMessage ? (
          <ErrorState
            className="mt-5"
            title="Analysis failed"
            message={errorMessage}
            action={
              canAnalyze && canRetry ? (
                <Button type="button" variant="outline" onClick={runAnalysis}>
                  Retry analysis
                </Button>
              ) : null
            }
          />
        ) : null}
      </WorkflowPanel>

      {analysis ? <AnalysisResultPanel analysis={analysis} /> : null}
    </div>
  )
}
