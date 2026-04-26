const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/estimates.controller");

const router = Router();

router.get("/", asyncHandler(c.listEstimates));
router.get("/:id", asyncHandler(c.getEstimate));
router.post("/", validateBody(c.createSchema), asyncHandler(c.createEstimate));
router.patch("/:id", validateBody(c.updateSchema), asyncHandler(c.updateEstimate));
router.put("/:id/allocations", validateBody(c.allocationsSchema), asyncHandler(c.setAllocations));
router.put("/:id/exclusions", validateBody(c.exclusionsSchema), asyncHandler(c.setExclusions));
router.delete("/:id", asyncHandler(c.deleteEstimate));

module.exports = router;
