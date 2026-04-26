"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border border-border bg-white", className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)} {...props} />
);
const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-base font-semibold text-ink", className)} {...props} />
);
const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-muted", className)} {...props} />
);
const CardContent = ({ className, ...props }) => (
  <div className={cn("p-5 pt-3", className)} {...props} />
);
const CardFooter = ({ className, ...props }) => (
  <div className={cn("flex items-center p-5 pt-3", className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
