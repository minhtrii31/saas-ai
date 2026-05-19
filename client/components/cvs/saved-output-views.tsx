"use client"

import Link from "next/link"
import * as React from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Notice } from "@/components/shared/notice"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MetadataChip } from "@/components/ui/metadata-chip"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { analysesApi } from "@/lib/api/analyses"
import { comparisonsApi } from "@/lib/api/comparisons"
import { cvsApi } from "@/lib/api/cvs"
import { documentsApi } from "@/lib/api/documents"
import { jobsApi } from "@/lib/api/jobs"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"
import { cn } from "@/lib/utils"
import type { CvAnalysisSummary } from "@/types/analysis"
import type { CvJobComparisonSummary } from "@/types/comparison"
import type { Cv, CvWithParsedText } from "@/types/cv"
import type { GeneratedDocumentSummary } from "@/types/document"
import type { JobDescriptionSummary } from "@/types/job"
import { ReportSection, StatusSummary } from "./workflow-panel-primitives"

type LoadState = "idle" | "loading" | "success" | "failed"
type SectionKey = "cvs" | "analyses" | "jobs" | "comparisons" | "documents"
type SavedOutputType = "CV" | "Analysis" | "Job" | "Comparison" | "Document"

type DetailState = {
  content: React.ReactNode
  description: string
  error?: string
  metadata?: Array<{ label: string; value: React.ReactNode }>
  recordKey?: string
  state: LoadState
  title: string
  type?: SavedOutputType
}

type SavedOutputRecord = {
  date: string
  id: string
  key: string
  onDelete: () => Promise<void>
  onPreview: () => Promise<void>
  preview: string
  source?: string
  status?: string
  title: string
  type: SavedOutputType
}

const initialSectionState: Record<SectionKey, LoadState> = {
  cvs: "idle",
  analyses: "idle",
  jobs: "idle",
  comparisons: "idle",
  documents: "idle",
}

const sectionLabels: Record<SectionKey, string> = {
  cvs: "CVs",
  analyses: "Analyses",
  jobs: "Jobs",
  comparisons: "Comparisons",
  documents: "Documents",
}

const idleDetail: DetailState = {
  state: "idle",
  title: "Select a record",
  description:
    "Preview saved output content and metadata without leaving the list.",
  content: null,
}

const getErrorMessage = (error: unknown) => {
  return error instanceof ApiError
    ? error.message
    : "This saved view could not be loaded."
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

const formatFileSize = (bytes: number) => {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const truncate = (value: string, length = 150) => {
  const normalized = value.replace(/\s+/g, " ").trim()

  if (normalized.length <= length) {
    return normalized
  }

  return `${normalized.slice(0, length - 1).trim()}...`
}

function RecordsLoading() {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <p className="text-sm font-medium">Loading saved outputs</p>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MetadataRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">
        {value}
      </dd>
    </div>
  )
}

function ActionToolbar({
  errors,
  totals,
}: {
  errors: Partial<Record<SectionKey, string>>
  totals: Record<SectionKey, number>
}) {
  const failedSections = (Object.keys(errors) as SectionKey[]).filter(
    (key) => errors[key]
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(totals) as SectionKey[]).map((key) => (
          <MetadataChip
            key={key}
            label={sectionLabels[key]}
            value={totals[key]}
          />
        ))}
      </div>
      {failedSections.length > 0 ? (
        <Notice tone="destructive" title="Some records could not be loaded">
          {failedSections
            .map((key) => `${sectionLabels[key]}: ${errors[key]}`)
            .join(" ")}
        </Notice>
      ) : null}
    </div>
  )
}

