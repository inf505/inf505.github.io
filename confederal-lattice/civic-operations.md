# Civic Operations — The Unsexy Plumbing

**Purpose:** Cover the operational mechanics every other file assumes but none specifies: counting people, running elections, keeping contracts alive through a currency change, absorbing existing prisoners and lawsuits, and issuing travel documents.

**Core principle:** _Continuity by default. Nothing lapses because the federal layer vanished. Counties inherit the operational functions; the rules are simple, published, and local._

---

## 1. Census & Apportionment

### 1.1 Why It's Needed

- House size = cube-root of population (constitution.md Art III §2) → requires a population count.
- County formation/boundary changes → requires resident counts.
- Compact assessments (per capita) → requires counts.
- LVT is land-based (no census needed), but consumption tax revenue sharing and mutual premiums use population.

### 1.2 The County Census (Every 5 Years)

| Element         | Design                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**   | County clerk (not a federal bureau).                                                                                                |
| **Method**      | Administrative records first (residency credentials, utility accounts, school enrollment, voter rolls), then door-to-door for gaps. |
| **Unit**        | Usual residence (same as old census).                                                                                               |
| **Privacy**     | Count only. No citizenship question. No demographic detail beyond age/sex for apportionment.                                        |
| **Publication** | County-level totals public. Block-level data aggregated (no individual identification).                                             |
| **Challenge**   | Any resident may challenge their count in county court (30 days).                                                                   |

### 1.3 Apportionment (House Seats)

| Step                  | Rule                                                                         |
| --------------------- | ---------------------------------------------------------------------------- |
| **1. National count** | Sum of county censuses (compact-verified).                                   |
| **2. House size**     | Cube root of national population (rounded).                                  |
| **3. Allocation**     | Each state gets seats proportional to population (largest remainder method). |
| **4. Within state**   | County-level multi-member districts (STV), sized by county population.       |
| **5. Redistricting**  | County commissions draw their own district lines (no state legislature).     |

**No federal census. No Census Bureau. No citizenship question. No prison gerrymandering** (prisoners counted at home county, not facility).

---

## 2. Elections Administration

### 2.1 Who Runs Elections

| Level             | Authority                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **County**        | County clerk (elected). All county, state, and federal elections administered at county level.                                                                      |
| **State**         | Coordinates multi-county races (governor, state legislature) and sets election-administration minimum standards (Art II §2.1(c)). No state-run elections otherwise. |
| **Confederation** | None. No federal election authority.                                                                                                                                |

### 2.2 Methods

| Element                | Design                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Voter registration** | Automatic at residency credential issuance. Opt-out allowed.                              |
| **Ballot**             | Paper (primary), with optical scan. No touchscreen-only.                                  |
| **Voting**             | In-person (election day + 2 weeks early), mail (no-excuse), drop box.                     |
| **Districts**          | Multi-member, single transferable vote (STV) for House; single-member for county offices. |
| **Audits**             | Risk-limiting audit (sample of paper ballots) after every election. Public.               |
| **Recounts**           | Automatic if margin <0.5%. Manual if requested by candidate or 1% of voters.              |

### 2.3 Sortition Mechanics (Citizen Juries)

| Element       | Design                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| **Pool**      | All registered voters (or residency credential holders).                         |
| **Selection** | Stratified random sample (age, sex, county).                                     |
| **Service**   | Mandatory (like jury duty) with exemption for hardship. Paid stipend ($100/day). |
| **Term**      | 1 year (audit juries), per-case (trial juries), 3 years (rights ombudsman).      |
| **No repeat** | 5-year cooling-off after service.                                                |

### 2.4 Recall

| Office                  | Petition Threshold     | Vote     |
| ----------------------- | ---------------------- | -------- |
| **County commissioner** | 25% of voters          | Majority |
| **Sheriff**             | 15%                    | Majority |
| **Judge**               | Sortition review (2/3) | —        |
| **State legislator**    | 20% of district        | Majority |
| **Governor**            | 15% statewide          | Majority |

