export const Models = Object.freeze({
  Admin: Object.freeze({
    ref: "Admin",
    collection: "admins"
  }),
  Comission: Object.freeze({
    ref: "Comission",
    collection: "comissions"
  }),
  ComissionLog: Object.freeze({
    ref: "ComissionLog",
    collection: "comissionlogs"
  }),
  Transaction: Object.freeze({
    ref: "Transaction",
    collection: "transactions"
  }),
  Wallet: Object.freeze({
    ref: "Wallet",
    collection: "wallets"
  }),
  Token: Object.freeze({
    ref: "Token",
    collection: "tokens"
  }),
  Credential: Object.freeze({
    ref: "Credential",
    collection: "credentials"
  }),
  Tenant: Object.freeze({
    ref: "Tenant",
    collection: "tenants"
  }),
  Otp: Object.freeze({
    ref: "Otp",
    collection: "otps"
  }),
  Media: Object.freeze({
    ref: "Media",
    collection: "media"
  }),
  Role: Object.freeze({
    ref: "Role",
    collection: "roles"
  }),
  Staff: Object.freeze({
    ref: "Staff",
    collection: "staffs"
  }),
  Service: Object.freeze({
    ref: "Service",
    collection: "services"
  }),
  ServiceProvider: Object.freeze({
    ref: "ServiceProvider",
    collection: "serviceproviders"
  }),
  Booking: Object.freeze({
    ref: "Booking",
    collection: "bookings"
  }),
  ServiceCategory: Object.freeze({
    ref: "ServiceCategory",
    collection: "servicecategories"
  }),
  User: Object.freeze({
    ref: "User",
    collection: "users"
  }),
  Availability: Object.freeze({
    ref: "Availability",
    collection: "availabilities"
  }),
  TimeOff: Object.freeze({
    ref: "TimeOff",
    collection: "timeoffs"
  }),
  Notification: Object.freeze({
    ref: "Notification",
    collection: "notifications"
  }),
  ProviderReview: Object.freeze({
    ref: "ProviderReview",
    collection: "providerreviews"
  }),
  TenantReview: Object.freeze({
    ref: "TenantReview",
    collection: "tenantreviews"
  }),
  BookingReview: Object.freeze({
    ref: "BookingReview",
    collection: "bookingreviews"
  })
} as const);
