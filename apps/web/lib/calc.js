// Mirror of apps/api/src/lib/calc.js — kept in sync manually for v1.
// Used for live estimate recalculation in the cost builder before saving.

export const WPM = 4.33;
export const GST_RATE = 0.18;
export const COMMISSION_PCT = { NONE: 0, REFERRAL_3: 3, SALES_PARTNER_7: 7, INTERNAL_1_5: 1.5 };

export function commissionPctFor(estimate) {
  if (!estimate) return 0;
  if (estimate.commissionType === "CUSTOM") return estimate.commissionCustomPct || 0;
  return COMMISSION_PCT[estimate.commissionType] || 0;
}

export function calcTax(entity, grossProfit) {
  if (grossProfit <= 0) return { base: 0, surcharge: 0, cess: 0, total: 0, effectiveRate: 0 };
  let base = 0, surcharge = 0;
  if (entity === "SOLE_PROP") {
    const gp = grossProfit;
    if (gp <= 250000) base = 0;
    else if (gp <= 500000) base = (gp - 250000) * 0.05;
    else if (gp <= 1000000) base = 12500 + (gp - 500000) * 0.2;
    else base = 112500 + (gp - 1000000) * 0.3;
  } else if (entity === "LLP" || entity === "PARTNERSHIP") {
    base = grossProfit * 0.3;
    if (grossProfit > 10000000) surcharge = base * 0.12;
  } else if (entity === "PVT_LTD") {
    base = grossProfit * 0.22;
    if (grossProfit > 10000000) surcharge = base * 0.10;
  } else if (entity === "NON_PROFIT") {
    base = (grossProfit * 0.15) * 0.3;
  }
  const cess = (base + surcharge) * 0.04;
  const total = base + surcharge + cess;
  const effectiveRate = grossProfit > 0 ? (total / grossProfit) * 100 : 0;
  return { base, surcharge, cess, total, effectiveRate };
}

export function calcEstimate(input) {
  const durationWeeks = input.durationWeeks || 8;
  const months = durationWeeks / WPM;
  const isRetainer = input.type === "RETAINER";

  const memberBreakdown = (input.members || []).map((m) => {
    const dm = isRetainer ? 1 : (m.weeks || durationWeeks) / WPM;
    const cost = m.monthlyCost * (m.allocationPct / 100) * dm;
    const billingRate = isRetainer
      ? m.monthlyCost * (m.allocationPct / 100) * (1 + (m.margin || 0) / 100)
      : undefined;
    return { memberId: m.id, name: m.name, allocationPct: m.allocationPct, weeks: dm * WPM, cost, billingRate };
  });
  const teamCost = memberBreakdown.reduce((s, r) => s + r.cost, 0);

  const excludedSwIds = new Set(input.excludedSoftwareIds || []);
  const memberIds = new Set((input.members || []).map((m) => m.id));
  let softwareCost = 0;
  for (const sw of (input.software || [])) {
    if (excludedSwIds.has(sw.id)) continue;
    const seats = sw.isSharedLicence ? 1 : (sw.memberIds || []).filter((id) => memberIds.has(id)).length || 1;
    const monthly = sw.costPerSeat * seats;
    softwareCost += isRetainer ? monthly : monthly * months;
  }

  const excludedOhIds = new Set(input.excludedOverheadIds || []);
  let monthlyOverhead = 0;
  for (const oh of (input.overheads || [])) {
    if (!oh.isActive || excludedOhIds.has(oh.id)) continue;
    monthlyOverhead += oh.amount;
  }
  const overheadCost = isRetainer ? monthlyOverhead : monthlyOverhead * months;
  const totalCost = teamCost + softwareCost + overheadCost;

  let revenue;
  if (isRetainer) {
    revenue = memberBreakdown.reduce((s, r) => s + (r.billingRate || 0), 0);
  } else {
    const margin = input.margin != null ? input.margin : 40;
    revenue = margin >= 100 ? totalCost * 2 : totalCost / (1 - margin / 100);
  }

  const commissionPct = input.commissionPct || 0;
  const commission = revenue * (commissionPct / 100);
  const grossProfit = revenue - commission - teamCost - softwareCost - overheadCost;
  const tax = calcTax(input.entity || "LLP", grossProfit);
  const netProfit = grossProfit - tax.total;

  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const gstAmount = input.gstRegistered ? revenue * GST_RATE : 0;

  return {
    totalCost, teamCost, softwareCost, overheadCost,
    revenue, grossProfit, commissionCost: commission,
    tax, netProfit,
    gstAmount, revenueWithGst: revenue + gstAmount,
    grossMarginPct, netMarginPct,
    months: isRetainer ? 1 : months,
    memberBreakdown,
  };
}

export function calcPartnerSplit(netProfit, partners) {
  if (!partners?.length || netProfit === 0) return [];
  const totalEquity = partners.reduce((s, p) => s + p.equityPct, 0) || 100;
  return partners.map((p) => {
    const equityShare = netProfit * (p.equityPct / totalEquity);
    const execBonus = p.isExecLead ? netProfit * ((p.execPremPct || 0) / 100) : 0;
    const bdevBonus = netProfit * ((p.bdevPremPct || 0) / 100);
    return { partnerId: p.id, name: p.name, equityShare, execBonus, bdevBonus, total: equityShare + execBonus + bdevBonus };
  });
}

// Value-based pricing — derives a margin% suggestion from value signals.
// Mirrors the MVP's vaSignals logic.
export function suggestMarginFromSignals(signals) {
  if (!signals) return null;
  if (signals.vsMode === "REVENUE" && signals.vsRevenueImpact) {
    const v = Number(signals.vsRevenueImpact);
    if (v >= 100000000) return 70;
    if (v >= 10000000) return 60;
    if (v >= 1000000) return 50;
    return 40;
  }
  // Matrix mode
  let m = 35;
  m += ((signals.vsComplexity || 2) - 2) * 5;
  m += ((signals.vsImpact || 2) - 2) * 5;
  if (signals.vsUrgency === "EXPEDITED") m += 5;
  if (signals.vsUrgency === "CRITICAL") m += 10;
  if (signals.vsCompetitive === "SOLE") m += 10;
  if (signals.vsCompetitive === "PITCH") m -= 5;
  if (signals.vsClientSize === "ENTERPRISE") m += 10;
  if (signals.vsClientSize === "FUNDED") m += 5;
  if (signals.vsClientSize === "BOOTSTRAP") m -= 5;
  return Math.max(15, Math.min(75, m));
}
