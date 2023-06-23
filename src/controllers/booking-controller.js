const { StatusCodes } = require("http-status-codes");

const { BookingService } = require("../services");
const { ErrorResponse, SuccessResponse } = require("../utils/common");

const inMemoryDb = {};

async function createBooking(req, res) {
  try {
    const booking = await BookingService.createBooking({
      flightId: req.body.flightId,
      userId: req.body.userId,
      noOfSeats: req.body.noOfSeats,
    });
    SuccessResponse.data = booking;
    return res.status(StatusCodes.OK).json(SuccessResponse);
  } catch (error) {
    ErrorResponse.error = error;
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(ErrorResponse);
  }
}

async function makePayment(req, res) {
  try {
    const idempotencyKey = req.headers["x-idempotency-key"];
    if (!idempotencyKey) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Idempotency Key missing" });
    }
    if (!idempotencyKey || inMemoryDb[idempotencyKey]) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Cannot retry on a successfull payment" });
    }

    const booking = await BookingService.makePayment({
      totalCost: req.body.totalCost,
      userId: req.body.userId,
      bookingId: req.body.bookingId,
    });

    inMemoryDb[idempotencyKey] = idempotencyKey;
    SuccessResponse.data = booking;

    return res.status(StatusCodes.OK).json(SuccessResponse);
  } catch (error) {
    ErrorResponse.error = error;
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(ErrorResponse);
  }
}

module.exports = {
  createBooking,
  makePayment,
};
