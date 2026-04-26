import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function fmtPct(n) {
  return n.toFixed(1) + "%";
}
