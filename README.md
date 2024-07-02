# Oh Baby Markets

Oh Baby Markets is a betting platform where users can place bets on various markets. Users can deposit and withdraw their BP, and administrators can manage markets by creating, pausing, resuming, and closing them.

## Features

- User Authentication with Google
- Deposit and Withdraw BP
- Place bets on open markets
- View market details and competitor likelihoods
- Administrators can manage markets: create, pause, resume, and close

## Technologies Used

- React
- Firebase
- Node.js
- Express
- MongoDB Atlas
- Heroku

## Live Demo

Oh Baby Markets is currently live at: <a href="https://obb-markets-559dc43643a5.herokuapp.com/" target="_blank">https://obb-markets-559dc43643a5.herokuapp.com/</a>


## Installation

### Prerequisites

- Node.js
- MongoDB Atlas
- Firebase Project

### Backend Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/oh-baby-markets.git
    cd oh-baby-markets
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:

    ```env
    MONGODB_URI=your_mongodb_uri
    FIREBASE_ADMIN_PRIVATE_KEY_ID=your_firebase_admin_private_key_id
    FIREBASE_ADMIN_PRIVATE_KEY=your_firebase_admin_private_key
    FIREBASE_ADMIN_CLIENT_EMAIL=your_firebase_admin_client_email
    FIREBASE_ADMIN_CLIENT_ID=your_firebase_admin_client_id
    FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL=your_firebase_admin_auth_provider_x509_cert_url
    FIREBASE_ADMIN_CLIENT_X509_CERT_URL=your_firebase_admin_client_x509_cert_url
    ```

4. Start the backend server:

    ```bash
    nodemon server.js
    ```

### Frontend Setup

1. Navigate to the `client` directory:

    ```bash
    cd client
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the `client` directory and add the following environment variable:

    ```env
    REACT_APP_APIURL=http://localhost:5000/api
    ```

4. Start the frontend development server:

    ```bash
    npm start
    ```

## Usage

### User Authentication

Users can sign in using their Google account. Upon signing in, a new user is registered in the database if they don't already exist.

### Placing Bets

Users can view available markets and place bets on their preferred competitors. The bet amount is deducted from the user's BP balance.

### Depositing and Withdrawing BP

Users can deposit and withdraw BP by providing their Discord and OBK usernames.

### Managing Markets (Admin)

Admins can create new markets, pause ongoing markets, resume paused markets, and close markets.

## API Endpoints

### User Routes

- `POST /api/users/register`: Register a new user
- `GET /api/users/:uid`: Get user details by UID
- `PUT /api/users/:uid`: Update user details

### Transaction Routes

- `POST /api/transactions/deposit`: Request a deposit
- `POST /api/transactions/withdraw`: Request a withdrawal
- `GET /api/transactions/pending`: Fetch pending transactions
- `PUT /api/transactions/approve/:transactionId`: Approve a transaction
- `PUT /api/transactions/reject/:transactionId`: Reject a transaction

### Market Routes

- `POST /api/markets`: Create a new market
- `GET /api/markets`: Get all markets
- `POST /api/markets/pause/:marketId`: Pause a market
- `POST /api/markets/resume/:marketId`: Resume a market
- `POST /api/markets/close/:marketId`: Close a market
- `GET /api/markets/:marketId`: Get market details by ID
- `POST /api/markets/bet/:marketId`: Place a bet on a market
- `GET /api/markets/transactions/:marketId`: Get bet transactions for a market

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any improvements or new features to add.

## License

This project is licensed under the MIT License.
