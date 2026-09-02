const router = require("express").Router();
const {
  register,
  login,
  refreshToken,
  getUser,
  getAllUsers,
} = require("../controller/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/user/:id", authMiddleware, getUser);
router.get("/users", authMiddleware, getAllUsers);

module.exports = router;
