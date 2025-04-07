# Xeenux Backend

Backend implementation for the Xeenux MLM platform, a cryptocurrency-based multi-level marketing system.

## Features

- User authentication and management
- MLM structure with binary tree placement
- Multiple income types (ROI, level income, binary income, autopool, weekly rewards)
- Package management with ceiling limits
- Transaction processing
- Admin dashboard and reporting
- Autopool global distribution system
- Automated distribution of incomes

## Technology Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- RESTful API architecture

## Prerequisites

- Node.js (>= 14.0.0)
- MongoDB
- NPM or Yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/xeenux-backend.git
cd xeenux-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Configure environment variables in `.env` file.

5. Initialize database with default settings:

```bash
npm run init-db
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## API Endpoints

The API is organized into the following groups:

- **Auth**: User registration, login, password reset
- **Users**: User profile management, team information
- **Packages**: Available packages, package purchase
- **Income**: Income distribution, withdrawal
- **Transactions**: Deposits, withdrawals, transfers
- **Binary**: Binary tree management, analysis
- **Autopool**: Global autopool system
- **Admin**: System settings, reports, user management

## Scheduled Tasks

The following tasks are scheduled to run automatically:

- Daily ROI distribution
- Daily binary income processing
- Weekly reward distribution

## Income Types

1. **Daily ROI**: 0.5% daily for up to 400 days
2. **Level Income**: 7 levels of referral commissions (5%, 1%, 1%, 1%, 1%, 1%, 5%)
3. **Binary Income**: 10% of the weaker leg volume with daily ceiling limits
4. **Autopool Income**: Global 4x3 matrix with fixed incomes per level
5. **Weekly Rewards**: Rank-based rewards from weekly company turnover

## Project Structure

```
xeenux-backend/
├── config/          - Configuration files
├── controllers/     - API controllers
├── models/          - Mongoose models
├── routes/          - API routes
├── middlewares/     - Express middlewares
├── services/        - Business logic services
├── utils/           - Utility functions
├── cron/            - Scheduled tasks
├── app.js           - Express application setup
└── server.js        - Server entry point
```

## License

This project is proprietary and confidential. Unauthorized copying, distribution, modification, public display, or public performance is strictly prohibited.

## Support

For support, please contact support@xeenux.com