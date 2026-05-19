"use client"

import * as React from "react"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { Notice } from "@/components/shared/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetadataChip } from "@/components/ui/metadata-chip"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { documentsApi } from "@/lib/api/documents"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"
import type { CvJobComparison } from "@/types/comparison"
import type { Cv } from "@/types/cv"
import type {
  GeneratedDocument,
  GeneratedDocumentSummary,
} from "@/types/document"
import {
  AiMetadataRow,
  FieldGroup,
  InlineLoadingStatus,
  ReportList,
} from "./workflow-panel-primitives"

type CoverLetterState =
  | "idle"
  | "loading-saved"
  | "generating"
  | "saving"
  | "success"
  | "failed"

type CoverLetterPanelProps = {
  cv: Cv | null
  comparison: CvJobComparison | null
}

const formatDateTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown date"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

const getStatusLabel = (state: CoverLetterState, hasDraft: boolean) => {
  if (state === "generating") {
    return "Generating"
  }

  if (state === "saving") {
    return "Saving"
  }

  if (state === "loading-saved") {
    return "Loading"
  }

  if (state === "failed") {
    return "Needs attention"
  }

  if (state === "success" && hasDraft) {
    return "Draft ready"
  }

  return hasDraft ? "Unsaved edits possible" : "Ready to generate"
}

const getCoverLetterErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return "The cover letter request could not be completed."
  }

  if (error.code === "COVER_LETTER_LIMIT_EXCEEDED") {
    return "You have reached the daily cover letter limit. Try again tomorrow."
  }

  if (error.code === "CV_NOT_PARSED") {
    return "This CV must be parsed successfully before cover letter generation."
  }

  if (
    error.code === "JOB_DESCRIPTION_NOT_FOUND" ||
    error.code === "CV_JOB_COMPARISON_NOT_FOUND" ||
    error.code === "COVER_LETTER_CONTEXT_INVALID"
  ) {
    return "The selected job context is no longer available."
  }

  if (error.code === "AI_PROVIDER_TIMEOUT") {
    return "The AI provider timed out. Retry cover letter generation in a moment."
  }

  if (
    error.code === "AI_PROVIDER_UNAVAILABLE" ||
    error.code === "AI_RESPONSE_INVALID"
  ) {
    return "The AI cover letter service returned an unusable response. Retry is available."
  }

  return error.message
}

const canRetryCoverLetterError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return true
  }

  return ![
    "COVER_LETTER_LIMIT_EXCEEDED",
    "CV_NOT_PARSED",
    "JOB_DESCRIPTION_NOT_FOUND",
    "CV_JOB_COMPARISON_NOT_FOUND",
    "COVER_LETTER_CONTEXT_INVALID",
  ].includes(error.code)
}

