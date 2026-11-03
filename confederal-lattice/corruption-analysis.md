# Corruption Surface Analysis — County-Confederal System

**Purpose**: Map where corruption could take hold in the design, and the friction mechanisms at each layer.

**Status**: Design analysis (not an open issue). Reference for stress-testing and reviewer feedback.

**Companion**: `open-issues.md` (tracks unproven stress items); `constitution.md` (canonical rules).

---

## Corruption Surface Area & Friction by Layer

### 1. County Level (Primary — all sovereign counties)

| Office | Corruption Vector | Friction |
|---|---|---|
| **Sheriff** | Selective enforcement, protection rackets, asset forfeiture abuse | Bond scaled to LVT (10%, min $50k, max $500k); 15% recall petition → majority vote; sortition audit; automatic marshal at 72h refusal; no qualified immunity; body cameras; use-of-force reporting |
| **Commissioners** | Zoning favors, contract steering, budget capture | 3-term limit (12y); 25% recall petition → majority vote; majority referendum for charter changes; county veto power |
| **Judges** | Case fixing, selective rulings | Sortition confirmation; 12y max term; sortition review every 4y; 2/3 removal vote; personal liability bond ($250k) |
| **Clerks** | Recording fraud, credential manipulation | $50k bond; ministerial duties only; sortition audit |
| **Health/Pension Mutuals** | Self-dealing, asset stripping | Member-owned, non-profit, elected boards; state reinsurance pool oversight; portable across counties |

**Systemic friction**: Small jurisdictions = harder to hide; sortition audits = random citizens reviewing everything quarterly; competitive exit = residents can move to adjacent county.

---

### 2. State Level (50 coordination layers)

| Body | Corruption Vector | Friction |
|---|---|---|
| **Council of Counties** (1 delegate/county) | Logrolling, small-county coalition capture | Delegates appointed by commissions, recallable at will; simple majority for acts, 2/3 for assessments, unanimous for surcharge |
| **Governor** | Veto abuse, emergency powers | Elected by Council, 2-term limit, Council majority recall, suspensive veto only (2/3 override), 30-day emergency (renewable once), 72h Guard limit |
| **Attorney General** | Selective prosecution | Elected by commissions (not Council), 2-term limit, commission majority recall, narrow statewide lane only (3 crimes), 2/3 Council auth required |
| **State Court of Appeals** | Judicial activism | 9 judges, Council appointed + sortition confirmed, 12y max, sortition review every 4y, 2/3 removal |
| **State Guard** | Politicized deployment | Adjutant General appointed by Gov + Council confirmed; 72h deployment without consent; beyond 72h = county commission consent |

**Systemic friction**: No taxing power (15% LVT cap, 2/3 veto); no general legislative authority; minimum standards = floors only, 5 domains, 5-year sunset, funded-or-void.

---

### 3. Compacts (Voluntary, specific, terminable)

| Type | Corruption Vector | Friction |
|---|---|---|
| **Infrastructure** (water, rail, grid) | Toll capture, maintenance deferral | Unanimous consent for new assessments; per-mile/acre/strand assessments; terminable by any member |
| **Criminal Investigation** | Information abuse | Limited to compact-listed interstate crimes (kidnapping, counterfeiting, piracy, treason, cross-state cyber) |
| **Mutual Aid** (health, disaster) | Resource hoarding | Per-capita assessments; terminable; no standing HQ |

**Systemic friction**: No compact may create a new level of government; unanimous consent for capital projects; any member can withdraw.

---

### 4. Federal Remnant (224 people)

| Office | Corruption Vector | Friction |
|---|---|---|
| **Mint** (200) | Seigniorage capture, coin debasement | Capped at cost + 2%; no profit center; coin only (gold/silver/copper) |
| **Diplomatic Receipt** (12) | Credential selling | No outgoing diplomacy; only receives credentials |
| **IDCO** (12) | Comms manipulation | Guard comms only; no command authority |
| **Governors' Nuclear Council** (0 staff) | Launch manipulation | 50 governors unanimous; virtual; no staff |
| **Congress** (690, no staff) | Legislative capture | 90-day sessions, single-subject bills, no staff, county veto, interposition at 20 states |

**Systemic friction**: Budget <$60M/yr; no borrowing; no grants; assessments unpaid = no consequence (shell starves).

---

### 5. Transition Trust (10-year wind-down)

| Corruption Vector | Friction |
|---|---|
| Asset sale favoritism | Public auction; proceeds to debt settlement only |
| Note issuance manipulation | 10-year notes, 1% coupon, capped county assessment, sunsets at Year 10 |
| Pension shortfall | Accrued benefits honored; future accrual stops; county DC plans |

**Systemic friction**: No perpetual liability; dissolves at Year 10; residual assets → counties per capita.

---

### 6. Mutuals (Health, Pension, Unemployment, Disability)

| Corruption Vector | Friction |
|---|---|
| Self-dealing by boards | Member-owned, non-profit, democratically governed |
| Asset stripping | Portable across counties; state reinsurance pool oversight |
| Premium manipulation | Income-based, capped at 8% wages (health); 10% split (pension) |

---

## Systemic Anti-Corruption Architecture

| Principle | Implementation |
|---|---|
| **No qualified immunity** | Personal liability + bonds at every level |
| **Sortition over election** | Juries, auditors, classifiers, confirmations — random citizens |
| **Sunset everything** | 5-year expiration unless re-authorized |
| **Competitive exit** | County veto, interposition, secession, move to adjacent county |
| **No central capture point** | No federal police, no standing army, no central bank, no federal agencies |
| **Transparency by default** | Body cameras, public dashboards, sortition audit reports, open courts |
| **Small jurisdictions** | All counties = harder to coordinate corruption at scale |
| **Voluntary coordination** | Compacts, not mandates; terminable by any member |

---

## Residual Vulnerabilities (Tracked in `open-issues.md`)

| Issue | ID | Status | Why It's Hard |
|---|---|---|---|
| Small county capacity | OI-14 | OPEN | If a county can't staff sheriff/court, corruption fills the vacuum |
| LVT assessment capture | OI-16 | OPEN | Who assesses land value? Underassessment = revenue loss |
| Currency market-rate oracle | OI-18 | OPEN | Who sets market rate for obscure assets in crisis? |
| Nuclear launch in degraded C3 | OI-24 | OPEN | 50 governors unanimous; comms down = paralysis |
| Bond affordability | OI-32 | OPEN | Low-income candidates priced out of sheriff bond |
| Re-centralization risk | OI-35 | OPEN | Future Congress claims implied power; will counties veto? |

---

## The Design's Bet

Corruption isn't eliminated — it's **localized, visible, and expensive**. A bad sheriff in one county doesn't become a national problem. The system routes around bad actors rather than trying to perfect them.

The remaining holes are where **local capacity is too thin** (OI-14, OI-16) or where **consensus mechanisms can deadlock** (OI-24). Those are the stress-test items in `open-issues.md`.

---

## Cross-References

- `constitution.md` — canonical rules (Art I–IX)
- `open-issues.md` — stress-test queue (45 items)
- `civil-liberties.md` §3.3, §3.6 — liability, bonds, enforcement compact
- `law-enforcement.md` §1 — sheriff bond, accountability
- `public-finance.md` §11 — term limits, bonds, recall
- `changelog.md` CS11 — post-freeze design work (bond formula, marshal, consolidation)
