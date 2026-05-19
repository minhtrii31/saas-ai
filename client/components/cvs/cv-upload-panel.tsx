"use client"

import {
  ArrowRight01Icon,
  Cancel01Icon,
  FileUploadIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import * as React from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { ErrorState } from "@/components/feedback/error-state"
import { Notice } from "@/components/shared/notice"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MetadataChip } from "@/components/ui/metadata-chip"
import { StatusBadge } from "@/components/ui/status-badge"
import { cvsApi } from "@/lib/api/cvs"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"
import { cn } from "@/lib/utils"
import type { Cv } from "@/types/cv"
import { InlineLoadingStatus } from "./workflow-panel-primitives"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const PDF_MIME_TYPE = "application/pdf"
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

type UploadState =
  | "idle"
  | "validating"
  | "uploading"
  | "parsing"
  | "success"
  | "failed"

type LoadState = "idle" | "loading" | "success" | "failed"

const formatFileSize = (bytes: number): string => {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
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

const getClientValidationMessage = (file: File): string | null => {
  const extension = file.name.toLowerCase().split(".").pop()
  const isAllowedType =
    (file.type === PDF_MIME_TYPE && extension === "pdf") ||
    (file.type === DOCX_MIME_TYPE && extension === "docx")

  if (!isAllowedType) {
    return "Upload a PDF or DOCX file."
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "CV files must be 5MB or smaller."
  }

  return null
}

const getStateLabel = (state: UploadState): string => {
  if (state === "validating") {
    return "Validating file"
  }

  if (state === "uploading") {
    return "Uploading CV"
  }

  if (state === "parsing") {
    return "Checking parser"
  }

  if (state === "success") {
    return "Upload complete"
  }

  if (state === "failed") {
    return "Needs attention"
  }

  return "Ready to upload"
}

const getUploadTone = (state: UploadState) => {
  if (state === "failed") {
    return "destructive"
  }

  if (state === "success") {
    return "success"
  }

  if (state === "validating" || state === "uploading" || state === "parsing") {
    return "info"
  }

  return "neutral"
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

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "The CV workflow context could not be loaded."
}

function WorkflowStepper({
  hasParsedCv,
  isBusy,
}: {
  hasParsedCv: boolean
  isBusy: boolean
}) {
  const workflowSteps = [
    {
      title: "Upload",
      href: "/dashboard/cvs",
      status: hasParsedCv ? "complete" : isBusy ? "running" : "current",
    },
    {
      title: "Analyze",
      href: "/dashboard/analysis",
      status: hasParsedCv ? "ready" : "blocked",
    },
    {
      title: "Match",
      href: "/dashboard/job-match",
      status: hasParsedCv ? "ready" : "blocked",
    },
    {
      title: "Draft",
      href: "/dashboard/cover-letters",
      status: "later",
    },
  ] as const

  return (
    <nav
      aria-label="CV workflow"
      className="max-w-full min-w-0 rounded-lg border bg-muted/10 px-2 py-1.5"
    >
      <ol className="grid min-w-0 gap-1 sm:grid-cols-4 sm:divide-x-2">
        {workflowSteps.map((step, index) => {
          return (
            <li key={step.href} className="min-w-0">
              <Link
                href={step.href}
                className="flex min-h-10 max-w-full min-w-0 items-center gap-2 rounded-md px-4 py-1.5 font-serif tracking-wide transition-colors hover:bg-muted/50 sm:justify-center"
              >
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {index + 1}.
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{step.title}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function UploadDropzone({
  describedBy,
  disabled,
  errorMessage,
  fileInputRef,
  onFileChange,
  onFileDrop,
}: {
  describedBy: string
  disabled: boolean
  errorMessage: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFileDrop: (file: File) => void
}) {
  const [isDragging, setIsDragging] = React.useState(false)

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]

    if (file && !disabled) {
      onFileDrop(file)
    }
  }

  return (
    <div
      className={cn(
        "relative max-w-full min-w-0 rounded-lg border border-dashed bg-background p-6 transition-colors",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        isDragging ? "border-primary bg-muted/40" : "border-border",
        errorMessage ? "border-destructive/60" : null
      )}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) {
          setIsDragging(true)
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Label htmlFor="cv-file" className="text-base font-medium">
            CV file
          </Label>
          <p
            id={describedBy}
            className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
          >
            Drop a PDF or DOCX file here, or choose one from your device. The
            maximum file size is 5MB.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          <HugeiconsIcon
            icon={FileUploadIcon}
            size={16}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Choose file
        </Button>
      </div>
      <input
        ref={fileInputRef}
        id="cv-file"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="absolute top-3 left-3 z-10 size-px overflow-hidden border-0 p-0 opacity-[0.01]"
        tabIndex={-1}
        aria-describedby={describedBy}
        aria-invalid={Boolean(errorMessage)}
        onChange={onFileChange}
        disabled={disabled}
      />
    </div>
  )
}

function SelectedFileSummary({
  errorMessage,
  file,
  onClear,
}: {
  errorMessage: string | null
  file: File | null
  onClear: () => void
}) {
  if (!file) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm font-medium">No file selected</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose a CV to enable the upload action.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background p-4 text-sm">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-full min-w-0">
          <p className="max-w-full font-medium break-all sm:truncate">
            {file.name}
          </p>
          <p className="mt-1 truncate text-muted-foreground">
            {file.type || "Unknown file type"}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          <MetadataChip label="Size" value={formatFileSize(file.size)} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onClear}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={14}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Remove
          </Button>
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-3 text-sm font-medium break-words text-destructive">
          {errorMessage}
        </p>
      ) : (
        <p className="mt-3 text-sm break-words text-muted-foreground">
          This file passed client-side type and size checks.
        </p>
      )}
    </div>
  )
}

function CVStatusSummary({ cv }: { cv: Cv | null }) {
  if (!cv) {
    return (
      <EmptyState
        title="Parser status is waiting"
        message="Upload a CV to see storage, parser, page, and text signals."
      />
    )
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="max-w-full min-w-0">
        <p className="max-w-full font-medium break-all sm:truncate">
          {cv.originalFileName}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Uploaded {formatDate(cv.uploadedAt)}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">Storage</span>
          <StatusBadge tone="success">{cv.uploadStatus}</StatusBadge>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">Parser</span>
          <StatusBadge tone={getParserTone(cv)}>{cv.parserStatus}</StatusBadge>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">Text</span>
          <span className="font-medium">
            {cv.parsedTextCharacterCount.toLocaleString()} chars
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">Pages</span>
          <span className="font-medium">
            {cv.parserMetadata?.pageCount ?? "Unknown"}
          </span>
        </div>
      </div>

      {cv.parserError ? (
        <ErrorState title="Parser error" message={cv.parserError} />
      ) : null}
    </div>
  )
}

function RecentCvList({
  cvs,
  loadState,
  message,
}: {
  cvs: Cv[]
  loadState: LoadState
  message: string | null
}) {
  if (loadState === "failed") {
    return (
      <ErrorState
        title="Recent CVs could not load"
        message={message ?? "Try refreshing the page."}
      />
    )
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-2" role="status" aria-live="polite">
        <p className="text-sm font-medium">Loading recent CVs</p>
        <div className="h-14 rounded-md border bg-muted/30" />
        <div className="h-14 rounded-md border bg-muted/20" />
      </div>
    )
  }

  if (cvs.length === 0) {
    return (
      <EmptyState
        title="No recent CVs"
        message="Uploaded CVs will appear here after the API stores them."
      />
    )
  }

  return (
    <div className="max-w-full min-w-0 divide-y rounded-lg border">
      {cvs.slice(0, 4).map((cv) => (
        <div
          key={cv.id}
          className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="max-w-full min-w-0">
            <p className="max-w-full text-sm font-medium break-all sm:truncate">
              {cv.originalFileName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(cv.uploadedAt)}
            </p>
          </div>
          <StatusBadge className="max-w-full" tone={getParserTone(cv)}>
            {cv.parserStatus}
          </StatusBadge>
        </div>
      ))}
    </div>
  )
}

