import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold uppercase tracking-[0.22em] transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-950",
  {
    variants: {
      variant: {
        default:
          "bg-lime-sheen text-lime-700 shadow-lime hover:scale-[0.98] active:scale-[0.96]",
        secondary:
          "border border-mist-700/30 bg-transparent text-foreground hover:bg-pitch-800",
        ghost: "text-lime-100 hover:text-lime-300",
      },
      size: {
        default: "h-11 px-6 py-2",
        lg: "h-14 px-8 text-[0.78rem]",
        xl: "h-16 px-10 text-sm",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
