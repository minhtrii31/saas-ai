"use client"

import {
  Cancel01Icon,
  ChartAnalysisIcon,
  Clock01Icon,
  DashboardSquare01Icon,
  FileUploadIcon,
  Logout01Icon,
  MailEdit01Icon,
  Menu01Icon,
  UserEdit01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth/auth-context"
import { cn } from "@/lib/utils"

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: DashboardSquare01Icon,
      },
    ],
  },
  {
    label: "Workflows",
    items: [
      {
        label: "CVs",
        href: "/dashboard/cvs",
        icon: FileUploadIcon,
      },
      {
        label: "Analysis",
        href: "/dashboard/analysis",
        icon: ChartAnalysisIcon,
      },
      {
        label: "Job Match",
        href: "/dashboard/job-match",
        icon: Target02Icon,
      },
      {
        label: "Cover Letters",
        href: "/dashboard/cover-letters",
        icon: MailEdit01Icon,
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        label: "History",
        href: "/dashboard/history",
        icon: Clock01Icon,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Profile",
        href: "/dashboard/profile",
        icon: UserEdit01Icon,
      },
    ],
  },
]

type DashboardNavigationItem =
  (typeof navigationGroups)[number]["items"][number]

const dashboardRoutes = navigationGroups
  .flatMap((group) => group.items)
  .sort((a, b) => b.href.length - a.href.length)

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  async function onLogout() {
    setIsLoggingOut(true)
    await logout()
  }

  const accountLabel = user?.name || user?.email || "Account"
  const accountEmail = user?.email || "Signed in"
  const accountInitials = getAccountInitials(accountLabel)
  const currentRoute = getCurrentDashboardRoute(pathname)

  function isNavigationItemActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="bg-muted/30">
        <Sidebar
          collapsible="offcanvas"
          className="border-sidebar-border bg-sidebar"
          aria-label="Dashboard navigation"
        >
          <SidebarHeader className="min-h-17 justify-center border-b border-sidebar-border/80 px-3.5">
            <div className="flex items-center gap-2">
              <DashboardSidebarBrand />
              <MobileSidebarClose />
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2.5 py-3.5">
            <nav aria-label="Dashboard primary navigation">
              {navigationGroups.map((group) => (
                <SidebarGroup key={group.label} className="px-0 py-1">
                  <SidebarGroupLabel className="h-7 px-2 text-[0.6875rem] font-semibold tracking-normal text-sidebar-foreground/48 uppercase">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {group.items.map((item) => (
                        <DashboardSidebarItem
                          key={item.href}
                          item={item}
                          isActive={isNavigationItemActive(item.href)}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </nav>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-x-hidden bg-muted/30">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
            <div className="flex h-16.75 items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <MobileNavigationTrigger />
                <DashboardBreadcrumb currentRoute={currentRoute} />
                <div className="min-w-0 md:hidden">
                  <p className="truncate text-base font-medium text-foreground">
                    {currentRoute.label}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-9 justify-start gap-2 rounded-full px-1.5 ring-1 ring-transparent hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:rounded-md sm:p-6 sm:px-3 sm:text-card-foreground sm:hover:bg-muted"
                    aria-label={`Open account menu for ${accountLabel}`}
                    disabled={isLoggingOut}
                  >
                    <Avatar size="sm" className="size-7 ring-2 ring-background">
                      {user?.avatarUrl ? (
                        <AvatarImage
                          src={user.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                        {accountInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden min-w-0 flex-1 text-left sm:block">
                      <span className="block truncate text-xs font-medium">
                        {accountLabel}
                      </span>
                      <span className="block truncate text-[0.6875rem] font-normal text-muted-foreground">
                        {accountEmail}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-52 p-2"
                >
                  <DropdownMenuLabel className="rounded-md p-1.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-popover-foreground">
                          {accountLabel}
                        </p>
                        <p className="truncate text-xs font-normal text-muted-foreground">
                          {accountEmail}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    asChild
                    className="min-h-9 cursor-pointer gap-1.5 text-xs"
                  >
                    <Link href="/dashboard/profile">
                      <HugeiconsIcon
                        icon={UserEdit01Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    variant="destructive"
                    className="min-h-9 cursor-pointer gap-1.5 text-xs font-medium"
                    onSelect={() => void onLogout()}
                    disabled={isLoggingOut}
                    aria-label={isLoggingOut ? "Signing out" : "Sign out"}
                  >
                    <HugeiconsIcon
                      icon={Logout01Icon}
                      size={16}
                      strokeWidth={2}
                    />
                    {isLoggingOut ? "Signing out" : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="mx-auto w-full min-w-0 px-4 py-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function getAccountInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
  }

  return parts[0]?.charAt(0).toUpperCase() || "A"
}

function getCurrentDashboardRoute(pathname: string): DashboardNavigationItem {
  return (
    dashboardRoutes.find((route) => {
      if (route.href === "/dashboard") {
        return pathname === route.href
      }

      return pathname === route.href || pathname.startsWith(`${route.href}/`)
    }) ?? navigationGroups[0].items[0]
  )
}

function DashboardBreadcrumb({
  currentRoute,
}: {
  currentRoute: DashboardNavigationItem
}) {
  const isDashboard = currentRoute.href === "/dashboard"

  return (
    <Breadcrumb className="hidden min-w-0 md:block">
      <BreadcrumbList className="flex-nowrap text-sm">
        <BreadcrumbItem>
          {isDashboard ? (
            <BreadcrumbPage className="text-muted-foreground">
              Dashboard
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isDashboard ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">
                {currentRoute.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function DashboardSidebarItem({
  item,
  isActive,
}: {
  item: DashboardNavigationItem
  isActive: boolean
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        size="default"
        tooltip={item.label}
        className={cn(
          "relative min-h-9 items-center gap-2.5 rounded-md border border-transparent px-2.5 text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent/65 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          isActive &&
            "border-sidebar-border/80 bg-sidebar-accent text-sidebar-accent-foreground shadow-xs before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-foreground [&_svg]:text-sidebar-accent-foreground"
        )}
      >
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          onClick={() => setOpenMobile(false)}
        >
          <HugeiconsIcon icon={item.icon} size={16} strokeWidth={2} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {item.label}
            </span>
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function DashboardSidebarBrand() {
  const { setOpenMobile } = useSidebar()

  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-sidebar-foreground outline-hidden transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      aria-label="SaaS AI CV dashboard"
      onClick={() => setOpenMobile(false)}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-xs ring-1 ring-sidebar-border/60">
        <HugeiconsIcon icon={DashboardSquare01Icon} size={18} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">SaaS AI CV</span>
        <span className="block truncate text-xs text-sidebar-foreground/55">
          CV workflow workspace
        </span>
      </span>
    </Link>
  )
}

function MobileNavigationTrigger() {
  const { setOpenMobile } = useSidebar()

  return (
    <Button
      aria-label="Open navigation"
      className="size-9 shrink-0 md:hidden"
      onClick={() => setOpenMobile(true)}
      size="icon-sm"
      type="button"
      variant="outline"
    >
      <HugeiconsIcon icon={Menu01Icon} size={17} strokeWidth={2} />
      <span className="sr-only">Open navigation</span>
    </Button>
  )
}

function MobileSidebarClose() {
  const { setOpenMobile } = useSidebar()

  return (
    <Button
      aria-label="Close navigation"
      className="md:hidden"
      onClick={() => setOpenMobile(false)}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
    </Button>
  )
}
