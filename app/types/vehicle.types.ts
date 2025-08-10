/**
 * Represents the available types of vehicles in the system.
 * This should be kept in sync with the backend configuration.
 */
export enum VehicleType {
    TAXI = 'Taxi',
    AC_TAXI = 'AC_Taxi',
    BIKE = 'Bike',
    EBIKE = 'EBike',
    ERIKSHA = 'ERiksha',
    AUTO = 'Auto',
}

/**
 * Represents the structure for a vehicle object.
 */
export interface Vehicle {
    _id: string;
    type: VehicleType;
    model: string;
    licensePlate: string;
    driverId?: string; 
    isAvailable: boolean;
    createdAt: string;
    updatedAt: string;
}