function SavedItemRow({
  isDeleting,
  isSelected,
  onDeleteClick,
  onPreview,
  record,
}: {
  isDeleting: boolean
  isSelected: boolean
  onDeleteClick: () => void
  onPreview: () => void
  record: SavedOutputRecord
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-colors",
        isSelected ? "border-foreground bg-muted/35" : "hover:bg-muted/30"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          aria-pressed={isSelected}
          className="min-w-0 flex-1 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={onPreview}
          disabled={isDeleting}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">{record.type}</StatusBadge>
            {record.status ? (
              <StatusBadge tone="neutral">{record.status}</StatusBadge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {formatDate(record.date)}
            </span>
          </div>
          <h3 className="mt-3 truncate text-sm font-medium text-foreground">
            {record.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {record.preview}
          </p>
          {record.source ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Source: {record.source}
            </p>
          ) : null}
        </button>
        <div className="flex shrink-0 gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={isDeleting}
          >
            Preview
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDeleteClick}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </article>
  )
}

function SavedOutputList({
  deletingIds,
  onDeleteClick,
  records,
  selectedKey,
}: {
  deletingIds: Set<string>
  onDeleteClick: (record: SavedOutputRecord) => void
  records: SavedOutputRecord[]
  selectedKey?: string
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        title="No saved outputs yet"
        message="Upload a CV, run an analysis, compare a job, or generate a cover letter to create history records."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/cvs">Upload CV</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/analysis">Run analysis</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/job-match">Job match</Link>
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <SavedItemRow
          key={record.key}
          record={record}
          isDeleting={deletingIds.has(record.id)}
          isSelected={selectedKey === record.key}
          onPreview={() => void record.onPreview()}
          onDeleteClick={() => onDeleteClick(record)}
        />
      ))}
    </div>
  )
}

