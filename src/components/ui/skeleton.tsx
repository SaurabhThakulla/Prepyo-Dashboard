import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * A neutral placeholder block for content that is on its way.
 *
 * Only render one when the content really is coming. A skeleton is a promise
 * that something is about to take this space; showing it for a request that
 * will never arrive reads as a hang, which is worse than showing nothing.
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden
    className={cn("animate-pulse rounded-md bg-muted", className)}
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

export { Skeleton }
