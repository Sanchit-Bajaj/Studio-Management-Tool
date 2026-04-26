const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/overheads.controller");

const router = Router();

router.get("/", asyncHandler(c.listOverheads));
router.post("/", validateBody(c.createSchema), asyncHandler(c.createOverhead));
router.patch("/:id", validateBody(c.updateSchema), asyncHandler(c.updateOverhead));
router.patch("/:id/stop", asyncHandler(c.stopOverhead));
router.patch("/:id/resume", asyncHandler(c.resumeOverhead));
router.delete("/:id", asyncHandler(c.deleteOverhead));

module.exports = router;
