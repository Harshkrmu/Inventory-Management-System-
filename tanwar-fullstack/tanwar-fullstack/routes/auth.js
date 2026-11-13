const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { config, signup, login, me, changePassword } = require("../controllers/authController");

router.get("/config", config);
router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.put("/password", requireAuth, changePassword);

module.exports = router;
