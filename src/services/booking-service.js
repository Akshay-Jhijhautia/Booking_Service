const axios = require("axios");
const { StatusCodes } = require("http-status-codes");

const { BookingRepository } = require("../repositories");
const db = require("../models");
const { ServerConfig } = require("../config");
const AppError = require("../utils/errors/app-error");
const { Enums } = require("../utils/common");
const { BOOKED, CANCELLED, INITIATED, PENDING } = Enums.BOOKING_STATUS;

const bookingRepository = new BookingRepository();

async function createBooking(data) {
  // this is a unmanaged transaction i.e we need to roll back manually, in case of error
  const transaction = await db.sequelize.transaction(); // we are making a transaction object here, all queries made after this are part of transaction
  try {
    const flight = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
    );
    const flightData = flight.data.data;
    if (data.noOfSeats > flightData.totalSeats) {
      throw new AppError("Not enough seats available", StatusCodes.BAD_REQUEST);
    }

    const totalBillingAmount = data.noOfSeats * flightData.price;
    const bookingPayload = { ...data, totalCost: totalBillingAmount };
    const booking = await bookingRepository.create(bookingPayload, transaction);

    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
      {
        seats: data.noOfSeats,
      }
    );

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// A demo payment api, to unbook the seats, i.e no. of selected seats in above api, if payment is not completed by the user, or payment fails.
async function makePayment(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.get(
      data.bookingId,
      transaction
    );
    if (bookingDetails.status == CANCELLED) {
      throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
    }

    const bookingTime = new Date(bookingDetails.createdAt);
    const currentTime = new Date();
    // here we are checking if the payment is made within 5 minutes, after selecting/booking the seats
    if (currentTime - bookingTime > 300000) {
      // 5 minutes = 300000 miliseconds
      // incrementing seats in case booking fails
      await cancelBooking(data.bookingId);
      throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
    }

    if (bookingDetails.userId != data.userId) {
      throw new AppError(
        "User Details does not match",
        StatusCodes.BAD_REQUEST
      );
    }
    if (bookingDetails.totalCost != data.totalCost) {
      throw new AppError(
        "Amount of payment does not match",
        StatusCodes.BAD_REQUEST
      );
    }

    // we assume here that payment is successfull
    bookingRepository.update(
      data.bookingId,
      {
        status: BOOKED,
      },
      transaction
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cancelBooking(bookingId) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.get(bookingId, transaction);
    if (bookingDetails.status == CANCELLED) {
      await transaction.commit();
      return true;
    }
    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`,
      {
        seats: bookingDetails.noOfSeats,
        decrease: 0,
      }
    );
    await bookingRepository.update(
      bookingId,
      { status: CANCELLED },
      transaction
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  createBooking,
  makePayment,
};
