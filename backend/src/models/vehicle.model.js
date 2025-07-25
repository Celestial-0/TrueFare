import mongoose from 'mongoose';

const { Schema } = mongoose;

const vehicleSchema = new Schema({
  driverId: {
    type: Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true,
  },
  make: {
    type: String,
    required: true,
    maxlength: 50,
  },
  model: {
    type: String,
    required: false,
    maxlength: 50,
  },
  year: {
    type: Number,
    required: false,
    min: 1900,
    max: () => new Date().getFullYear() + 1,
  },
  licensePlate: {
    type: String,
    unique: true,
    sparse: true,
    required: false,
    default: undefined,
    maxlength: 20,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z0-9\-\s]+$/i.test(v);
      },
      message: 'License plate contains invalid characters'
    }
  },
  vehicleType: {
    type: String,
    enum: ['Taxi', 'AC_Taxi', 'Bike', 'EBike', 'ERiksha', 'Auto'],
    required: true,
    index: true,
  },
  comfortLevel: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Comfort level must be an integer'
    }
  },
  priceValue: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Price value must be an integer'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Vehicle', vehicleSchema);
