const { Router } = require("express");

const router = Router();

router.use("/settings", require("./settings.routes"));
router.use("/team", require("./team.routes"));
router.use("/roles", require("./roles.routes"));
router.use("/software", require("./software.routes"));
router.use("/overheads", require("./overheads.routes"));
router.use("/prospects", require("./prospects.routes"));
router.use("/estimates", require("./estimates.routes"));
router.use("/dashboard", require("./dashboard.routes"));

module.exports = router;
