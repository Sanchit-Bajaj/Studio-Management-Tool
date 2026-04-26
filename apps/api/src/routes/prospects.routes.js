const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/prospects.controller");

const router = Router();

router.get("/", asyncHandler(c.listProspects));
router.get("/:id", asyncHandler(c.getProspect));
router.post("/", validateBody(c.createSchema), asyncHandler(c.createProspect));
router.patch("/:id", validateBody(c.updateSchema), asyncHandler(c.updateProspect));
router.delete("/:id", asyncHandler(c.deleteProspect));

module.exports = router;
