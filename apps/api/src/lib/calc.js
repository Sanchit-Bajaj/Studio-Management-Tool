// ─── Constants ────────────────────────────────────────────────────────────────
const WPM = 4.33; // weeks per month
const GST_RATE = 0.18;

const COMMISSION_PCT = { NONE: 0, REFERRAL_3: 3, SALES_PARTNER_7: 7, INTERNAL_1_5: 1.5 };

function commissionPctFor(estimate) {
  if (estimate.commissionType === "CUSTOM") return estimate.commissionCustomPct || 0;
  return COMMISSION_PCT[estimate.commissionType] || 0;
}

// ─── Tax calculator ───────────────────────────────────────────────────────────
function calcTax(entity, grossProfit) {
  if (grossProfit <= 0) return { base: 0, surcharge: 0, cess: 0, total: 0, effectiveRate: 0 };

  let base = 0;
  let surcharge = 0;

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

// ─── Estimate calculator ──────────────────────────────────────────────────────
function calcEstimate(input) {
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

// ─── Partner split ────────────────────────────────────────────────────────────
function calcPartnerSplit(netProfit, partners) {
  if (!partners.length || netProfit === 0) return [];
  const totalEquity = partners.reduce((s, p) => s + p.equityPct, 0) || 100;
  return partners.map((p) => {
    const equityShare = netProfit * (p.equityPct / totalEquity);
    const execBonus = p.isExecLead ? netProfit * ((p.execPremPct || 0) / 100) : 0;
    const bdevBonus = netProfit * ((p.bdevPremPct || 0) / 100);
    return { partnerId: p.id, name: p.name, equityShare, execBonus, bdevBonus, total: equityShare + execBonus + bdevBonus };
  });
}

// ─── Builder used by both estimate and dashboard controllers ──────────────────
function buildCalcInputFromAggregates({ estimate, studio, allSoftware, allOverheads, now = new Date() }) {
  return {
    type: estimate.type,
    durationWeeks: estimate.durationWeeks || 8,
    margin: estimate.margin,
    commissionPct: commissionPctFor(estimate),
    members: estimate.allocations.map((a) => ({
      id: a.memberId, name: a.member.name, monthlyCost: a.member.monthlyCost,
      allocationPct: a.allocationPct, weeks: a.weeks, margin: a.margin,
    })),
    software: allSoftware.map((sw) => ({
      id: sw.id, name: sw.name, costPerSeat: sw.costPerSeat,
      isSharedLicence: sw.isSharedLicence, memberIds: sw.assignments.map((a) => a.memberId),
    })),
    overheads: allOverheads.map((oh) => ({
      id: oh.id, label: oh.label, amount: oh.amount, isActive: !oh.endDate || oh.endDate > now,
    })),
    excludedSoftwareIds: estimate.exclusions.filter((e) => e.softwareId).map((e) => e.softwareId),
    excludedOverheadIds: estimate.exclusions.filter((e) => e.overheadId).map((e) => e.overheadId),
    entity: studio.entity,
    gstRegistered: studio.gstRegistered,
  };
}

module.exports = {
  calcEstimate, calcTax, calcPartnerSplit,
  buildCalcInputFromAggregates, commissionPctFor,
  WPM, GST_RATE, COMMISSION_PCT,
};
