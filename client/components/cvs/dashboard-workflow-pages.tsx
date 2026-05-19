"use client"

import * as React from "react"

import { ErrorState } from "@/components/feedback/error-state"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { comparisonsApi } from "@/lib/api/comparisons"
import { cvsApi } from "@/lib/api/cvs"
import { ApiError } from "@/lib/api/types"
import { useAuth } from "@/lib/auth/auth-context"
import type {
  CvJobComparison,
  CvJobComparisonSummary,
} from "@/types/comparison"
import type { Cv } from "@/types/cv"
import { CoverLetterPanel } from "./cover-letter-panel"
import { CvAnalysisPanel } from "./cv-analysis-panel"
import { CvJobComparisonPanel } from "./cv-job-comparison-panel"
import { ComparisonSelector } from "./selectors/comparison-selector"
import { CvSelector } from "./selectors/cv-selector"

type LoadState = "loading" | "success" | "failed"

const getErrorMessage = (error: unknown) => {
  return error instanceof ApiError
    ? error.message
    : "The workflow context could not be loaded."
}

function ContextLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}

function useCvSelection() {
  const { accessToken } = useAuth()
  const [state, setState] = React.useState<LoadState>("loading")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [cvs, setCvs] = React.useState<Cv[]>([])
  const [selectedCv, setSelectedCv] = React.useState<Cv | null>(null)

  React.useEffect(() => {
    let isActive = true

    async function loadCvs() {
      try {
        setState("loading")
        setErrorMessage(null)
        const result = await cvsApi.list(accessToken)

        if (!isActive) {
          return
        }

        setCvs(result.cvs)
        setSelectedCv(
          result.cvs.find((cv) => cv.parserStatus === "parsed") ??
            result.cvs[0] ??
            null
        )
        setState("success")
      } catch (error) {
        if (!isActive) {
          return
        }

        setErrorMessage(getErrorMessage(error))
        setState("failed")
      }
    }

    loadCvs()

    return () => {
      isActive = false
    }
  }, [accessToken])

  return {
    cvs,
    errorMessage,
    selectedCv,
    setSelectedCv,
    state,
  }
}

export function CvAnalysisWorkflow() {
  const { cvs, errorMessage, selectedCv, setSelectedCv, state } =
    useCvSelection()

  if (state === "loading") {
    return <ContextLoading />
  }

  if (state === "failed") {
    return (
      <ErrorState
        title="CV context unavailable"
        message={errorMessage ?? "CVs could not be loaded."}
      />
    )
  }

  return (
    <div className="space-y-6">
      <CvSelector cvs={cvs} selectedCv={selectedCv} onSelect={setSelectedCv} />
      <CvAnalysisPanel key={selectedCv?.id ?? "empty-cv"} cv={selectedCv} />
    </div>
  )
}

export function CvJobMatchWorkflow() {
  const { cvs, errorMessage, selectedCv, setSelectedCv, state } =
    useCvSelection()

  if (state === "loading") {
    return <ContextLoading />
  }

  if (state === "failed") {
    return (
      <ErrorState
        title="CV context unavailable"
        message={errorMessage ?? "CVs could not be loaded."}
      />
    )
  }

  return (
    <div className="space-y-6">
      <CvSelector cvs={cvs} selectedCv={selectedCv} onSelect={setSelectedCv} />
      <CvJobComparisonPanel
        key={`${selectedCv?.id ?? "empty-cv"}-job`}
        cv={selectedCv}
      />
    </div>
  )
}

export function CoverLetterWorkflow() {
  const { accessToken } = useAuth()
  const [state, setState] = React.useState<LoadState>("loading")
  const [detailState, setDetailState] = React.useState<LoadState>("loading")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [comparisons, setComparisons] = React.useState<
    CvJobComparisonSummary[]
  >([])
  const [cvs, setCvs] = React.useState<Cv[]>([])
  const [selectedComparisonId, setSelectedComparisonId] = React.useState<
    string | null
  >(null)
  const [comparison, setComparison] = React.useState<CvJobComparison | null>(
    null
  )

  React.useEffect(() => {
    let isActive = true

    async function loadContext() {
      try {
        setState("loading")
        setErrorMessage(null)
        const [comparisonResult, cvResult] = await Promise.all([
          comparisonsApi.list(accessToken),
          cvsApi.list(accessToken),
        ])

        if (!isActive) {
          return
        }

        setComparisons(comparisonResult.comparisons)
        setCvs(cvResult.cvs)
        setSelectedComparisonId(comparisonResult.comparisons[0]?.id ?? null)
        setState("success")
      } catch (error) {
        if (!isActive) {
          return
        }

        setErrorMessage(getErrorMessage(error))
        setState("failed")
      }
    }

    loadContext()

    return () => {
      isActive = false
    }
  }, [accessToken])

  React.useEffect(() => {
    let isActive = true

    async function loadComparison() {
      if (!selectedComparisonId) {
        setComparison(null)
        setDetailState("success")
        return
      }

      try {
        setDetailState("loading")
        setErrorMessage(null)
        const result = await comparisonsApi.get(selectedComparisonId, accessToken)

        if (!isActive) {
          return
        }

        setComparison(result.comparison)
        setDetailState("success")
      } catch (error) {
        if (!isActive) {
          return
        }

        setComparison(null)
        setErrorMessage(getErrorMessage(error))
        setDetailState("failed")
      }
    }

    loadComparison()

    return () => {
      isActive = false
    }
  }, [accessToken, selectedComparisonId])

  if (state === "loading") {
    return <ContextLoading />
  }

  if (state === "failed") {
    return (
      <ErrorState
        title="Cover letter context unavailable"
        message={errorMessage ?? "Saved context could not be loaded."}
      />
    )
  }

  const selectedCv =
    cvs.find((cv) => cv.id === comparison?.cvId) ??
    cvs.find((cv) => cv.parserStatus === "parsed") ??
    null

  return (
    <div className="space-y-6">
      <ComparisonSelector
        comparisons={comparisons}
        selectedComparisonId={selectedComparisonId}
        onSelect={setSelectedComparisonId}
      />
      {detailState === "loading" ? <ContextLoading /> : null}
      {detailState === "failed" ? (
        <ErrorState
          title="Comparison unavailable"
          message={errorMessage ?? "Comparison details could not be loaded."}
        />
      ) : null}
      {detailState === "success" ? (
        <CoverLetterPanel
          key={`${selectedCv?.id ?? "empty-cv"}-${comparison?.id ?? "empty-comparison"}-cover`}
          cv={selectedCv}
          comparison={comparison}
        />
      ) : null}
    </div>
  )
}
