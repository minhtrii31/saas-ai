"use client"

import { useId, type ElementType } from "react"

import { cn } from "@/lib/utils"

const levelMap: Record<2 | 3 | 4, ElementType> = {
  2: "h2",
  3: "h3",
  4: "h4",
}

interface SectionHeaderProps {
  level?: 2 | 3 | 4
  children: string
  className?: string
}

/**
 * SectionHeader
 * 
 * A consistent heading component for UI sections, providing appropriate
 * spacing, typography, and alignment. Used throughout the dashboard and
 * other UI areas to demarcate sections.
 */
export default function SectionHeader({ level = 3, children, className }: SectionHeaderProps) {
  const id = useId()
  const Tag = levelMap[level] ?? "h3"

  return (
    <Tag
      id={id}
      className={cn(
        "text-lg font-medium text-foreground sas-animate-fade-in-slow",
        className
      )}
    >
      {children}
    </Tag>
  )
}