export function CoverLetterPanel({ cv, comparison }: CoverLetterPanelProps) {
  const { accessToken } = useAuth()
  const [state, setState] = React.useState<CoverLetterState>("idle")
  const [document, setDocument] = React.useState<GeneratedDocument | null>(null)
  const [savedDocuments, setSavedDocuments] = React.useState<
    Array<GeneratedDocument | GeneratedDocumentSummary>
  >([])
  const [draftTitle, setDraftTitle] = React.useState("")
  const [draftBody, setDraftBody] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [canRetry, setCanRetry] = React.useState(true)
  const [copyState, setCopyState] = React.useState<"idle" | "success" | "failed">(
    "idle"
  )

  const canGenerate = Boolean(
    cv && cv.parserStatus === "parsed" && comparison?.jobDescriptionId
  )
  const hasDraftContent = Boolean(draftTitle.trim() || draftBody.trim())
  const hasPersistedDraft = Boolean(document)
  const hasUnsavedChanges = Boolean(
    document &&
      (draftTitle !== document.title || draftBody !== document.body)
  )
  const isBusy =
    state === "loading-saved" || state === "generating" || state === "saving"
  const isRetryBlocked = state === "failed" && !canRetry
  const statusTone = state === "failed" ? "destructive" : hasDraftContent ? "success" : "neutral"

  React.useEffect(() => {
    let isActive = true

    async function loadSavedDocuments() {
      try {
        setState((current) => (current === "idle" ? "loading-saved" : current))
        const result = await documentsApi.list(accessToken)

        if (!isActive) {
          return
        }

        setSavedDocuments(result.documents)
        setState((current) => (current === "loading-saved" ? "idle" : current))
      } catch {
        if (isActive) {
          setState((current) =>
            current === "loading-saved" ? "idle" : current
          )
        }
      }
    }

    loadSavedDocuments()

    return () => {
      isActive = false
    }
  }, [accessToken])

  function setActiveDocument(nextDocument: GeneratedDocument) {
    setDocument(nextDocument)
    setDraftTitle(nextDocument.title)
    setDraftBody(nextDocument.body)
  }

  async function generateCoverLetter() {
    if (!cv || cv.parserStatus !== "parsed") {
      setErrorMessage(
        "Upload a parsed CV before generating a cover letter draft."
      )
      setCanRetry(false)
      setState("failed")
      return
    }

    if (!comparison?.jobDescriptionId) {
      setErrorMessage("Run a job comparison before generating a cover letter.")
      setCanRetry(false)
      setState("failed")
      return
    }

    try {
      setErrorMessage(null)
      setCanRetry(true)
      setState("generating")
      const result = await documentsApi.generateCoverLetter(
        {
          cvId: cv.id,
          jobDescriptionId: comparison.jobDescriptionId,
          comparisonId: comparison.id,
        },
        accessToken
      )
      setActiveDocument(result.document)
      setSavedDocuments((current) => [result.document, ...current])
      setState("success")
    } catch (error) {
      setErrorMessage(getCoverLetterErrorMessage(error))
      setCanRetry(canRetryCoverLetterError(error))
      setState("failed")
    }
  }

  async function loadDocument(documentId: string) {
    try {
      setErrorMessage(null)
      setCanRetry(true)
      setState("loading-saved")
      const result = await documentsApi.get(documentId, accessToken)
      setActiveDocument(result.document)
      setState("success")
    } catch (error) {
      setErrorMessage(getCoverLetterErrorMessage(error))
      setCanRetry(canRetryCoverLetterError(error))
      setState("failed")
    }
  }

  async function saveDraft() {
    if (!document) {
      return
    }

    try {
      setErrorMessage(null)
      setState("saving")
      const result = await documentsApi.update(
        document.id,
        {
          title: draftTitle,
          body: draftBody,
        },
        accessToken
      )
      setActiveDocument(result.document)
      setSavedDocuments((current) =>
        current.map((item) =>
          item.id === result.document.id ? result.document : item
        )
      )
      setState("success")
    } catch (error) {
      setErrorMessage(getCoverLetterErrorMessage(error))
      setCanRetry(false)
      setState("failed")
    }
  }

  async function copyDraft() {
    if (!draftBody.trim()) {
      return
    }

    try {
      await navigator.clipboard.writeText(draftBody)
      setCopyState("success")
    } catch {
      setCopyState("failed")
    }
  }

  return (
    <section className="space-y-5">
      <StatusSummary
        comparison={comparison}
        cv={cv}
        draftCount={savedDocuments.length}
        statusLabel={getStatusLabel(state, hasDraftContent)}
        statusTone={statusTone}
      />

      {!comparison ? (
        <EmptyState
          title="Job match required"
          message="Create or select a job match before generating a cover letter. The draft needs comparison context to stay targeted."
          action={
            <Button asChild>
              <Link href="/dashboard/job-match">Go to job match</Link>
            </Button>
          }
        />
      ) : null}

      {isBusy ? (
        <InlineLoadingStatus
          title={
            state === "saving"
              ? "Saving draft"
              : state === "loading-saved"
                ? "Loading saved drafts"
                : "Generating cover letter draft"
          }
          message="Draft edits stay in the editor while the request runs."
        />
      ) : null}

      {state === "failed" && errorMessage ? (
        <ErrorState
          title={canRetry ? "Request failed" : "Cover letter blocked"}
          message={errorMessage}
          action={
            document && hasUnsavedChanges ? (
              <Button type="button" variant="outline" onClick={saveDraft}>
                Retry save
              </Button>
            ) : canGenerate && canRetry ? (
              <Button
                type="button"
                variant="outline"
                onClick={generateCoverLetter}
              >
                Retry generation
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-medium">Draft editor</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Edit the generated letter directly. Failed generate or save
                  requests do not replace the current draft.
                </p>
              </div>
              <ActionToolbar
                canCopy={Boolean(draftBody.trim())}
                canGenerate={canGenerate}
                canSave={hasPersistedDraft && hasUnsavedChanges}
                copyState={copyState}
                hasDraftContent={hasDraftContent}
                isBusy={isBusy}
                isRetryBlocked={isRetryBlocked}
                onCopy={copyDraft}
                onGenerate={generateCoverLetter}
                onSave={saveDraft}
                state={state}
              />
            </div>
          </div>

          <CoverLetterEditor
            disabled={isBusy}
            draftBody={draftBody}
            draftTitle={draftTitle}
            hasDraftContent={hasDraftContent}
            onDraftBodyChange={(value) => {
              setCopyState("idle")
              setDraftBody(value)
            }}
            onDraftTitleChange={(value) => {
              setCopyState("idle")
              setDraftTitle(value)
            }}
          />
        </div>

        <aside className="space-y-4">
          <ComparisonSummary comparison={comparison} cv={cv} />
          <SavedDraftsPanel
            activeDocumentId={document?.id ?? null}
            documents={savedDocuments}
            isBusy={isBusy}
            onLoadDocument={loadDocument}
          />
          {document ? (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium">Document metadata</p>
              <div className="mt-3">
                <AiMetadataRow metadata={document.aiMetadata} />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Last saved {formatDateTime(document.updatedAt)}
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {document?.notes.length ? (
        <ReportList title="Draft notes" items={document.notes} tone="info" />
      ) : null}
    </section>
  )
}

function StatusSummary({
  comparison,
  cv,
  draftCount,
  statusLabel,
  statusTone,
}: {
  comparison: CvJobComparison | null
  cv: Cv | null
  draftCount: number
  statusLabel: string
  statusTone: React.ComponentProps<typeof StatusBadge>["tone"]
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Draft status
        </p>
        <StatusBadge className="mt-3" tone={statusTone}>
          {statusLabel}
        </StatusBadge>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Source comparison
        </p>
        <p className="mt-2 truncate text-sm font-medium">
          {comparison
            ? `Match ${comparison.id.slice(0, 8)}`
            : "No comparison selected"}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Source CV
        </p>
        <p className="mt-2 truncate text-sm font-medium">
          {cv?.originalFileName ?? "No CV selected"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {draftCount.toLocaleString()} saved drafts available
        </p>
      </div>
    </div>
  )
}

function ActionToolbar({
  canCopy,
  canGenerate,
  canSave,
  copyState,
  hasDraftContent,
  isBusy,
  isRetryBlocked,
  onCopy,
  onGenerate,
  onSave,
  state,
}: {
  canCopy: boolean
  canGenerate: boolean
  canSave: boolean
  copyState: "idle" | "success" | "failed"
  hasDraftContent: boolean
  isBusy: boolean
  isRetryBlocked: boolean
  onCopy: () => void
  onGenerate: () => void
  onSave: () => void
  state: CoverLetterState
}) {
  const primaryIsSave = hasDraftContent

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      {primaryIsSave ? (
        <Button
          type="button"
          size="lg"
          onClick={onSave}
          disabled={!canSave || isBusy}
        >
          {state === "saving" ? "Saving draft" : "Save draft"}
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          onClick={onGenerate}
          disabled={!canGenerate || isBusy || isRetryBlocked}
        >
          {state === "generating" ? "Generating" : "Generate cover letter"}
        </Button>
      )}
      {hasDraftContent ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onGenerate}
          disabled={!canGenerate || isBusy || isRetryBlocked}
        >
          {state === "generating" ? "Regenerating" : "Regenerate"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onCopy}
        disabled={!canCopy || isBusy}
      >
        {copyState === "success"
          ? "Copied"
          : copyState === "failed"
            ? "Copy failed"
            : "Copy"}
      </Button>
    </div>
  )
}

function CoverLetterEditor({
  disabled,
  draftBody,
  draftTitle,
  hasDraftContent,
  onDraftBodyChange,
  onDraftTitleChange,
}: {
  disabled: boolean
  draftBody: string
  draftTitle: string
  hasDraftContent: boolean
  onDraftBodyChange: (value: string) => void
  onDraftTitleChange: (value: string) => void
}) {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      {!hasDraftContent ? (
        <Notice title="No draft yet">
          Generate a cover letter from the selected job match to start editing.
        </Notice>
      ) : null}
      <FieldGroup>
        <Label htmlFor="draft-title">Draft title</Label>
        <Input
          id="draft-title"
          placeholder="Cover letter draft title"
          value={draftTitle}
          onChange={(event) => onDraftTitleChange(event.target.value)}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="draft-body">Cover letter editor</Label>
        <Textarea
          id="draft-body"
          placeholder="Generated cover letter content will appear here."
          value={draftBody}
          onChange={(event) => onDraftBodyChange(event.target.value)}
          disabled={disabled}
          rows={18}
          className="min-h-[28rem] resize-y leading-6"
        />
      </FieldGroup>
    </div>
  )
}

function ComparisonSummary({
  comparison,
  cv,
}: {
  comparison: CvJobComparison | null
  cv: Cv | null
}) {
  if (!comparison) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Comparison summary</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No comparison is selected yet.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Comparison summary</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated {formatDateTime(comparison.comparedAt)}
          </p>
        </div>
        <StatusBadge tone="success">
          {comparison.structuredComparison.fitScore}/100
        </StatusBadge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {comparison.structuredComparison.scoreReason}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <MetadataChip label="Comparison" value={comparison.id.slice(0, 8)} />
        <MetadataChip
          label="Job"
          value={comparison.jobDescriptionId.slice(0, 8)}
        />
        <MetadataChip
          label="CV"
          value={cv?.originalFileName ?? comparison.cvId.slice(0, 8)}
        />
      </div>
    </div>
  )
}

function SavedDraftsPanel({
  activeDocumentId,
  documents,
  isBusy,
  onLoadDocument,
}: {
  activeDocumentId: string | null
  documents: Array<GeneratedDocument | GeneratedDocumentSummary>
  isBusy: boolean
  onLoadDocument: (documentId: string) => void
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Recent drafts</p>
        <MetadataChip label="Showing" value={`${Math.min(documents.length, 6)}`} />
      </div>
      {documents.length > 0 ? (
        <div className="mt-3 space-y-2">
          {documents.slice(0, 6).map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={activeDocumentId === item.id ? "secondary" : "outline"}
              className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
              onClick={() => onLoadDocument(item.id)}
              disabled={isBusy}
            >
              <span className="line-clamp-2">{item.title}</span>
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Generated drafts will appear here after they are created.
        </p>
      )}
    </div>
  )
}
