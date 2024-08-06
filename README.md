# Messaging Server

A messaging server built with Node.js, MongoDB, and `socket.io`, providing functionalities for user management, message handling, and JWT-based authentication. Real-time communication is supported using `socket.io`.

## Features

- **User Management**
  - Create a user
  - Get all users
  - Search users

- **Messaging**
  - Get all messages
  - Clear messages

- **Authentication**
  - Sign up
  - Log in
  - Log out
  - Refresh token
  - Get connected user

- **Real-time Communication**
  - Supports real-time messaging with `socket.io`

## Prerequisites

- Node.js (>=14.x)
- MongoDB (>=4.x)

## Installation

1. Clone the repository:
    ```sh
    git clone https://https://github.com/mrsmithjsk/messaging
    cd messaging-server
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Set up environment variables:
    Create a `.env` file in the root directory and add the following:
    ```
    MONGODB_URI=mongodb://localhost:27017/messaging
    JWT_SECRET=your_jwt_secret
    PORT=3000
    ```


## Testing

### Running Tests

1. Install development dependencies:
    ```sh
    npm install --save-dev jest supertest
    ```

2. Add a test script to your `package.json`:
    ```json
    "scripts": {
        "test": "jest"
    }
    ```
3. Run tests:
    ```sh
    npm test
    ```