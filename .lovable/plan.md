

## Enhanced Lookup Family Record - Complete Family View

### Overview

Enhance the public "Lookup Family Record" form to display comprehensive family information beyond just Sanda payment details. When a family is looked up, the results will show:

1. **Family Details** - Contact info, address, members, occupation
2. **Sanda Details** - Payment history, paid/unpaid months
3. **Baithul Zakat Details** - Zakat transactions (collections/distributions)

### Current State

Currently, when a family is looked up (lines 501-599 of Home.tsx):
- Shows basic family info: Name, Card Number, Phone, Sanda Amount
- After selecting a year: Shows paid months and unpaid months grid
- Does NOT show: Family members, address, WhatsApp, occupation, Zakat status, Zakat transactions

### Data Available for Display

| Data Source | Fields Available |
|-------------|------------------|
| `families` table | family_name, address, phone, whatsapp_no, root_no, occupation, sanda_card_number, sanda_amount, sanda_amount_type, zakat_status |
| `family_members` table | name, gender, age, occupation, relationship (linked via family_id) |
| `donations` table | amount, date, year, months_paid, method (linked via family_id) |
| `zakat_transactions` table | type (collection/distribution), amount, date, purpose, notes (linked via family_id) |

### Implementation Plan

#### 1. Update State in Home.tsx

Add new state variables to store additional lookup data:

```typescript
// Add to existing state
const [familyMembers, setFamilyMembers] = useState<any[]>([]);
const [zakatTransactions, setZakatTransactions] = useState<any[]>([]);
const [donationHistory, setDonationHistory] = useState<any[]>([]);
```

#### 2. Enhance Data Fetching

Modify the `handleCardSelection` function to also fetch:
- Family members from `family_members` table
- Zakat transactions from `zakat_transactions` table
- All donation history from `donations` table

#### 3. New UI Sections (After Family Selection)

Reorganize the results into an accordion or tabbed layout with these sections:

**Section 1: Family Information**
```text
+----------------------------------------+
| Family Information                     |
+----------------------------------------+
| Name: J. M. Marzook                    |
| Card No: 01                            |
| Root: Root-1                           |
| Phone: 0771234567                      |
| WhatsApp: 0771234567                   |
| Address: 299/3, Bulugohathenna         |
| Occupation: Farmer                     |
| Zakat Status: Given / Taker / None     |
+----------------------------------------+
```

**Section 2: Family Members**
```text
+----------------------------------------+
| Family Members (3)                     |
+----------------------------------------+
| Name         | Relation | Gender | Age |
|--------------|----------|--------|-----|
| J. M. Marzook| Head     | Male   | 45  |
| Fatima       | Wife     | Female | 40  |
| Ahmad        | Son      | Male   | 15  |
+----------------------------------------+
```

**Section 3: Sanda Payment Details** (Existing - Enhanced)
```text
+----------------------------------------+
| Sanda Payment Details                  |
+----------------------------------------+
| [Year Selector: 2025]                  |
|                                        |
| Payment Type: Monthly                  |
| Monthly Amount: Rs. 500                |
|                                        |
| [Paid Months Grid] [Unpaid Months Grid]|
|                                        |
| Total Paid (2025): Rs. 3,500           |
+----------------------------------------+
```

**Section 4: Baithul Zakat Details** (New)
```text
+----------------------------------------+
| Baithul Zakat History                  |
+----------------------------------------+
| Status: Zakat Given                    |
|                                        |
| Recent Transactions:                   |
| [+] 10 Dec 2025 - Collection Rs. 5,000 |
| [-] 15 Nov 2025 - Distribution Rs. 2,000|
|                                        |
| Total Given: Rs. 5,000                 |
| Total Received: Rs. 2,000              |
+----------------------------------------+
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Add state for members/zakat, enhance fetch function, add new UI sections with accordion |

### UI Layout

Use Accordion component for collapsible sections that work well on mobile:

```text
[Family Information]        ▼ (expanded by default)
  - Name, Contact, Address, etc.

[Family Members (3)]        ▶
  - Table of members

[Sanda Payment Details]     ▶
  - Year selector
  - Payment grid

[Baithul Zakat History]     ▶
  - Zakat status & transactions
```

### RLS Considerations

The public lookup uses unauthenticated queries. Check RLS policies:

- `families` - Has "Public can view" policy (uses card number filter)
- `family_members` - Currently admin-only; needs a policy for public read by family_id
- `zakat_transactions` - Currently admin-only; needs a policy for public read by family_id
- `donations` - Has "Public can view donations" policy

**Database migration needed** to add public read policies for family members and zakat transactions when querying by family_id.

### Technical Implementation

1. **Add public RLS policies** for `family_members` and `zakat_transactions` tables to allow read access when filtering by family_id

2. **Update handleCardSelection** to fetch all related data in parallel:
   ```typescript
   const [familyResult, membersResult, zakatResult, donationsResult] = await Promise.all([
     supabase.from("families").select("*").eq("sanda_card_number", selectedCardNumber).maybeSingle(),
     supabase.from("family_members").select("*").eq("family_id", familyId),
     supabase.from("zakat_transactions").select("*").eq("family_id", familyId),
     supabase.from("donations").select("*").eq("family_id", familyId),
   ]);
   ```

3. **Create accordion-based UI** with four collapsible sections for organized display

4. **Add summary calculations** for total Sanda paid per year and Zakat given/received totals

