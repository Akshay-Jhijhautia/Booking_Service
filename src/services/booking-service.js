const axios = require("axios");
const { StatusCodes } = require("http-status-codes");

const { BookingRepository } = require("../repositories");
const db = require("../models");
const { ServerConfig } = require("../config");
const AppError = require("../utils/errors/app-error");

async function createBooking(data) {
  return new Promise((resolve, reject) => {
    // Implementing a transaction, this is a managed transaction, i.e we do no have to roll back manually
    const result = db.sequelize.transaction(
      async function bookingImplementation(t) {
        const flight = await axios.get(
          `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
        );
        const flightData = flight.data.data;
        if (data.noOfSeats > flightData.totalSeats) {
          // if we throw error, transaction automatically gets reverted i.e rollback
          reject(
            new AppError("Not enough seats available", StatusCodes.BAD_REQUEST)
          );
        }
        resolve(true);
      }
    );
  });
}

module.exports = {
  createBooking,
};
