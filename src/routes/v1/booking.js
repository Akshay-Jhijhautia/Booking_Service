const express = require("express");
const router = express.Router();

const { BoookingController } = require("../../controllers");

router.post("/", BoookingController.createBooking);
router.post("/payments", BoookingController.makePayment);

module.exports = router;
