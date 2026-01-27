

## Plan: Transform to Masjid Management App with Dashboard and 3 Modules

### Overview
Transform the existing Sanda Donation app into a comprehensive Masjid Management App with:
- A **Dashboard** (home screen with summary cards)
- **3 Clear Modules**: Sanda Donation, Data Collection, Baithul Zakat

---

### Database Changes Required

#### New Tables to Create

**1. `families` table** - For Data Collection module
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| family_name | text | Head of family name |
| address | text | Family address |
| phone | text | Contact phone |
| root_no | text | Root number (Root-1 to Root-6) |
| total_members | integer | Number of family members |
| notes | text | Additional notes |
| created_at | timestamp | Record creation time |

**2. `family_members` table** - Individual family members
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| family_id | uuid | Foreign key to families |
| name | text | Member name |
| age | integer | Age |
| gender | text | Male/Female |
| relationship | text | Relationship to head (e.g., Wife, Son, Daughter) |
| occupation | text | Job/Occupation |
| created_at | timestamp | Record creation time |

**3. `zakat_transactions` table** - For Baithul Zakat module
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | text | "collection" or "distribution" |
| amount | numeric | Transaction amount |
| date | date | Transaction date |
| recipient_name | text | Name (for distribution) |
| donor_name | text | Name (for collection) |
| purpose | text | Purpose/reason |
| method | text | Cash/Bank Transfer/Cheque |
| notes | text | Additional notes |
| created_at | timestamp | Record creation time |

---

### Application Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        MASJID MANAGEMENT APP                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     DASHBOARD (Home)                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │   │
│  │  │   Sanda    │  │    Data    │  │   Baithul Zakat    │  │   │
│  │  │ Donation   │  │ Collection │  │                    │  │   │
│  │  │ Summary    │  │  Summary   │  │     Summary        │  │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MODULE NAVIGATION                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │   │
│  │  │   Sanda    │  │    Data    │  │   Baithul Zakat    │  │   │
│  │  │  Module    │  │  Collection│  │      Module        │  │   │
│  │  │            │  │   Module   │  │                    │  │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### File Changes

#### 1. Create New Component Files

| File | Purpose |
|------|---------|
| `src/components/Dashboard.tsx` | Main dashboard with 3 summary cards |
| `src/components/modules/SandaDonation.tsx` | Existing sanda functionality (refactored) |
| `src/components/modules/DataCollection.tsx` | Family data collection module |
| `src/components/modules/BaithulZakat.tsx` | Zakat collection/distribution module |
| `src/hooks/useDashboardStats.ts` | Hook for fetching dashboard statistics |

#### 2. Modify Existing Files

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Restructure to show Dashboard + Module navigation |
| `src/components/Header.tsx` | Update title to "Masjid Management" |
| `src/integrations/supabase/types.ts` | Auto-generated after DB migrations |

---

### Dashboard Design

#### Summary Cards Layout

**Card 1: Sanda Donation**
- Current month total collection (auto-calculated from `donations` table)
- Number of members paid this month
- Number of members pending this month

**Card 2: Data Collection**
- Total families registered (count from `families` table)
- Total individuals count (count from `family_members` table)

**Card 3: Baithul Zakat**
- Total collected (sum of `zakat_transactions` where type = 'collection')
- Total distributed (sum of `zakat_transactions` where type = 'distribution')
- Remaining balance (collected - distributed)

---

### Module Details

#### Module 1: Sanda Donation (Existing - Refactored)
- Existing donor management functionality
- Existing donation recording functionality
- Public lookup feature remains unchanged
- Receipt generation continues to work

#### Module 2: Data Collection (New)
- Add/Edit/Delete families
- Add/Edit/Delete family members within each family
- View family list with member counts
- Search by family name or root number

#### Module 3: Baithul Zakat (New)
- Record Zakat collections (from donors)
- Record Zakat distributions (to recipients)
- View transaction history
- Filter by type (collection/distribution)
- Balance tracking

---

### Navigation Flow

```text
Home Screen (Dashboard)
    │
    ├── Summary Cards (read-only stats)
    │
    └── Module Cards (clickable)
         │
         ├── Sanda Donation ──→ Donor Management, Donation Recording
         │
         ├── Data Collection ──→ Family Management, Member Management
         │
         └── Baithul Zakat ──→ Collections, Distributions, Balance
```

---

### Implementation Steps

**Step 1: Database Setup**
- Create `families` table with RLS policies
- Create `family_members` table with RLS policies
- Create `zakat_transactions` table with RLS policies

**Step 2: Create Dashboard Component**
- Build `Dashboard.tsx` with 3 summary cards
- Create `useDashboardStats.ts` hook for data fetching
- Auto-calculate all statistics from database

**Step 3: Refactor Sanda Module**
- Extract existing sanda logic into `SandaDonation.tsx`
- Keep all current functionality intact

**Step 4: Build Data Collection Module**
- Create `DataCollection.tsx` component
- Family CRUD operations
- Family member CRUD operations
- Search and filter capabilities

**Step 5: Build Baithul Zakat Module**
- Create `BaithulZakat.tsx` component
- Collection recording
- Distribution recording
- Balance calculation
- Transaction history view

**Step 6: Update Home Page**
- Integrate Dashboard as main view
- Add module navigation
- Keep public "Check Sanda" tab functional

---

### Technical Notes

**RLS Policies Pattern:**
- All new tables use existing `has_role()` function for admin access
- Public can view specific data (similar to donors table pattern)

**State Management:**
- Use existing patterns (useState, useEffect)
- React Query for data fetching where applicable

**UI Components:**
- Reuse existing UI components (Card, Button, Dialog, etc.)
- Maintain consistent styling with current design
- Mobile-responsive layout

---

### Summary

| Item | Count |
|------|-------|
| New database tables | 3 |
| New components | 5 |
| Modified files | 2 |
| Modules | 3 |

This plan keeps the app simple, private (admin-only access for management), and accurate (all calculations from database).

