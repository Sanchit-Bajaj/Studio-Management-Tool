const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/team.controller");

const router = Router();

router.get("/", asyncHandler(c.listTeam));
router.post("/", validateBody(c.createSchema), asyncHandler(c.createMember));
router.patch("/:id", validateBody(c.updateSchema), asyncHandler(c.updateMember));
router.delete("/:id", asyncHandler(c.deleteMember));

module.exports = router;
