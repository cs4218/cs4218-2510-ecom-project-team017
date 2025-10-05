export default {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: [
    "<rootDir>/client/src/components/Form/*.test.js",
    "<rootDir>/client/src/hooks/*.test.js",
    "<rootDir>/client/src/pages/*.test.js",
    "<rootDir>/client/src/pages/*/*.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/components/Form/CategoryForm.js",
    "client/src/hooks/**",
    "client/src/pages/Auth/ForgotPassword.js",
    "client/src/pages/Auth/Register.js",
    "client/src/pages/Auth/Login.js",
    "client/src/pages/user/Orders.js",
    "client/src/pages/admin/CreateCategory.js",
    "client/src/pages/admin/CreateProduct.js",
    "client/src/pages/admin/Products.js",
    "client/src/pages/admin/UpdateProduct.js",
    "client/src/pages/Categories.js",
    "client/src/pages/CategoryProduct.js",
    "client/src/pages/ProductDetails.js",
  ],
  coverageThreshold: {
    // lower coverage thresholds to let CI pass
    global: {
      lines: 90,
      functions: 90,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
