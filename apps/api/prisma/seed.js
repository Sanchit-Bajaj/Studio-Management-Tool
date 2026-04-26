const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const db = new PrismaClient();

async function main() {
  const seedPath = path.join(__dirname, "../../../studio-seed-data.json");
  if (!fs.existsSync(seedPath)) {
    console.log("No seed data file found at", seedPath);
    return;
  }

  const raw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const CLERK_ORG_ID = process.env.STUDIO_ORG_ID || "org_placeholder";

  // Studio
  const studio = await db.studio.upsert({
    where: { clerkOrgId: CLERK_ORG_ID },
    update: {},
    create: {
      clerkOrgId: CLERK_ORG_ID,
      name: raw.settings?.studioName || "Framework Studio",
      founderNames: raw.settings?.founderNames || "",
      email: raw.settings?.email || null,
      phone: raw.settings?.phone || null,
      gstin: raw.settings?.gstin || null,
      entity: raw.settings?.entity || "LLP",
      gstRegistered: raw.settings?.gstRegistered || false,
      workingDaysPerMonth: raw.settings?.workingDaysPerMonth || 22,
      workingHoursPerDay: raw.settings?.workingHoursPerDay || 8,
      pipelineProbLead: raw.settings?.pipelineProbLead || 20,
      pipelineProbProposal: raw.settings?.pipelineProbProposal || 50,
      pipelineProbNegotiating: raw.settings?.pipelineProbNegotiating || 75,
    },
  });
  console.log("Studio:", studio.name);

  // Roles
  const roleMap = {};
  for (const r of (raw.roles || [])) {
    const role = await db.role.upsert({
      where: { studioId_name: { studioId: studio.id, name: r.name } },
      update: {},
      create: { studioId: studio.id, name: r.name, department: r.department || "DESIGN" },
    });
    roleMap[r.id] = role.id;
  }
  console.log("Roles:", Object.keys(roleMap).length);

  // Team members
  const memberMap = {};
  for (const m of (raw.team || [])) {
    const member = await db.teamMember.create({
      data: {
        studioId: studio.id,
        name: m.name,
        roleId: roleMap[m.roleId] || null,
        department: m.department || "DESIGN",
        monthlyCost: m.monthlyCost || 0,
        isActive: m.isActive !== false,
        isPartner: m.isPartner || false,
        equityPct: m.equityPct || 0,
        execPremPct: m.execPremPct || 0,
        bdevPremPct: m.bdevPremPct || 0,
      },
    });
    memberMap[m.id] = member.id;
  }
  console.log("Team:", Object.keys(memberMap).length);

  // Software + assignments
  const softwareMap = {};
  for (const sw of (raw.software || [])) {
    const tool = await db.softwareTool.create({
      data: { studioId: studio.id, name: sw.name, costPerSeat: sw.costPerSeat, isSharedLicence: sw.isSharedLicence || false },
    });
    softwareMap[sw.id] = tool.id;
    for (const mid of (sw.assignedMemberIds || [])) {
      if (memberMap[mid]) {
        await db.softwareAssignment.create({ data: { softwareId: tool.id, memberId: memberMap[mid] } });
      }
    }
  }
  console.log("Software:", Object.keys(softwareMap).length);

  // Overheads
  for (const oh of (raw.overheads || [])) {
    await db.overheadItem.create({
      data: {
        studioId: studio.id, category: oh.category || "MISC", label: oh.label, amount: oh.amount,
        startDate: oh.startDate ? new Date(oh.startDate) : null,
        endDate: oh.endDate ? new Date(oh.endDate) : null,
      },
    });
  }
  console.log("Overheads:", (raw.overheads || []).length);

  // Prospects + Estimates
  for (const p of (raw.prospects || [])) {
    const prospect = await db.prospect.create({
      data: {
        studioId: studio.id, projectName: p.projectName, clientName: p.clientName,
        contactEmail: p.contactEmail || null, notes: p.notes || null,
        stage: p.stage || "LEAD",
      },
    });

    if (p.estimate) {
      const e = p.estimate;
      const est = await db.estimate.create({
        data: {
          studioId: studio.id, prospectId: prospect.id,
          name: e.name || p.projectName, type: e.type || "FIXED",
          durationWeeks: e.durationWeeks, margin: e.margin,
          commissionType: e.commissionType || "NONE",
        },
      });
      for (const a of (e.allocations || [])) {
        if (memberMap[a.memberId]) {
          await db.estimateAllocation.create({
            data: { estimateId: est.id, memberId: memberMap[a.memberId], allocationPct: a.allocationPct, weeks: a.weeks },
          });
        }
      }
    }
  }
  console.log("Prospects:", (raw.prospects || []).length);
  console.log("Seed complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