function WorkflowPanel({ hasParsedCv }: { hasParsedCv: boolean }) {
  return (
    <div className="space-y-3">
      {hasParsedCv ? (
        <Notice
          tone="success"
          title="Ready for analysis"
          action={
            <Button asChild className="w-full">
              <Link href="/dashboard/analysis">
                Analyze CV
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={2}
                  data-icon="inline-end"
                />
              </Link>
            </Button>
          }
        >
          The latest CV is parsed and can be used in downstream workflows.
        </Notice>
      ) : (
        <Notice title="Next action is locked">
          Analysis and job matching become available after the parser returns a
          parsed CV.
        </Notice>
      )}
      <Button
        asChild={hasParsedCv}
        type={hasParsedCv ? undefined : "button"}
        className="w-full"
        variant="outline"
        disabled={!hasParsedCv}
      >
        {hasParsedCv ? (
          <Link href="/dashboard/job-match">Match a job</Link>
        ) : (
          "Match a job"
        )}
      </Button>
    </div>
  )
}

export function CvUploadPanel() {
  const { accessToken } = useAuth()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const fileDescriptionId = React.useId()
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [uploadState, setUploadState] = React.useState<UploadState>("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [uploadedCv, setUploadedCv] = React.useState<Cv | null>(null)
  const [recentCvs, setRecentCvs] = React.useState<Cv[]>([])
  const [recentLoadState, setRecentLoadState] =
    React.useState<LoadState>("idle")
  const [recentErrorMessage, setRecentErrorMessage] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    let isMounted = true

    async function loadRecentCvs() {
      try {
        setRecentLoadState("loading")
        setRecentErrorMessage(null)
        const result = await cvsApi.list(accessToken)

        if (isMounted) {
          setRecentCvs(result.cvs)
          setUploadedCv(result.cvs[0] ?? null)
          setRecentLoadState("success")
        }
      } catch (error) {
        if (isMounted) {
          setRecentErrorMessage(getErrorMessage(error))
          setRecentLoadState("failed")
        }
      }
    }

    loadRecentCvs()

    return () => {
      isMounted = false
    }
  }, [accessToken])

  function setFile(file: File | null) {
    setSelectedFile(file)
    setUploadedCv(null)
    setErrorMessage(file ? getClientValidationMessage(file) : null)
    setUploadState("idle")
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
  }

  function onClearSelectedFile() {
    setFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      setErrorMessage("Choose a PDF or DOCX CV before uploading.")
      setUploadState("failed")
      return
    }

    const validationMessage = getClientValidationMessage(selectedFile)

    if (validationMessage) {
      setErrorMessage(validationMessage)
      setUploadState("failed")
      return
    }

    try {
      setErrorMessage(null)
      setUploadState("validating")
      await new Promise((resolve) => window.setTimeout(resolve, 120))
      setUploadState("uploading")
      const result = await cvsApi.upload(selectedFile, accessToken)
      setUploadState("parsing")
      setUploadedCv(result.cv)
      setRecentCvs((current) => [
        result.cv,
        ...current.filter((cv) => cv.id !== result.cv.id),
      ])
      setRecentLoadState("success")
      setUploadState("success")
    } catch (error) {
      setUploadState("failed")
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "The CV upload could not be completed."
      )
    }
  }

  const isBusy =
    uploadState === "validating" ||
    uploadState === "uploading" ||
    uploadState === "parsing"
  const hasParsedCv = uploadedCv?.parserStatus === "parsed"
  const canUpload = Boolean(selectedFile) && !isBusy && !errorMessage

  return (
    <div className="space-y-6">
      <WorkflowStepper hasParsedCv={hasParsedCv} isBusy={isBusy} />

      <section className="grid max-w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden border-primary/20 shadow-sm">
          <form onSubmit={onUpload}>
            <CardHeader className="gap-4 border-b bg-muted/10 sm:flex sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-full min-w-0 space-y-1.5">
                <CardTitle>Upload source CV</CardTitle>
                <CardDescription>
                  Select one CV for parsing. A parsed upload unlocks analysis,
                  job matching, and cover letter drafting.
                </CardDescription>
              </div>
              <StatusBadge
                className="max-w-full"
                tone={getUploadTone(uploadState)}
              >
                {getStateLabel(uploadState)}
              </StatusBadge>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <UploadDropzone
                describedBy={fileDescriptionId}
                disabled={isBusy}
                errorMessage={errorMessage}
                fileInputRef={fileInputRef}
                onFileChange={onFileChange}
                onFileDrop={setFile}
              />

              <SelectedFileSummary
                errorMessage={errorMessage}
                file={selectedFile}
                onClear={onClearSelectedFile}
              />

              {isBusy ? (
                <InlineLoadingStatus
                  title={getStateLabel(uploadState)}
                  message="Upload and parser status will update when the API returns."
                />
              ) : null}

              {uploadState === "success" && uploadedCv ? (
                <Notice
                  tone={hasParsedCv ? "success" : "info"}
                  title="Upload complete"
                  action={
                    hasParsedCv ? (
                      <Button asChild variant="outline">
                        <Link href="/dashboard/analysis">Continue</Link>
                      </Button>
                    ) : null
                  }
                >
                  Parser status is {uploadedCv.parserStatus}. Upload completion
                  does not assume parsing is finished.
                </Notice>
              ) : null}

              {errorMessage && uploadState === "failed" ? (
                <ErrorState title="Upload failed" message={errorMessage} />
              ) : null}

              <div className="flex min-w-0 flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-sm leading-6 break-words text-muted-foreground">
                  Accepted formats: PDF or DOCX, 5MB maximum.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-40"
                  disabled={!canUpload}
                >
                  <HugeiconsIcon
                    icon={FileUploadIcon}
                    size={16}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  {isBusy ? getStateLabel(uploadState) : "Upload CV"}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        <aside className="max-w-full min-w-0 space-y-3">
          <Card size="sm" className="bg-muted/10 shadow-none">
            <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between xl:block">
              <div className="max-w-full min-w-0">
                <CardTitle>Parser status</CardTitle>
                <CardDescription>
                  Latest storage and parser result.
                </CardDescription>
              </div>
              <StatusBadge
                className="max-w-full"
                tone={getParserTone(uploadedCv)}
              >
                {uploadedCv?.parserStatus ?? "waiting"}
              </StatusBadge>
            </CardHeader>
            <CardContent>
              <CVStatusSummary cv={uploadedCv} />
            </CardContent>
          </Card>

          <Card size="sm" className="bg-muted/10 shadow-none">
            <CardHeader>
              <CardTitle>Recent CVs</CardTitle>
              <CardDescription>
                Saved uploads available to workflow routes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentCvList
                cvs={recentCvs}
                loadState={recentLoadState}
                message={recentErrorMessage}
              />
            </CardContent>
          </Card>

          <Card size="sm" className="bg-muted/10 shadow-none">
            <CardHeader>
              <CardTitle>Next action</CardTitle>
              <CardDescription>
                Continue when the latest CV is parsed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowPanel hasParsedCv={hasParsedCv} />
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
