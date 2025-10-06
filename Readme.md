# CS4218 Project - Virtual Vault

[Link to CI](https://github.com/cs4218/cs4218-2510-ecom-project-team017/actions/runs/17571897740/job/49909481600)

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:

   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:

   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:

   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:

   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:

   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:

   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**

   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**

   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**

   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**

   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:

   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**
     ```bash
     npm run test
     ```

### 6. Contributions

### Team Member Contributions (MS1)

| Assignee              | Features                                | Client Related Files (/client/src)                                                                                                                            | Server Related Files (./)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tee Ren Jing          | Protected Routes + Registration + Login | `context/auth.js` <br> `pages/Auth/Register.js` <br> `pages/Auth/Login.js`                                                                                    | `helpers/authHelper.js` <br>`middlewares/authMiddleware.js` <br>`controllers/authController.js`<br> - registerController <br> - loginController<br> - forgotPasswordController<br> - testController                                                                                                                                                                                                                                         |
| Ruth Lim Sze Ern      | Order + Payment                         | `pages/user/Orders.js`                                                                                                                                        | `controllers/authController.js`<br> - updateProfileController<br> - getOrdersController<br> - getAllOrdersController<br> - orderStatusController<br> `controllers/productController.js`<br> - braintreeTokenController<br> - braintreePaymentController                                                                                                                                                                                     |
| He Ruoqing, Vivien     | Product                                 | `pages/ProductDetails.js` <br> `pages/CategoryProduct.js`<br> `pages/admin/CreateProduct.js`<br> `pages/admin/UpdateProduct.js`<br> `pages/admin/Products.js` | `controllers/productController.js` <br> - createProductController <br> - updateProductController <br> - deleteProductController<br> - getSingleProductController<br> - getProductController<br> - productFiltersController <br>- productCategoryController <br>- productPhotoController<br> - productCountController<br> - productListController <br>- relatedProductController <br>- searchProductController <br> `models/productModel.js` |
| Tang Jia Ning Caitlyn | Category                                | `hooks/useCategory.js` <br> `pages/Categories.js`<br> `components/Form/CategoryForm.js`<br> `pages/admin/CreateCategory.js`                                   | `controllers/categoryController.js` <br> - createCategoryController <br> - updateCategoryController <br> - categoryController <br> - singleCategoryController <br> - deleteCategoryController                                                                                                                                                                                                                                               |

We would like to give credit to AI in helping to generate some of the test cases.

### Ren Jing

**Testing & Quality Assurance**

- Developed comprehensive unit tests for Login, Register, and Forgot Password features using Jest and React Testing Library
- Implemented Boundary Value Analysis for password validation, ensuring minimum 6-character requirement enforcement
- Authored integration tests covering complete authentication workflows and error scenarios

**Bug Identification & Resolution**

- Identified and fixed critical HTTP status code issues in authentication controllers:
  - **Register Controller**: Fixed 200 status code returned for existing users (changed to proper error code)
  - **Login Controller**: Corrected 200 status code for invalid password attempts
- Enhanced user experience by implementing descriptive error messages in toast notifications
- Discovered and implemented the missing Forgot Password page feature

**Code Quality Improvements**

- Established robust error handling patterns across all authentication components
- Implemented loading states and form validation for better user feedback
- Created maintainable test suites with proper mocking strategies and cleanup

**Testing Methodology**

- Employed Boundary Value Analysis for password validation testing
- Implemented Equivalence Partitioning for efficient test coverage
- Utilized Pairwise Testing for comprehensive input combination coverage
- Applied State Transition Testing for user workflow validation

### Caitlyn Tang

**Testing & Quality Assurance**

- Developed comprehensive unit tests for Category related features using Jest and React Testing Library
- Authored integration tests covering complete category related workflows and error scenarios

**Bug Identification & Resolution**

- Identified and fixed critical code issues in the category controller:
  - **Create Category Controller**:
    - Fixed 401 status code returned for invalid request (changed to error code 400)
    - Fixed invalid variable call
- Enhanced user experience by correcting spelling errors found in toast notifications and return messages
- Removed unused fragment in CreateCategory.js categories table
- Implemented input validation of category names

**Code Quality Improvements**

- Created maintainable test suites with proper mocking strategies and cleanup
- Corrected code styling errors found for better readability and maintenance

**Testing Methodology**

- Employed Equivalence Partitioning for category naming validation testing
- Utilized Pairwise Testing for comprehensive input combination coverage

### Ruth Lim

**Testing & Quality Assurance**

- Wrote comprehensive unit tests for payment gateway and order management related features using Jest
- Implemented thorough input validation testing for cart items, prices, order IDs, and status values to cover success and error branches

**Bug Identification & Resolution**

- Added input validations for payment controller
- Removed password hash from profile update responses to prevent sensitive data exposure
- Fixed timestamp field (createAt to createdAt) which affected date display

**Code Quality Improvements**

- Standardized error handling and response messages in controllers
- Kept tests concise and readable with Arrange–Act–Assert structure, and targeted assertions

**Testing Methodology**

- Utilized equivalence partitioning for price validation testing (negative, zero, positive, non-numeric values)
- Conducted edge case analysis including null/undefined handling, empty arrays, and missing properties
- Implemented error path coverage ensuring all catch blocks and exception handlers are tested

### Vivien He

**Testing & Quality Assurance**

- Developed comprehensive unit tests for product-related features, components and pages using Jest and React Testing Library
- Simulated frontend-backend workflows by mocking Axios requests for product creation, update, and deletion routes
- Verified correct rendering of form components, loading states, and toast feedback under success and error scenarios, for CRUD operations

**Bug Identification & Resolution**

- Identified and resolved critical logic issues and response inconsistencies:
  - `controllers/productController.js`: replaced incorrect HTTP status codes with proper ones, standardized response formatting for consistent API behavior, and added handling for cases where the target object (e.g., product) does not exist
  - `pages/admin/createProduct.js` & `pages/admin/updateProduct.js`: corrected success and error feedback logic to ensure accurate user-facing messages for each API outcome

**Code Quality Improvements**

- Adopted the http-status-codes package for standardised response mapping across all controllers
- Implemented consistent error-handling patterns and standardised response structures across controllers for consistent API behavior
- Created maintainable test suites following the Arrange–Act–Assert (AAA) pattern for clarity and readability
- Caught and resolved trivial bugs, standardised phrasing and toast messages across components to ensure uniform user experience and message clarity

**Testing Methodology**

- Applied Equivalence Partitioning on both input (request parameters) and output (HTTP status codes, response payloads) when testing all controller functions and components
- Applied output-based testing and state-based testing, verifying that error codes, response data, and object states (e.g., updated product details) accurately reflected expected outcomes
- Guided by Control Flow Testing principles to achieve branch-level coverage across controller logic, particularly testing both success and failure branches
- Utilised mocking techniques (Axios and Mongoose) to simulate backend communication, enabling reliable testing of frontend–backend interactions without relying on live servers

### 7. Github Workflow
Please refer to this [link](/https://github.com/cs4218/cs4218-2510-ecom-project-team017/actions) for group 17's github workflow.

Alternatively, visit https://github.com/cs4218/cs4218-2510-ecom-project-team017/actions to access. 