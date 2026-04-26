const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/software.controller");

const router = Router();

router.get("/", asyncHandler(c.listSoftware));
router.post("/", validateBody(c.createSchema), asyncHandler(c.createSoftware));
router.patch("/:id", validateBody(c.updateSchema), asyncHandler(c.updateSoftware));
router.put("/:id/assignments", validateBody(c.assignmentsSchema), asyncHandler(c.setAssignments));
router.delete("/:id", asyncHandler(c.deleteSoftware));

module.exports = router;
