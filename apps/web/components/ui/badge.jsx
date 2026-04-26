import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-sand text-muted border border-border",
        accent: "bg-accent/10 text-accent",
        success: "bg-green-50 text-green-700",
        warn: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-600",
        info: "bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
