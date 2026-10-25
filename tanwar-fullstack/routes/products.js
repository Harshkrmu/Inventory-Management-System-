const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { list, stats, create, update, remove } = require("../controllers/productController");

// Every product route requires a logged-in user (valid JWT).
router.use(requireAuth);

router.get("/", list);
router.get("/stats", stats);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;
