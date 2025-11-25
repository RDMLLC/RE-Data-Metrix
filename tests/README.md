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
