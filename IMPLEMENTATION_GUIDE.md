# Two-Step User Flow Implementation Guide

## Overview
This implementation adds a 24-hour free trial followed by a €4.99 preorder requirement for full access to the platform.

## Features Implemented

### 1. Free 24-Hour Trial
- **Automatic Activation**: Trial starts when user signs up or logs in
- **Full Access**: Users have unlimited access to all features during trial
- **Trial Tracking**: Trial start time stored in user record
- **Expiration Check**: System automatically checks if trial has expired

### 2. Preorder Landing Page
- **Value Proposition**: Clear benefits and features explained
- **Payment Integration**: Stripe payment processing
- **Promo Code Support**: Built-in promo code validation (LAUNCH20, FOUNDER, BETA)
- **Price Display**: Shows original price and discounted price if promo code applied

### 3. Payment Processing
- **Stripe Integration**: Secure payment capture using Stripe Elements
- **Payment Confirmation**: Backend verifies payment before granting access
- **Preorder Tracking**: All preorders stored in Google Sheets "Preorders" tab

### 4. Confirmation Page
- **Success Message**: Clear confirmation of preorder
- **Next Steps**: Explains what happens next
- **Social Sharing**: Easy sharing to Twitter, Facebook, LinkedIn, WhatsApp

### 5. Admin Dashboard
- **Trial Metrics**: Track signups and conversions
- **Preorder Tracking**: Monitor preorder status and payments
- **User Analytics**: View user growth and engagement

## Setup Instructions

### 1. Install Dependencies
```bash
cd client
npm install
```

This will install:
- `@stripe/stripe-js` - Stripe frontend SDK
- `@stripe/react-stripe-js` - React components for Stripe

### 2. Environment Variables

#### Server (server/.env)
```env
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional: for webhook handling
```

#### Client (client/.env)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key
```

### 3. Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add them to your `.env` files (see above)
4. Test with Stripe test cards: https://stripe.com/docs/testing

### 4. Google Sheets Setup
The "Preorders" sheet will be automatically created when you first run the server. It includes:
- userId
- userEmail
- paymentIntentId
- amount
- promoCode
- status
- createdAt
- updatedAt

## User Flow

### New User Signup
1. User visits `/profile`
2. Enters name (optional), email, and password
3. Clicks "Signup"
4. Trial starts automatically (24 hours)
5. User can browse all activities freely

### Trial Expiration
1. After 24 hours, user's trial expires
2. User is redirected to `/preorder` when trying to access protected pages
3. Profile page shows trial expiration warning

### Preorder Process
1. User visits `/preorder`
2. Sees value proposition and benefits
3. Enters promo code (optional)
4. Enters card information
5. Clicks "Preorder"
6. Payment processed via Stripe
7. Redirected to confirmation page

### After Preorder
1. User has full access to platform
2. Profile shows "Preorder Placed" status
3. User receives confirmation email (if configured)
4. Access granted when platform launches

## API Endpoints

### `/api/preorders/status` (GET)
- Check if user has preordered
- Returns: `{ hasPreordered, preorderDate, preorderId }`

### `/api/preorders/create-payment-intent` (POST)
- Creates Stripe payment intent
- Body: `{ promoCode?: string }`
- Returns: `{ clientSecret, amount, originalAmount, discountApplied }`

### `/api/preorders/confirm` (POST)
- Confirms preorder after successful payment
- Body: `{ paymentIntentId }`
- Returns: `{ success, preorderId, preorderDate }`

### `/api/preorders/validate-promo` (POST)
- Validates promo code
- Body: `{ promoCode }`
- Returns: `{ valid, discount?, amount? }`

### `/api/me` (GET)
- Returns user info with trial status
- Returns: `{ user: { trialStatus, hasPreordered, ... } }`

## Promo Codes
Built-in promo codes:
- `LAUNCH20` - 20% off (€3.99)
- `FOUNDER` - 50% off (€2.50)
- `BETA` - 10% off (€4.49)

To add more, edit `server/routes/preorders.js` in the `validPromoCodes` object.

## Security Considerations
- All payments processed securely through Stripe
- Payment intent IDs verified before granting access
- User authentication required for all preorder endpoints
- Trial expiration checked server-side

## Testing
1. Test trial expiration: Set trial start time to 25 hours ago in database
2. Test preorder flow: Use Stripe test cards
3. Test promo codes: Try all built-in codes
4. Test redirects: Verify expired users redirected to preorder page

## Troubleshooting
- **Stripe not working**: Check environment variables are set correctly
- **Trial not expiring**: Verify `trialStartTime` is set in user record
- **Payment not confirming**: Check Stripe dashboard for payment status
- **Preorder not saving**: Verify Google Sheets permissions

## Next Steps
- [ ] Add email notifications for preorder confirmation
- [ ] Add webhook handling for payment status updates
- [ ] Add refund processing
- [ ] Add analytics tracking for conversion funnel
- [ ] Add A/B testing for preorder page
