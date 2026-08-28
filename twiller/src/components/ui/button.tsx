import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-brand-foreground hover:bg-x-blue-hover",
        brand:
          "bg-brand text-brand-foreground hover:bg-x-blue-hover",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#202327]",
        ghost:
          "text-foreground hover:bg-hover-overlay",
        link: "text-brand underline-offset-4 hover:underline font-normal",
        "nav-row":
          "flex h-11 w-full items-center justify-start rounded-full p-3 text-foreground transition-colors duration-[180ms] hover:bg-hover-overlay focus-visible:ring-2 focus-visible:ring-brand",
        tab: "relative flex-1 py-4 text-[15px] outline-none hover:bg-hover-overlay focus-visible:bg-hover-overlay",
        "toolbar-icon":
          "grid h-[38px] w-[38px] place-items-center rounded-full bg-transparent p-0 text-[#1D9BF0] transition-colors duration-150 hover:bg-[rgba(29,155,240,0.12)] [&_svg]:text-[#1D9BF0] [&_svg]:h-[23px] [&_svg]:w-[23px]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-full gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-full px-6 has-[>svg]:px-4",
        xl: "h-[52px] rounded-full px-8 text-base has-[>svg]:px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
