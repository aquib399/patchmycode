export const Models = Object.freeze({
  Admin: Object.freeze({
    ref: "Admin",
    collection: "admins"
  }),
  User: Object.freeze({
    ref: "User",
    collection: "users"
  }),
  Credential: Object.freeze({
    ref: "Credential",
    collection: "credentials"
  }),
  Notification: Object.freeze({
    ref: "Notification",
    collection: "notifications"
  }),
  Otp: Object.freeze({
    ref: "Otp",
    collection: "otps"
  }),
  Token: Object.freeze({
    ref: "Token",
    collection: "tokens"
  }),
  Installation: Object.freeze({
    ref: "Installation",
    collection: "installations"
  })
} as const);
