import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-line-2 bg-base px-3 py-2 text-base text-ink transition-colors",
          // Muted ink at 55%: a placeholder is an example, and at full ink-3 it
          // reads as a filled-in value you have to check before typing over.
          // Every hand-rolled field in the app matches this — grep the class.
          "placeholder:text-ink-3/55",
          "hover:border-line-2/80 focus-visible:border-amber focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
