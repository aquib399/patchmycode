export const userAuthPaths = {
  "/api/user/v1/auth/signup/send-otp": {
    post: {
      tags: ["user-auth"],
      summary: "Send signup OTP",
      description:
        "Sends a verification OTP to the user's phone for registration.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["phone", "country"],
              properties: {
                phone: { type: "string", example: "1234567890" },
                country: { type: "string", example: "+1" },
                email: {
                  type: "string",
                  example: "user@example.com",
                  nullable: true
                }
              }
            }
          }
        }
      },
      responses: {
        "200": {
          description: "OTP sent successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "boolean", example: false },
                  message: {
                    type: "string",
                    example: "OTP sent to your phone number successfully"
                  },
                  data: {
                    type: "object",
                    properties: {
                      otpRequestId: {
                        type: "string",
                        example: "60d5ecb8b5c9c22b1c8e4111"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "409": { description: "Account already exists with these details" }
      }
    }
  },
  "/api/user/v1/auth/signup": {
    post: {
      tags: ["user-auth"],
      summary: "User Signup",
      description:
        "Verifies signup OTP code and registers a new customer account.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["details", "credentials"],
              properties: {
                details: {
                  type: "object",
                  required: [
                    "name",
                    "phone",
                    "country",
                    "otpRequestId",
                    "otpCode"
                  ],
                  properties: {
                    name: { type: "string", example: "John Doe" },
                    phone: { type: "string", example: "1234567890" },
                    country: { type: "string", example: "+1" },
                    email: {
                      type: "string",
                      example: "user@example.com",
                      nullable: true
                    },
                    otpRequestId: {
                      type: "string",
                      example: "60d5ecb8b5c9c22b1c8e4111"
                    },
                    otpCode: { type: "string", example: "123456" }
                  }
                },
                credentials: {
                  type: "object",
                  required: ["password"],
                  properties: {
                    password: { type: "string", example: "password123" },
                    mfaType: { type: "string", example: "none", nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        "201": {
          description: "User account created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "boolean", example: false },
                  message: {
                    type: "string",
                    example: "User account created successfully"
                  },
                  data: {
                    type: "object",
                    properties: {
                      user: {
                        type: "object",
                        properties: {
                          _id: {
                            type: "string",
                            example: "60d5ecb8b5c9c22b1c8e4111"
                          },
                          name: { type: "string", example: "John Doe" },
                          email: {
                            type: "string",
                            example: "user@example.com",
                            nullable: true
                          },
                          phone: { type: "string", example: "1234567890" },
                          countryCode: { type: "string", example: "+1" },
                          status: { type: "string", example: "active" },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "400": { description: "Invalid OTP code" },
        "409": { description: "Account already exists" }
      }
    }
  },
  "/api/user/v1/auth/signin": {
    post: {
      tags: ["user-auth"],
      summary: "User Signin",
      description:
        "Authenticate user credentials and receive JWT access & refresh tokens.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["password"],
              properties: {
                email: { type: "string", example: "user@example.com" },
                phone: { type: "string", example: "1234567890" },
                country: { type: "string", example: "+1" },
                password: { type: "string", example: "password123" }
              }
            }
          }
        }
      },
      responses: {
        "200": {
          description: "Signed in successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "boolean", example: false },
                  message: {
                    type: "string",
                    example: "Signed in successfully"
                  },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string", example: "eyJhbGciOi..." },
                      refreshToken: { type: "string", example: "eyJhbGciOi..." }
                    }
                  }
                }
              }
            }
          }
        },
        "401": { description: "Invalid credentials" },
        "403": { description: "Account suspended" }
      }
    }
  },
  "/api/user/v1/auth/signout": {
    post: {
      tags: ["user-auth"],
      summary: "User Signout",
      description: "Invalidate refresh token session and clear auth cookies.",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Signed out successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "boolean", example: false },
                  message: {
                    type: "string",
                    example: "Signed out successfully"
                  },
                  data: { type: "object" }
                }
              }
            }
          }
        }
      }
    }
  }
};