function SavedOutputDetail({ detail }: { detail: DetailState }) {
  return (
    <Card className="h-fit xl:sticky xl:top-24">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {detail.type ? (
            <StatusBadge tone="neutral">{detail.type}</StatusBadge>
          ) : null}
          <CardTitle className="min-w-0 flex-1 truncate">
            {detail.title}
          </CardTitle>
        </div>
        <CardDescription>{detail.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {detail.state === "idle" ? (
          <EmptyState
            title="No record selected"
            message="Choose a row to load the saved output preview and metadata."
          />
        ) : null}
        {detail.state === "loading" ? <RecordsLoading /> : null}
        {detail.state === "failed" ? (
          <ErrorState
            title="Preview unavailable"
            message={detail.error ?? "The selected item could not be loaded."}
          />
        ) : null}
        {detail.state === "success" ? (
          <div className="space-y-5">
            <div>{detail.content}</div>
            {detail.metadata?.length ? (
              <dl className="rounded-lg border border-border px-4">
                {detail.metadata.map((item) => (
                  <MetadataRow
                    key={item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function SavedOutputViews() {
  const { accessToken } = useAuth()
  const [sectionStates, setSectionStates] =
    React.useState<Record<SectionKey, LoadState>>(initialSectionState)
  const [sectionErrors, setSectionErrors] = React.useState<
    Partial<Record<SectionKey, string>>
  >({})
  const [cvs, setCvs] = React.useState<Cv[]>([])
  const [analyses, setAnalyses] = React.useState<CvAnalysisSummary[]>([])
  const [jobs, setJobs] = React.useState<JobDescriptionSummary[]>([])
  const [comparisons, setComparisons] = React.useState<
    CvJobComparisonSummary[]
  >([])
  const [documents, setDocuments] = React.useState<GeneratedDocumentSummary[]>(
    []
  )
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] =
    React.useState<SavedOutputRecord | null>(null)
  const [deleteMessage, setDeleteMessage] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<DetailState>(idleDetail)

  const setSectionState = React.useCallback(
    (key: SectionKey, state: LoadState) => {
      setSectionStates((current) => ({ ...current, [key]: state }))
    },
    []
  )

  const setSectionError = React.useCallback(
    (key: SectionKey, message?: string) => {
      setSectionErrors((current) => ({ ...current, [key]: message }))
    },
    []
  )

  const clearDetailIfSelected = React.useCallback((recordKey: string) => {
    setDetail((current) =>
      current.recordKey === recordKey ? idleDetail : current
    )
  }, [])

  const deleteCv = React.useCallback(
    async (cvId: string, recordKey: string) => {
      setDeletingIds((current) => new Set([...current, cvId]))
      try {
        await cvsApi.delete(cvId, accessToken)
        setCvs((current) => current.filter((item) => item.id !== cvId))
        clearDetailIfSelected(recordKey)
        setDeleteMessage("CV record deleted.")
      } catch (error) {
        setDeleteMessage(getErrorMessage(error))
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current)
          next.delete(cvId)
          return next
        })
      }
    },
    [accessToken, clearDetailIfSelected]
  )

  const deleteAnalysis = React.useCallback(
    async (analysisId: string, recordKey: string) => {
      setDeletingIds((current) => new Set([...current, analysisId]))
      try {
        await analysesApi.delete(analysisId, accessToken)
        setAnalyses((current) =>
          current.filter((item) => item.id !== analysisId)
        )
        clearDetailIfSelected(recordKey)
        setDeleteMessage("Analysis record deleted.")
      } catch (error) {
        setDeleteMessage(getErrorMessage(error))
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current)
          next.delete(analysisId)
          return next
        })
      }
    },
    [accessToken, clearDetailIfSelected]
  )

  const deleteJob = React.useCallback(
    async (jobId: string, recordKey: string) => {
      setDeletingIds((current) => new Set([...current, jobId]))
      try {
        await jobsApi.delete(jobId, accessToken)
        setJobs((current) => current.filter((item) => item.id !== jobId))
        clearDetailIfSelected(recordKey)
        setDeleteMessage("Job description record deleted.")
      } catch (error) {
        setDeleteMessage(getErrorMessage(error))
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current)
          next.delete(jobId)
          return next
        })
      }
    },
    [accessToken, clearDetailIfSelected]
  )

  const deleteComparison = React.useCallback(
    async (comparisonId: string, recordKey: string) => {
      setDeletingIds((current) => new Set([...current, comparisonId]))
      try {
        await comparisonsApi.delete(comparisonId, accessToken)
        setComparisons((current) =>
          current.filter((item) => item.id !== comparisonId)
        )
        clearDetailIfSelected(recordKey)
        setDeleteMessage("Comparison record deleted.")
      } catch (error) {
        setDeleteMessage(getErrorMessage(error))
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current)
          next.delete(comparisonId)
          return next
        })
      }
    },
    [accessToken, clearDetailIfSelected]
  )

  const deleteDocument = React.useCallback(
    async (documentId: string, recordKey: string) => {
      setDeletingIds((current) => new Set([...current, documentId]))
      try {
        await documentsApi.delete(documentId, accessToken)
        setDocuments((current) =>
          current.filter((item) => item.id !== documentId)
        )
        clearDetailIfSelected(recordKey)
        setDeleteMessage("Document record deleted.")
      } catch (error) {
        setDeleteMessage(getErrorMessage(error))
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current)
          next.delete(documentId)
          return next
        })
      }
    },
    [accessToken, clearDetailIfSelected]
  )

  React.useEffect(() => {
    let isActive = true

    async function loadSection<T>(
      key: SectionKey,
      request: () => Promise<T>,
      assign: (value: T) => void
    ) {
      setSectionState(key, "loading")
      setSectionError(key)

      try {
        const value = await request()

        if (!isActive) {
          return
        }

        assign(value)
        setSectionState(key, "success")
      } catch (error) {
        if (!isActive) {
          return
        }

        setSectionError(key, getErrorMessage(error))
        setSectionState(key, "failed")
      }
    }

    void Promise.all([
      loadSection(
        "cvs",
        () => cvsApi.list(accessToken),
        (result) => setCvs(result.cvs)
      ),
      loadSection(
        "analyses",
        () => analysesApi.list(accessToken),
        (result) => setAnalyses(result.analyses)
      ),
      loadSection(
        "jobs",
        () => jobsApi.list(accessToken),
        (result) => setJobs(result.jobs)
      ),
      loadSection(
        "comparisons",
        () => comparisonsApi.list(accessToken),
        (result) => setComparisons(result.comparisons)
      ),
      loadSection(
        "documents",
        () => documentsApi.list(accessToken),
        (result) => setDocuments(result.documents)
      ),
    ])

    return () => {
      isActive = false
    }
  }, [accessToken, setSectionError, setSectionState])

  const openCv = React.useCallback(
    async (cv: Cv, recordKey: string) => {
      setDetail({
        state: "loading",
        recordKey,
        title: cv.originalFileName,
        type: "CV",
        description: "Loading uploaded CV metadata.",
        content: null,
      })

      try {
        const result = await cvsApi.get(cv.id, accessToken)
        const item: CvWithParsedText = result.cv

        setDetail({
          state: "success",
          recordKey,
          type: "CV",
          title: item.originalFileName,
          description: item.parsedText
            ? truncate(item.parsedText, 220)
            : "Uploaded CV metadata and parser status.",
          content: item.parsedText ? (
            <div className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-sm leading-6 whitespace-pre-wrap">
              {item.parsedText}
            </div>
          ) : (
            <Notice>Parsed text is not available for this CV.</Notice>
          ),
          metadata: [
            { label: "Parser status", value: item.parserStatus },
            {
              label: "Parsed text",
              value: `${item.parsedTextCharacterCount.toLocaleString()} chars`,
            },
            { label: "File size", value: formatFileSize(item.fileSize) },
            { label: "Uploaded", value: formatDate(item.uploadedAt) },
          ],
        })
      } catch (error) {
        setDetail({
          state: "failed",
          recordKey,
          type: "CV",
          title: cv.originalFileName,
          description: "Uploaded CV metadata could not be loaded.",
          content: null,
          error: getErrorMessage(error),
        })
      }
    },
    [accessToken]
  )

  const openAnalysis = React.useCallback(
    async (analysis: CvAnalysisSummary, recordKey: string) => {
      setDetail({
        state: "loading",
        recordKey,
        type: "Analysis",
        title: "CV analysis",
        description: "Loading analysis report.",
        content: null,
      })

      try {
        const result = await analysesApi.get(analysis.id, accessToken)
        const item = result.analysis

        setDetail({
          state: "success",
          recordKey,
          type: "Analysis",
          title: "CV analysis",
          description: item.structuredAnalysis.summary,
          content: (
            <div className="space-y-4">
              <StatusSummary
                ariaLabel="Analysis preview metrics"
                items={[
                  {
                    label: "Skills",
                    value: item.structuredAnalysis.skills.length,
                    tone: "info",
                  },
                  {
                    label: "Strengths",
                    value: item.structuredAnalysis.strengths.length,
                    tone: "success",
                  },
                  {
                    label: "Improvements",
                    value: item.structuredAnalysis.improvements.length,
                    tone: "warning",
                  },
                ]}
              />
              <ReportSection title="Summary">
                <p className="text-sm leading-6">
                  {item.structuredAnalysis.summary}
                </p>
              </ReportSection>
            </div>
          ),
          metadata: [
            { label: "Analyzed", value: formatDate(item.analyzedAt) },
            { label: "Confidence", value: item.structuredAnalysis.confidence },
            { label: "Source CV", value: item.cvId },
            { label: "Prompt", value: item.aiMetadata.promptVersion },
          ],
        })
      } catch (error) {
        setDetail({
          state: "failed",
          recordKey,
          type: "Analysis",
          title: "CV analysis",
          description: "Analysis report could not be loaded.",
          content: null,
          error: getErrorMessage(error),
        })
      }
    },
    [accessToken]
  )

  const openJob = React.useCallback(
    async (job: JobDescriptionSummary, recordKey: string) => {
      setDetail({
        state: "loading",
        recordKey,
        type: "Job",
        title: job.title,
        description: "Loading saved job description.",
        content: null,
      })

      try {
        const result = await jobsApi.get(job.id, accessToken)
        const item = result.job

        setDetail({
          state: "success",
          recordKey,
          type: "Job",
          title: item.title,
          description: item.company ?? "Saved pasted job description.",
          content: (
            <div className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-sm leading-6 whitespace-pre-wrap">
              {item.descriptionText}
            </div>
          ),
          metadata: [
            { label: "Company", value: item.company ?? "Not provided" },
            { label: "Input type", value: item.inputType },
            {
              label: "Description",
              value: `${item.descriptionTextCharacterCount.toLocaleString()} chars`,
            },
            { label: "Created", value: formatDate(item.createdAt) },
          ],
        })
      } catch (error) {
        setDetail({
          state: "failed",
          recordKey,
          type: "Job",
          title: job.title,
          description: "Job description could not be loaded.",
          content: null,
          error: getErrorMessage(error),
        })
      }
    },
    [accessToken]
  )

  const openComparison = React.useCallback(
    async (comparison: CvJobComparisonSummary, recordKey: string) => {
      setDetail({
        state: "loading",
        recordKey,
        type: "Comparison",
        title: "Job comparison",
        description: "Loading comparison report.",
        content: null,
      })

      try {
        const result = await comparisonsApi.get(comparison.id, accessToken)
        const item = result.comparison

        setDetail({
          state: "success",
          recordKey,
          type: "Comparison",
          title: "Job comparison",
          description: item.structuredComparison.scoreReason,
          content: (
            <div className="space-y-4">
              <StatusSummary
                ariaLabel="Comparison preview metrics"
                items={[
                  {
                    label: "Fit score",
                    value: `${item.structuredComparison.fitScore}/100`,
                    tone: "info",
                  },
                  {
                    label: "Matched skills",
                    value: item.structuredComparison.matchedSkills.length,
                    tone: "success",
                  },
                  {
                    label: "Missing skills",
                    value: item.structuredComparison.missingSkills.length,
                    tone: "warning",
                  },
                ]}
              />
              <ReportSection title="Score reason">
                <p className="text-sm leading-6">
                  {item.structuredComparison.scoreReason}
                </p>
              </ReportSection>
            </div>
          ),
          metadata: [
            { label: "Compared", value: formatDate(item.comparedAt) },
            {
              label: "Confidence",
              value: item.structuredComparison.confidence,
            },
            { label: "Source CV", value: item.cvId },
            { label: "Source job", value: item.jobDescriptionId },
            { label: "Prompt", value: item.aiMetadata.promptVersion },
          ],
        })
      } catch (error) {
        setDetail({
          state: "failed",
          recordKey,
          type: "Comparison",
          title: "Job comparison",
          description: "Comparison report could not be loaded.",
          content: null,
          error: getErrorMessage(error),
        })
      }
    },
    [accessToken]
  )

  const openDocument = React.useCallback(
    async (document: GeneratedDocumentSummary, recordKey: string) => {
      setDetail({
        state: "loading",
        recordKey,
        type: "Document",
        title: document.title,
        description: "Loading generated document.",
        content: null,
      })

      try {
        const result = await documentsApi.get(document.id, accessToken)
        const item = result.document

        setDetail({
          state: "success",
          recordKey,
          type: "Document",
          title: item.title,
          description: "Generated cover letter draft.",
          content: (
            <div className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-sm leading-6 whitespace-pre-wrap">
              {item.body}
            </div>
          ),
          metadata: [
            { label: "Status", value: item.status },
            { label: "Generated", value: formatDate(item.generatedAt) },
            { label: "Source CV", value: item.cvId ?? "Not linked" },
            {
              label: "Source comparison",
              value: item.comparisonId ?? "Not linked",
            },
            { label: "Prompt", value: item.aiMetadata.promptVersion },
          ],
        })
      } catch (error) {
        setDetail({
          state: "failed",
          recordKey,
          type: "Document",
          title: document.title,
          description: "Generated document could not be loaded.",
          content: null,
          error: getErrorMessage(error),
        })
      }
    },
    [accessToken]
  )

  const records = React.useMemo<SavedOutputRecord[]>(() => {
    const cvRecords = cvs.map((item) => {
      const key = `cv:${item.id}`
      return {
        id: item.id,
        key,
        type: "CV" as const,
        title: item.originalFileName,
        date: item.uploadedAt,
        status: item.parserStatus,
        preview: item.hasParsedText
          ? `${item.parsedTextCharacterCount.toLocaleString()} parsed characters`
          : "Uploaded CV waiting for parsed text.",
        source: `${formatFileSize(item.fileSize)} file`,
        onPreview: () => openCv(item, key),
        onDelete: () => deleteCv(item.id, key),
      }
    })

    const analysisRecords = analyses.map((item) => {
      const key = `analysis:${item.id}`
      return {
        id: item.id,
        key,
        type: "Analysis" as const,
        title: "CV analysis",
        date: item.analyzedAt,
        status: item.analysisStatus,
        preview: truncate(item.summary),
        source: `CV ${item.cvId}`,
        onPreview: () => openAnalysis(item, key),
        onDelete: () => deleteAnalysis(item.id, key),
      }
    })

    const jobRecords = jobs.map((item) => {
      const key = `job:${item.id}`
      return {
        id: item.id,
        key,
        type: "Job" as const,
        title: item.title,
        date: item.createdAt,
        status: item.inputType,
        preview: `${item.descriptionTextCharacterCount.toLocaleString()} character job description`,
        source: item.company
          ? `Company: ${item.company}`
          : "Pasted job description",
        onPreview: () => openJob(item, key),
        onDelete: () => deleteJob(item.id, key),
      }
    })

    const comparisonRecords = comparisons.map((item) => {
      const key = `comparison:${item.id}`
      return {
        id: item.id,
        key,
        type: "Comparison" as const,
        title: `${item.fitScore}/100 fit score`,
        date: item.comparedAt,
        status: item.comparisonStatus,
        preview: truncate(item.scoreReason),
        source: `CV ${item.cvId} / Job ${item.jobDescriptionId}`,
        onPreview: () => openComparison(item, key),
        onDelete: () => deleteComparison(item.id, key),
      }
    })

    const documentRecords = documents.map((item) => {
      const key = `document:${item.id}`
      return {
        id: item.id,
        key,
        type: "Document" as const,
        title: item.title,
        date: item.generatedAt,
        status: item.status,
        preview: `${item.bodyCharacterCount.toLocaleString()} character ${item.type.replace("_", " ")}`,
        source: item.comparisonId
          ? `Comparison ${item.comparisonId}`
          : item.cvId
            ? `CV ${item.cvId}`
            : "Generated document",
        onPreview: () => openDocument(item, key),
        onDelete: () => deleteDocument(item.id, key),
      }
    })

    return [
      ...cvRecords,
      ...analysisRecords,
      ...jobRecords,
      ...comparisonRecords,
      ...documentRecords,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [
    analyses,
    comparisons,
    cvs,
    deleteAnalysis,
    deleteComparison,
    deleteCv,
    deleteDocument,
    deleteJob,
    documents,
    jobs,
    openAnalysis,
    openComparison,
    openCv,
    openDocument,
    openJob,
  ])

  const totals = {
    cvs: cvs.length,
    analyses: analyses.length,
    jobs: jobs.length,
    comparisons: comparisons.length,
    documents: documents.length,
  }
  const isLoading =
    records.length === 0 &&
    Object.values(sectionStates).some((state) => state === "loading")

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    await deleteTarget.onDelete()
    setDeleteTarget(null)
  }, [deleteTarget])

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Records workspace</CardTitle>
            <CardDescription>
              Browse saved outputs across uploads, analysis, job matching, and
              generated documents.
            </CardDescription>
          </div>
          <ActionToolbar errors={sectionErrors} totals={totals} />
        </CardHeader>
      </Card>

      {deleteMessage ? <Notice tone="default">{deleteMessage}</Notice> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <Card>
          <CardHeader>
            <CardTitle>Saved outputs</CardTitle>
            <CardDescription>
              Select a row to preview its content and metadata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <RecordsLoading />
            ) : (
              <SavedOutputList
                records={records}
                deletingIds={deletingIds}
                selectedKey={detail.recordKey}
                onDeleteClick={setDeleteTarget}
              />
            )}
          </CardContent>
        </Card>

        <SavedOutputDetail detail={detail} />
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        title="Delete saved output?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}" from ${deleteTarget.type.toLowerCase()} history. This cannot be undone.`
            : "Delete this saved output. This cannot be undone."
        }
        isBusy={deleteTarget ? deletingIds.has(deleteTarget.id) : false}
        onConfirm={confirmDelete}
      />
    </section>
  )
}