---

## 3. Legal & Contract Continuity (The Redenomination Problem)

### 3.1 The Problem

On Decree Day, the Fed is abolished and legal tender laws are repealed. But millions of private contracts — mortgages, leases, insurance policies, employment agreements, corporate charters — are denominated in **US dollars**. What happens to them?

### 3.2 The Rule: Continuity + Choice

| Contract Type             | Treatment                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Existing contracts**    | **Remain valid**. The unit of account is whatever the parties agreed to (USD, gold, index). No forced conversion.                                                         |
| **USD as a private unit** | USD continues as a _private_ money (like any foreign currency). Banks may hold USD deposits. No legal tender status.                                                      |
| **Payment**               | Debtor may pay in the contract's unit, or in any asset the creditor accepts. If creditor refuses all assets, debtor may deposit with county court (tender) and discharge. |
| **Indexation**            | Parties may index to gold, CPI, or any basket. Courts enforce.                                                                                                            |
| **New contracts**         | Free to choose any unit (USD, gold, county TAN, crypto, foreign currency).                                                                                                |

### 3.3 Bank Deposits

| Element               | Treatment                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Existing deposits** | Remain bank liabilities. Bank may redenominate to gold/coin at market rate (with notice) or keep USD. |
| **Deposit insurance** | FDIC winds down (debt-obligations.md §8.1). County deposit mutuals replace.                           |
| **Withdrawals**       | Bank must honor in the deposit's unit, or in coin at market rate. No bailout if insolvent.            |

### 3.4 Mortgages & Loans

| Element                | Treatment                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Existing mortgages** | Valid. Payable in contract unit. No forgiveness, no modification (unless parties agree). |
| **FHA/VA/Ginnie**      | Guarantees honored (debt-obligations.md §8.2).                                           |
| **New mortgages**      | County- or state-chartered mortgage mutuals (private insurance).                         |

### 3.5 Corporate Charters

| Element                                     | Treatment                                                           |
| ------------------------------------------- | ------------------------------------------------------------------- |
| **Existing charters**                       | Continue under county law (re-charter within 2 years).              |
| **Federal charters** (national banks, etc.) | Convert to county or state charter (regional entities) or dissolve. |
| **No gap**                                  | Operations continue during re-chartering.                           |

### 3.6 Insurance Policies

| Element                | Treatment                                              |
| ---------------------- | ------------------------------------------------------ |
| **Existing policies**  | Valid. Premiums/claims in contract unit.               |
| **Insurer insolvency** | State guaranty fund (compact) covers, then winds down. |
| **New policies**       | County/compact-regulated.                              |

**Bottom line:** _Nothing is voided by the transition. Contracts survive; the unit of account is a private choice; courts enforce; no forced conversion; no bailout._

---

## 4. Existing Federal Prisoners & Pending Cases

### 4.1 Federal Inmates (~150,000)

| Category                  | Disposition                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Violent offenders**     | Transferred to county jail (county of conviction or residence). Sentence continues.                                  |
| **Non-violent offenders** | **Immediate review** by county court: release with time served, or transfer to county jail with restorative program. |
| **Immigration detainees** | Released (no civil detention — border-immigration.md).                                                               |
| **Death row**             | Commuted to life (constitution.md Art VI §2.7 — no death penalty).                                                   |
| **Juveniles**             | Transferred to county juvenile system.                                                                               |
| **Medical/elderly**       | Compassionate release (county court).                                                                                |

**No federal prisons.** Facilities → counties (law-enforcement.md) or demolished.

### 4.2 Pending Federal Cases

| Case Type                   | Disposition                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **Criminal (pre-trial)**    | Transferred to county court (county of offense). Speedy trial clock resets (90 days). |
| **Civil (US as plaintiff)** | Dismissed (no federal plaintiff) unless county/state takes over.                      |
| **Civil (US as defendant)** | Transferred to Transition Trust (debt-obligations.md §7).                             |
| **Appeals**                 | Transferred to State Court of Appeals (compact law) or dismissed.                     |
| **Habeas**                  | County court (judicial-system.md).                                                    |

