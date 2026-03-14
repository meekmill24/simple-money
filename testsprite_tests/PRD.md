# Simple Money - Product Requirements Document

## Product Overview

Simple Money is a task-based earning platform where users complete tasks in "sets" to earn daily commissions. Users can deposit funds via cryptocurrency (USDT, ETH, BTC), progress through VIP levels (LV1-LV6) with increasing commission rates, earn salary bonuses for consecutive daily work, and refer others for referral bonuses.

## Target Audience

- Individuals seeking online earning opportunities
- Users comfortable with cryptocurrency transactions
- People looking for daily task-based income streams

## Core Goals

1. Enable users to deposit funds securely via cryptocurrency
2. Provide a clear task completion system for earning commissions
3. Implement a VIP tier system with progressive rewards
4. Offer daily salary bonuses for consistent participation
5. Support referral programs for user growth
6. Provide transparent transaction and earning records

## Key Features

### 1. Authentication System
- User registration with email/phone verification
- Secure login with session management
- Password recovery functionality
- Profile management (email, phone, wallet, security settings)

### 2. Landing Page
- Hero section with value proposition
- Features overview highlighting earning potential
- VIP levels preview showing commission rates
- Testimonials from successful users
- Clear call-to-action for signup

### 3. User Dashboard (Home)
- Current balance display
- Task progress tracking (sets completed)
- Recent earnings summary
- Quick actions (deposit, withdraw, start tasks)
- VIP level indicator

### 4. Deposit System
- Cryptocurrency deposit (USDT, ETH, BTC)
- QR code generation for wallet addresses
- Deposit history and status tracking
- Minimum deposit requirements per VIP level

### 5. Task/Start System
- Task set completion interface
- Commission calculation per task
- Progress indicators
- Daily task limits

### 6. VIP Levels
- 6 tier system (LV1-LV6)
- Progressive commission rates (0.45% - 1.5%)
- Minimum deposit requirements per level
- Level upgrade tracking

### 7. Salary/Rewards System
- Daily salary bonuses for consecutive work
- First deposit bonuses
- Achievement rewards

### 8. Withdrawal System
- Cryptocurrency withdrawal to user wallet
- Withdrawal history
- Processing status tracking

### 9. Referral/Invite System
- Unique referral codes
- Referral bonus tracking
- Team member display

### 10. Admin Dashboard
- User management
- Deposit/withdrawal approval
- Transaction monitoring
- Task management
- Notification system

## User Flows

### Registration Flow
1. User visits landing page
2. Clicks "Get Started" or "Sign Up"
3. Enters email/phone, password, and referral code (optional)
4. Verifies account
5. Redirected to home dashboard

### Login Flow
1. User visits login page
2. Enters credentials
3. Authenticated and redirected to home
4. Session persisted across browser sessions

### Deposit Flow
1. User navigates to deposit page
2. Selects cryptocurrency type
3. Enters deposit amount
4. Receives wallet address/QR code
5. Completes external transfer
6. Deposit reflected after confirmation

### Task Completion Flow
1. User navigates to start/task page
2. Views available task sets
3. Completes tasks in sequence
4. Commission credited to balance
5. Progress updated

### Withdrawal Flow
1. User navigates to withdrawal page
2. Enters withdrawal amount
3. Confirms wallet address
4. Submits withdrawal request
5. Admin processes request
6. Funds transferred

## Validation Criteria

### Authentication
- [ ] Users can register with valid credentials
- [ ] Users cannot register with duplicate email/phone
- [ ] Login works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Session persists after page refresh
- [ ] Logout clears session properly

### Landing Page
- [ ] All sections render correctly
- [ ] CTAs link to appropriate pages
- [ ] Mobile responsive design
- [ ] Animations play smoothly

### Dashboard
- [ ] Balance displays correctly
- [ ] Task progress shows accurate data
- [ ] Recent activity updates in real-time
- [ ] Navigation works between all pages

### Deposits
- [ ] Wallet addresses generate correctly
- [ ] QR codes are scannable
- [ ] Deposit history shows all transactions
- [ ] Amount validation works

### Withdrawals
- [ ] Withdrawal form validates inputs
- [ ] Balance check prevents over-withdrawal
- [ ] Withdrawal history displays correctly

### VIP System
- [ ] Level requirements display accurately
- [ ] Commission rates match documentation
- [ ] Upgrade paths are clear

### Mobile Experience
- [ ] All pages are mobile responsive
- [ ] Touch interactions work properly
- [ ] Navigation is accessible on mobile

## Technical Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Animations**: Framer Motion, GSAP
- **State Management**: React Context

## Security Requirements

- Secure password hashing
- Session-based authentication
- Protected routes for authenticated users
- Admin-only access controls
- Input validation and sanitization
