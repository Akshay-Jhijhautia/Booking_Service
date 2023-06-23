const CrudRepository = require("./crud-repository");
const { Booking } = require("../models");

class BookingRepository extends CrudRepository {
  constructor() {
    super(Booking);
  }

  async createBooking(data, transaction) {
    const response = await Booking.create(data, { transaction: transaction });
    return response;
  }

  async get(data, transaction) {
    const response = await this.model.findByPk(data, {
      transaction: transaction,
    });
    if (!response) {
      throw new AppError("Resource Not available", StatusCodes.NOT_FOUND);
    }
    return response;
  }

  async update(id, data, transaction) {
    // data should be an object
    const response = await this.model.update(
      data,
      {
        where: {
          id: id,
        },
      },
      {
        transaction: transaction,
      }
    );
    return response;
  }
}

module.exports = BookingRepository;
