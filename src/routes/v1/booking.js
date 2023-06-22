const express = require("express");
const router = express.Router();

const { BoookingController } = require("../../controllers");

router.post("/", BoookingController.createBooking);

module.exports = router;
