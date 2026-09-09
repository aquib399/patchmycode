export enum MFAType {
  None = "none",
  Authenticator = "authenticator",
  Sms = "sms",
  Email = "email"
}

export interface ICredential {
  mfaType: MFAType;
  mfaEnabled?: boolean;
}
