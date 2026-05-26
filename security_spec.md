# Security Specification - BIOMATE Firestore Core

## 1. Data Invariants
- **Category Invariant**: Categorical organization names must be at least 3 characters and size <= 100.
- **Product Invariant**: Every catalog/stock product must map to a unique alphanumeric SKU under a valid category ID (or blank if unassigned). Price and costPrice must be positive numbers.
- **Sale Invariant**: A sale cannot have empty client/customer names, negative prices, or quantities.
- **Expense Invariant**: Operating expense amount must be positive, categorised, and have a type of either 'fixo' or 'variavel'.
- **ProductionBatch Invariant**: Quantity produced must be greater than zero, and status must be 'Concluído', 'Em Andamento', or 'Planejado'.
- **Recipe Invariant**: All ingredients must reference valid products.
- **Temporal Invariant**: Created/updated timestamp records should be bound to sever request times where possible.

## 2. The Dirty Dozen Payloads (Malicious attempts)
1. **Anon Write to Products**: An unauthenticated consumer trying to append an expensive entry.
2. **Privilege Escalation on User**: Writing custom claims in client profiles.
3. **Double Insumo Injection**: Trying to create a product item with negative `costPrice` to corrupt margin reporting.
4. **Huge String SKU Attack**: SKU string contains 20,000 characters to break storage budgets.
5. **Foreign Orphaned Sale**: Writing a sale document with an author ID of another user.
6. **Time Spoofing on Sales**: Trying to register a sale with a `createdAt` of the year 2049.
7. **Negative Expense Amount**: Trying to register a negative financial cost (`-1500`) to increase artificial cashflow reports.
8. **Invalid State Skip**: Forcing `productionBatches` status to a non-existent state like `SuperConcluido`.
9. **Junk Character Path Injection**: Using special non-alphanumeric symbols inside Category document IDs to bypass schema filters.
10. **Zero Quantity Sale**: Writing a Sale with `quantity: 0` or negative quantity to bypass decrement calculations.
11. **Malicious Ingredient Price Modification**: Modifying an recipe ingredient's required qty directly via client update.
12. **Clearing Permanent Identity**: Standard updates trying to change immutable original product ID codes.

## 3. Test Verification Plan (firestore.rules.test.ts mockup structure)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Tests validating that each of the Dirty Dozen above correctly returns PERMISSION_DENIED.
```
