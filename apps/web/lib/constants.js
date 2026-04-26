export const STAGES = [
  { value: "LEAD", label: "Lead", badge: "default" },
  { value: "PROPOSAL_SENT", label: "Proposal sent", badge: "info" },
  { value: "NEGOTIATING", label: "Negotiating", badge: "warn" },
  { value: "WON", label: "Won", badge: "success" },
  { value: "LOST", label: "Lost", badge: "danger" },
];

export const URGENCY = [
  { value: "STANDARD", label: "Standard" },
  { value: "EXPEDITED", label: "Expedited" },
  { value: "CRITICAL", label: "Critical" },
];

export const COMPETITIVE = [
  { value: "SOLE", label: "Sole-sourced" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "PITCH", label: "Open pitch" },
];

export const CLIENT_SIZE = [
  { value: "BOOTSTRAP", label: "Bootstrapped" },
  { value: "FUNDED", label: "Funded" },
  { value: "SME", label: "SME" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

export const VA_MODES = [
  { value: "MATRIX", label: "Signal matrix" },
  { value: "REVENUE", label: "Revenue impact" },
];

export const DEPARTMENTS = [
  { value: "DESIGN", label: "Design" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "STRATEGY", label: "Strategy" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "OTHER", label: "Other" },
];

export const ENTITIES = [
  { value: "LLP", label: "LLP" },
  { value: "PVT_LTD", label: "Pvt Ltd" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SOLE_PROP", label: "Sole proprietor" },
  { value: "NON_PROFIT", label: "Non-profit" },
];

export const ESTIMATE_TYPES = [
  { value: "FIXED", label: "Fixed scope" },
  { value: "RETAINER", label: "Retainer" },
];

export const COMMISSION_TYPES = [
  { value: "NONE", label: "No commission", pct: 0 },
  { value: "REFERRAL_3", label: "Referral (3%)", pct: 3 },
  { value: "SALES_PARTNER_7", label: "Sales partner (7%)", pct: 7 },
  { value: "INTERNAL_1_5", label: "Internal (1.5%)", pct: 1.5 },
  { value: "CUSTOM", label: "Custom %", pct: null },
];

export const OVERHEAD_CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "INTERNET", label: "Internet" },
  { value: "MISC", label: "Misc" },
  { value: "OTHER", label: "Other" },
];
