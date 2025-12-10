# End-to-End Test Documentation

This document contains test scenarios for critical features. These tests are run using the Playwright-based testing system.

## Property Lookup Feature

### Test 1: Successful Property Lookup
**Purpose:** Verify that valid Zillow/Redfin URLs return property data

**Steps:**
1. Navigate to /deal-analysis
2. Enter a valid Zillow property URL
3. Click the lookup button (data-testid=button-lookup-property)
4. Wait for response (up to 15 seconds)

**Expected Result:**
- Success toast appears with "Property Found" title
- Property details populate in the form (address, beds, baths, price, etc.)

---

### Test 2: Invalid URL Error Handling
**Purpose:** Verify user-friendly error messages for failed lookups

**Steps:**
1. Navigate to /deal-analysis
2. Enter an invalid/non-existent property URL
3. Click the lookup button

**Expected Result:**
- Destructive (red) toast appears with "Property Not Found" title
- Toast description contains user-friendly message (NOT technical errors like "DOCTYPE" or "Unexpected token")

---

### Test 3: URL Validation - Empty Input
**Purpose:** Verify empty URL validation

**Steps:**
1. Navigate to /deal-analysis
2. Leave URL field empty
3. Click the lookup button

**Expected Result:**
- Toast appears asking user to enter a URL first

---

### Test 4: URL Validation - Invalid Domain
**Purpose:** Verify only Zillow/Redfin URLs are accepted