### 4.3 Existing Judgments

| Judgment       | Treatment                                         |
| -------------- | ------------------------------------------------- |
| **Against US** | Paid by Transition Trust (capped $1M).            |
| **For US**     | Assigned to county/state (or written off).        |
| **Private**    | Enforced by county sheriff (Full Faith & Credit). |

---

## 5. Passports & Travel Documents

### 5.1 County Travel Document (CTD)

| Element         | Design                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| **Issuer**      | County clerk.                                                           |
| **Purpose**     | International travel (replaces US passport).                            |
| **Content**     | Name, photo, county, residency credential number, biometric (optional). |
| **Recognition** | Foreign countries recognize or don't (bilateral). No federal guarantee. |
| **Fee**         | $50 (cost-based).                                                       |
| **Validity**    | 5 years.                                                                |

### 5.2 Visa-Free Travel (Compact)

- **Sponsorship Recognition Compact** (border-immigration.md §9.1): CRC holders travel freely among member counties.
- **International**: County-to-county pacts (sister regions). No federal visa waiver program.

### 5.3 No Federal Passport Agency

- **State Dept passport office abolished**.
- **No REAL ID**. No federal ID standard.

---

## 6. Records & Archives Continuity

| Record Type                                | Disposition                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Federal records**                        | Transferred to counties (where created) or state archives. No NARA.                            |
| **Court records**                          | County clerk (judicial-system.md).                                                             |
| **Land records**                           | State registry (constitution.md Art II §2).                                                    |
| **Vital records** (birth, death, marriage) | County clerk.                                                                                  |
| **Classification system**                  | **Abolished** (agorist-solutions.md Item 6). All records public unless sealed by county judge. |
| **Digital records**                        | Federated, county-hosted (no central database).                                                |

---

## 7. Timeline

| Year  | Milestone                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | Decree. Contract continuity rule published. Federal prisoners reviewed. Pending cases transferred.                                                    |
| **1** | First county census. Elections administered under state election-administration minimum standards (Art II §2.1(c)). CTDs issued. Records transferred. |
| **2** | Re-chartering complete. Deposit mutuals operational.                                                                                                  |
| **3** | Second census (verification). Apportionment for first House.                                                                                          |
| **5** | System normal. Census every 5 years. Elections every 2/4.                                                                                             |

---

## 8. Edge Cases

| Question                                                            | Answer                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Contract says "payable in US dollars" and debtor has only gold?** | Pay in gold at market rate; creditor must accept or court tenders.       |
| **Bank refuses to honor USD deposit?**                              | County court order; bank liable.                                         |
| **Prisoner's home county refuses transfer?**                        | County of conviction must accept. If none, state compact assigns.        |
| **Foreign country won't recognize CTD?**                            | Travel via third country or diplomatic arrangement. No federal passport. |
| **Census undercount?**                                              | Challenge in county court; recount. Apportionment adjusts next cycle.    |
| **Election dispute?**                                               | County court (expedited, 7 days). Appeal to State Appeals.               |
| **Sortition juror refuses?**                                        | Contempt (fine), unless hardship exemption.                              |

---

## 9. The Bottom Line

**The transition doesn't void contracts, free prisoners indiscriminately, or leave people stateless.** It:

- **Counts people** (county census, every 5 years).
- **Runs elections** (county clerk, paper ballots, STV, audits).
- **Keeps contracts alive** (continuity + private unit of account).
- **Absorbs prisoners** (county jails, review for non-violent).
- **Transfers cases** (county courts).
- **Issues travel documents** (county CTD).

**No federal census. No federal elections. No federal passport. No federal prison. No federal court docket.** The plumbing is local, and it works.
