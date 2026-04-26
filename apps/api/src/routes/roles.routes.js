const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateBody } = require("../middleware/validate");
const c = require("../controllers/roles.controller");

const router = Router();

router.get("/", asyncHandler(c.listRoles));
router.post("/", validateBody(c.createSchema), asyncHandler(c.createRole));
router.patch("/:id", validateBody(c.updateSchema), asyncHandler(c.updateRole));
router.delete("/:id", asyncHandler(c.deleteRole));

module.exports = router;
