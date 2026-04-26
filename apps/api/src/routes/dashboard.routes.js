const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const c = require("../controllers/dashboard.controller");

const router = Router();

router.get("/", asyncHandler(c.getDashboard));

module.exports = router;
