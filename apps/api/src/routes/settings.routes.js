const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/settings.controller");

const router = Router();

router.get("/", asyncHandler(c.getSettings));
router.patch("/", validateBody(c.updateSchema), asyncHandler(c.updateSettings));

module.exports = router;