**Steps:**
1. Navigate to /deal-analysis
2. Enter a URL from another site (e.g., https://example.com/property/123)
3. Click the lookup button

**Expected Result:**
- Error message indicating only Zillow or Redfin URLs are accepted

---

## When to Run These Tests

Run property lookup tests after:
- Changes to `server/routes.ts` (property lookup endpoint)
- Changes to `server/services/hasdata-api.service.ts`
- Changes to `client/src/components/deal-analysis/Step1PropertyAddress.tsx`
- Any changes to the API request/response handling

## Test Data Notes

- The HasData API may return actual property data for URLs that seem "fake" if they match real listings
- Tests should focus on verifying the error handling flow, not specific property data
- API rate limits may affect repeated testing

---

## Lender Signup Flow (CRITICAL)

This flow has broken multiple times. It is essential to run these tests after any changes to the lender authentication or routing system.

### Pre-test Setup (Database)

Before running lender signup tests, create a test invite in the database:

```sql
-- Clean up any existing test lender
DELETE FROM loan_products WHERE lender_id IN (SELECT id FROM lenders WHERE email = 'e2e-test-lender@example.com');
DELETE FROM lender_questionnaires WHERE lender_id IN (SELECT id FROM lenders WHERE email = 'e2e-test-lender@example.com');
DELETE FROM lenders WHERE email = 'e2e-test-lender@example.com';

-- Create a fresh test invite
INSERT INTO lenders (id, email, password, company_name, contact_name, referral_amount, referral_type, invite_token, invite_expiry, invite_accepted, archived)
VALUES (gen_random_uuid(), 'e2e-test-lender@example.com', 'temp', 'E2E Test Lending Co', '', 100.00, '$', 'e2e-signup-token-test', NOW() + INTERVAL '7 days', false, false);
```

### Test 1: Happy Path - Complete Signup Flow
**Purpose:** Verify that a lender can sign up and land on Company Info page with populated data

**Steps:**
1. [New Context] Create a new browser context (fresh, no auth)
2. [Browser] Navigate to /lender-signup/e2e-signup-token-test
3. [Verify] Check that signup page loads:
   - Shows "Complete Lender Signup" heading
   - Shows company name "E2E Test Lending Co"
   - Has input fields for Contact Name, Phone, Password, Confirm Password
4. [Browser] Fill in Contact Name field with "Test Contact"
5. [Browser] Fill in Phone field with "555-123-4567"
6. [Browser] Fill in Password field with "TestPass123!"
7. [Browser] Fill in Confirm Password field with "TestPass123!"
8. [Browser] Click the "Complete Signup" button
9. [Browser] Wait up to 5 seconds for the page to change (hard navigation occurs)
10. [Verify] After navigation:
    - URL should contain "lender-company-info"
    - Page should NOT show "Session Expired" message
    - Company Name field should be populated with "E2E Test Lending Co"
    - Email field should show "e2e-test-lender@example.com"

**Expected Result:**
- Signup completes successfully
- Redirects to Company Info page
- Form fields are auto-populated with lender data
- No authentication errors

**Critical Implementation Note:**
The signup flow MUST use hard navigation (`window.location.href = '/lender-company-info'`) instead of client-side routing. This ensures the session cookie is properly attached on the subsequent page load.

---

### Test 2: Invalid Token Handling
**Purpose:** Verify that invalid tokens show appropriate error

**Steps:**
1. [New Context] Create a new browser context
2. [Browser] Navigate to /lender-signup/invalid-token-12345
3. [Verify] Check that error message is displayed:
   - Should show "Invalid or Expired Invitation" message
   - Should NOT show the signup form

**Expected Result:**
- Error page displays clearly
- User is not presented with a form they cannot use

---

### Test 3: Expired Token Handling
**Purpose:** Verify that expired tokens are rejected

**Pre-test Setup:**
```sql
-- Clean up any existing expired test lender first
DELETE FROM loan_products WHERE lender_id IN (SELECT id FROM lenders WHERE email = 'expired-test@example.com');
DELETE FROM lender_questionnaires WHERE lender_id IN (SELECT id FROM lenders WHERE email = 'expired-test@example.com');
DELETE FROM lenders WHERE email = 'expired-test@example.com';

-- Create an expired invite
INSERT INTO lenders (id, email, password, company_name, contact_name, referral_amount, referral_type, invite_token, invite_expiry, invite_accepted, archived)
VALUES (gen_random_uuid(), 'expired-test@example.com', 'temp', 'Expired Test Co', '', 100.00, '$', 'expired-token-test', NOW() - INTERVAL '1 day', false, false);
```

**Steps:**
1. [New Context] Create a new browser context
2. [Browser] Navigate to /lender-signup/expired-token-test
3. [Verify] Check that expired message is displayed:
   - Should indicate the invitation has expired
   - Should NOT show the signup form

**Expected Result:**
- Expired invite is rejected gracefully
- User sees helpful message about expired invitation

---

### Test 4: Already Accepted Token
**Purpose:** Verify that already-used tokens cannot be reused

**Steps:**
1. Complete Test 1 first (accepting the invite)
2. [New Context] Create a new browser context
3. [Browser] Navigate to /lender-signup/e2e-signup-token-test
4. [Verify] Check that "already accepted" message is displayed

**Expected Result:**
- Token cannot be reused
- Clear message indicates invitation was already used

---

## When to Run Lender Signup Tests

**MANDATORY:** Run these tests after ANY changes to:
- `client/src/pages/LenderSignup.tsx`
- `client/src/pages/LenderCompanyInfo.tsx`
- `client/src/pages/LenderLogin.tsx`
- `client/src/App.tsx` (routing changes)
- `server/routes.ts` (lender authentication endpoints)
- Any session/cookie handling code

**Key Regression Points to Watch:**
1. Navigation method must be hard navigation (not client-side routing)
2. Session cookies must be set before redirect
3. All lender routes must be registered in App.tsx
4. Company Info page must handle auth check with retry logic

---

## Rerunning the Test Suite

**Important:** The happy path test (Test 1) consumes the invite token. Before rerunning the entire test suite, you must reset the test data by running the Pre-test Setup SQL again. This will:
1. Delete the previously-created test lender
2. Create a fresh invite token

---

## Quick Regression Checklist

Before deploying changes to lender-related code:

- [ ] Signup page loads with valid token
- [ ] Signup form submits successfully
- [ ] Redirect to Company Info works (no "Session Expired")
- [ ] Company Info form is pre-populated with lender data
- [ ] Invalid/expired tokens show appropriate errors
- [ ] Lender login page exists at /lender-login
- [ ] Password reset flow works for existing lenders
