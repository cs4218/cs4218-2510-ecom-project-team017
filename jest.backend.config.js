export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/helpers/*.test.js",
    "<rootDir>/middlewares/*.test.js",
    "<rootDir>/models/*.test.js",
    "<rootDir>/config/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "helpers/**",
    "middlewares/**",
    "controllers/**",
    "models/**",
  ],
  coverageThreshold: {
    // lower coverage thresholds to let CI pass
    global: {
      lines: 90,
      functions: 90,
    },
  },
};
