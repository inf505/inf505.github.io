# Change Log — County-Confederal System

> **File note**: renamed from `edits.md` to `changelog.md` (2026-11-01). Historical entries below reference the filenames in use at the time; only live cross-references were updated.

**Purpose**: A single, durable log of proposed changes to the design corpus. Nothing in the source documents is edited until a change set is marked **AGREED**. This file is the staging area; the source docs stay clean until sign-off.

**Conventions**

- **Status**: `PROPOSED` → `AGREED` → `APPLIED` (or `REJECTED` / `DEFERRED`).
- **Anchors**: Section headings and quoted current text are the durable anchors. Line numbers are as of drafting and will drift after edits.
- **Scope discipline**: Each change set is internally consistent and lists its ripple edits across files. A change set is not "done" until the ripple edits are applied too.

---

## Change Set 1 — State Authority (S-1 … S-7)

**Status**: `APPLIED` — all seven items applied across the corpus on 2026-11-01.
**Requested by**: "Shift the power slightly, giving a bit more authority to the state."

### 1.1 Design intent

The state currently has _coordination_ capacity but almost no _governance_ capacity. That creates three real failures the corpus already half-acknowledges:

1. **Cross-county spillovers** (air, water, fire/seismic safety, election records, disease reporting) have no standard-setter. Counties can externalize harm onto neighbors, and compacts only bind consenting parties.
2. **Multi-county entities** (regional banks, regional mutuals, regional utilities, compact operating companies) have no chartering authority. Only counties can charter, which makes regional institutions legally awkward.
3. **Statewide enforcement gaps** (multi-county organized crime, cross-county public corruption, cross-county environmental crime) fall between county sheriffs and an SBI that is limited to compact-listed interstate crimes.

The shift below gives the state **four bounded competences**, **two procedural powers**, and **two fiscal adjustments** — while preserving county sovereignty, charter opt-out, the county veto, and secession.

### 1.2 Net effect

| Lever                           | Before                                            | After                                                                                  | Direction            |
| ------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| State legislative competence    | None ("cannot tax, regulate, or police directly") | Minimum standards in 5 closed spillover domains; floor-not-ceiling                     | State ↑              |
| State chartering                | Counties only                                     | States may charter multi-county entities with county opt-in                            | State ↑              |
| Governor                        | No veto, no emergency powers                      | Suspensive veto; 30-day coordination emergency; 72-hour Guard deployment               | State ↑              |
| State AG                        | Undefined                                         | Elected by county commissions; narrow statewide grand jury lane                        | State ↑              |
| State appellate courts          | No original jurisdiction, no advisory opinions    | Original jurisdiction over failed compact arbitration; non-binding advisory opinions   | State ↑              |
| State revenue                   | ≤10% of county LVT; simple-majority county veto   | ≤15% LVT; 2/3 revenue veto; surcharge (participating counties, unanimous consent, ≤2%) | State ↑              |
| County veto of **state** acts   | Simple majority, no deadline                      | Simple majority, 90-day window                                                         | State ↑ (procedural) |
| County veto of **federal** acts | Simple majority                                   | Unchanged                                                                              | —                    |
| Interposition                   | 26+ states                                        | 20+ states                                                                             | State ↑              |
| County sovereignty              | Charter, veto, secession                          | Unchanged, plus 60% charter opt-out from standards                                     | —                    |

**Net**: the state becomes a _standard-setter and backstop_, not a general government. Counties keep the presumption of authority, the charter, the veto, and the exit.

---

### S-1 — State minimum standards (floor, not ceiling)

**Why**: The corpus bans unfunded mandates and gives counties all residual power, but it has no mechanism for a county whose pollution, building collapse, election records, or disease outbreak harms its neighbors. Compacts only bind consenting counties. This is the single most defensible state power to add.

**Files**: `constitution.md` (Art II §2, new §2.1, Art II §3, Art VII §1, Art VII §2), `public-finance.md` (§3), `civil-liberties.md` (§3.1), `infrastructure.md` (§1.2), `healthcare.md` (§5.2), `continuity-and-operations.md` (§2.1).

**Current** (`constitution.md`, Art II §2):

> States exercise **only** these powers, delegated by member counties via interstate compact:
>
> - State Guard (defense only, no federalization)
> - Appellate courts (review of county trial courts)
> - Interstate compacts (water, rail, cyber, criminal investigation)
> - Land title registry (statewide recording)
> - Sovereign wealth fund (severance tax, state land revenue)
> - Coordination of county mutual aid (reinsurance, portability)

**Proposed**: add one bullet and a new subsection.

> - **Minimum standards** in five spillover domains only: (a) air and water pollution that crosses a county line; (b) building, fire, and seismic safety; (c) election administration, ballot audit, and records interoperability; (d) court procedure and case-record interoperability; (e) public-health surveillance and reporting to the state compact.

New **Art II §2.1**:

> ### Section 2.1: State Minimum Standards (Floors, Not Ceilings)
>
> 1. **Closed list.** The state may set minimum standards only in the five domains enumerated in §2. Adding a domain requires an amendment under Art V (34 states to call a convention, 38 to ratify). The Council of Counties cannot add a domain by statute.
> 2. **Floor, not ceiling.** A county may adopt a stricter standard. A state standard does not preempt a stricter county standard.
> 3. **Funded or void.** A standard that imposes a net new cost on a county is void unless the state funds it. The state may not require county spending (public-finance.md §6).
> 4. **Charter opt-out.** A county charter may opt out of any minimum standard by 60% referendum. The opt-out is recorded with the state and reviewed every 5 years.
> 5. **Sunset.** Every minimum standard expires in 5 years unless re-adopted by the Council of Counties.
> 6. **Vetoable.** Minimum standards are state acts and are subject to County Veto under Art III §2 (state-act window).

**Current** (`constitution.md`, Art II §3):

> - **Simple majority** for compact administration. **Unanimous consent** for new powers or assessments.

**Proposed**:

> - **Simple majority** for compact administration and minimum standards. **Two-thirds** for new assessments. **Unanimous consent** only for amendments to this Article.

**Current** (`constitution.md`, Art VII §1):

> 1. **This Constitution**
> 2. **County charters** (ratified by residents)
> 3. **State compacts** (ratified by county commissions)
> 4. **Confederation statutes** (passed by Congress, surviving County Veto)
> 5. **County ordinances**
> 6. **State compact regulations**
> 7. **Confederation regulations** (IDCO standards, Mint specs — voluntary)

**Proposed**: insert a new level after state compacts.

> 1. **This Constitution**
> 2. **County charters** (ratified by residents)
> 3. **State compacts** (ratified by county commissions)
> 4. **State minimum standards** (Art II §2.1)
> 5. **Confederation statutes** (passed by Congress, surviving County Veto)
> 6. **County ordinances**
> 7. **State compact regulations**
> 8. **Confederation regulations** (IDCO standards, Mint specs — voluntary)

**Current** (`constitution.md`, Art VII §2):

> - County charter vs. state compact → **County charter prevails** (counties delegate up, not down).
> - State compact vs. Confederation statute → **State compact prevails** (states delegate up, not down).

**Proposed**: add two rules.

> - County charter vs. state minimum standard → **County charter prevails only if it contains a recorded 60% opt-out; otherwise the standard is a floor.**
> - State compact vs. state minimum standard → **the stricter standard governs.**

**Ripple edits**

- `public-finance.md` §3, add a row: `Minimum-standard funding | State must reimburse counties for net new costs of any Art II §2.1 standard. | No reimbursement = standard void.`
- `civil-liberties.md` §3.1: note that minimum standards are state acts and use the state-act veto window (see S-7).
- `infrastructure.md` §1.2: add "A state minimum standard under Art II §2.1 is not a compact and does not create a new level of government."
- `healthcare.md` §5.2: replace "National: **No federal reporting**" with "No federal reporting. State compact reporting may be required under Art II §2.1(e); no federal reporting."
- `continuity-and-operations.md` §2.1: state row becomes "Coordinates multi-county races and sets election-administration minimum standards (Art II §2.1(c)). No state-run elections otherwise."

**Risk**: minimum standards become a backdoor to general state regulation.
**Mitigation**: closed list of five domains; floor-not-ceiling; 5-year sunset; funded-or-void; 60% charter opt-out; county veto.

---

### S-2 — State chartering of multi-county entities

**Why**: The corpus lets counties charter banks, mutuals, utilities, and corporations, but regional entities that operate in several counties have no clean legal home. Compacts coordinate; they do not charter. This is a gap, not a power grab.

**Files**: `constitution.md` (Art II §2), `public-finance.md` (§3), `remaining-systems.md` (COM-01 banking row).

**Current** (`constitution.md`, Art II §2): the six-bullet list quoted in S-1.

**Proposed**: add one bullet.

> - **Charter regional entities** (banks, mutuals, utilities, and compact operating companies) that operate in two or more counties, with opt-in by each participating county commission. Single-county entities remain county-chartered.

**Ripple edits**

- `public-finance.md` §3, add a row: `Regional entity fees | Charter fees and supervisory assessments from state-chartered regional entities. | Must cover supervisory cost; no profit.`
- `remaining-systems.md` COM-01, Banking row: append "State may charter regional banks/credit unions with county opt-in."

**Risk**: regulatory arbitrage (entities shop for the lightest state charter).
**Mitigation**: county opt-in per participating county; single-county entities stay county-chartered; supervisory fees are cost-based, not revenue.

---

### S-3 — Governor: suspensive veto + coordination emergency

**Why**: The Governor currently has no tool to check a bad Council act and no authority to coordinate a cross-county disaster. Both are narrow, reversible, and bounded.

**Files**: `constitution.md` (Art II §4), `defense-lattice.md` (§3), `public-finance.md` (§7).

**Current** (`constitution.md`, Art II §4):

> - **No veto power**. No emergency powers. No pardon power.

**Proposed**:

> - **Suspensive veto**: may return any Council act within 10 days with written reasons. The Council may override by 2/3.
> - **Coordination Emergency**: may declare a coordination emergency for 30 days, renewable once by Council majority. Limited to cross-county disaster response, mutual-aid dispatch, and public-health coordination. May deploy the State Guard for up to 72 hours without county consent; beyond 72 hours requires consent of each affected county commission. May spend only from a pre-funded State Emergency Reserve capped at 2% of the prior year's state budget. **No rights suspension, no business or school closure, no requisition, no curfew.**
> - **No pardon power** (commutation in guard courts-martial requires Council 2/3).

**Ripple edits**

- `defense-lattice.md` §3, Activation: append "Exception: the Governor may deploy the Guard for up to 72 hours under Art II §4 coordination emergency; beyond 72 hours, county consent is required."
- `public-finance.md` §7, State row: append "State Emergency Reserve (≤2% prior-year budget), pre-funded; no borrowing."

**Risk**: emergency powers ratchet into permanent authority.
**Mitigation**: 30-day limit; one renewal; 72-hour Guard limit; pre-funded reserve; no rights suspension; no closures; no requisition; no curfew.

---

### S-4 — State Attorney General + narrow statewide grand jury

**Why**: The corpus references a "State AG" in several places (`law-enforcement.md` §4, `public-finance.md` §11) but never defines the office. Multi-county organized crime, cross-county public corruption, and cross-county environmental crime currently fall between county sheriffs and an SBI limited to compact-listed interstate crimes.

**Files**: `constitution.md` (Art II §4, new §6), `law-enforcement.md` (§4), `public-finance.md` (§11).

**Current** (`constitution.md`, Art II §4): the Governor/Adjutant General bullets quoted in S-3.

**Proposed**: add an AG bullet to §4 and a new §6.

> - **Attorney General**: Elected by joint vote of county commissions (one vote per county, majority), 4-year term, 2 terms max, recallable by Council majority. Represents the state in compact litigation and advises the Council.

New **Art II §6**:

> ### Section 6: Statewide Prosecution (Narrow Lane)
>
> The Attorney General may convene a Statewide Grand Jury and prosecute only:
>
> 1. multi-county organized crime;
> 2. public corruption spanning two or more counties;
> 3. cross-county environmental crimes under Art II §2.1 standards.
>
> Authorization requires either (a) consent of the county district attorney or sheriff in each affected county, or (b) 2/3 vote of the Council of Counties. The Attorney General has **no general police power, no state police force, and no authority over county sheriffs**. The SBI remains limited to compact-listed interstate crimes.

**Ripple edits**

- `law-enforcement.md` §4, add a note: "The State AG's statewide lane (Constitution Art II §6) is separate from the SBI and requires county consent or Council 2/3."
- `public-finance.md` §11, add a term-limits row: `State Attorney General | 2 terms (4 years each) = 8 years max | Council majority recall`.

**Risk**: the AG becomes a state police force.
**Mitigation**: no police force; no authority over sheriffs; consent or Council 2/3; SBI jurisdiction unchanged; three closed crime categories.

---

### S-5 — State appellate original jurisdiction + advisory opinions

**Why**: Inter-county disputes currently dead-end if compact arbitration fails, and the Council has no way to get a legal read on a proposed compact before signing it. Both are narrow procedural additions.

**Files**: `constitution.md` (Art II §5), `judicial-system.md` (§2, §4).

**Current** (`constitution.md`, Art II §5):

> - **No original jurisdiction**. No advisory opinions.

**Proposed**:

> - **Original jurisdiction**: inter-county disputes where compact arbitration fails, and compact interpretation.
> - **Advisory opinions**: non-binding, to the Council of Counties, on the legality of proposed compact provisions.
> - **Appeal as of right** for constitutional questions arising under a state compact; discretionary review otherwise.
> - **No certiorari over county law generally.**

**Ripple edits**

- `judicial-system.md` §2, Procedure: add "Original jurisdiction: inter-county disputes after arbitration fails; advisory opinions to the Council (non-binding)."
- `judicial-system.md` §4: change "No court involvement unless arbitration fails (then → State Court of Appeals for compact interpretation)" to "Arbitration first; if it fails, the State Court of Appeals has original jurisdiction over the compact-interpretation question."

**Risk**: advisory opinions become binding precedent.
**Mitigation**: expressly non-binding; no certiorari over county law generally; appeal as of right limited to constitutional questions under a compact.

---

### S-6 — Revenue: cap 15%, 2/3 veto, dedicated infrastructure surcharge

**Why**: The state is asked to fund the Guard, appellate courts, compacts, the land registry, and now minimum standards, on a base capped at 10% of county LVT. A modest cap increase plus a dedicated, sunsetting infrastructure surcharge gives the state room without creating a general taxing power.

**Files**: `public-finance.md` (§3, §11), `constitution.md` (Art II §3).

**Current** (`public-finance.md`, §3):

> | **County Contributions** | Each county remits **fixed per-capita assessment** to state treasury. Rate set by state legislature, **capped at 10% of county LVT revenue**. | County commission can **veto** increase by majority vote. |

**Proposed**:

> | **County Contributions** | Each county remits **fixed per-capita assessment** to state treasury. Rate set by state legislature, **capped at 15% of county LVT revenue**. | Increase requires **2/3 of county commissions (population-weighted) to veto**. |
> | **State Infrastructure Surcharge** | ≤2% of the county LVT base, dedicated solely to compact capital and maintenance. Requires Council 2/3 + survives County Veto. | Sunsets in 5 years. No general-fund use. |

**Superseded by D-3 (Change Set 3)**: the surcharge now applies only to participating counties and requires their unanimous consent; the "survives County Veto" wording is no longer operative.

**Ripple edits**

- `constitution.md` Art II §3: "Simple majority for compact administration and minimum standards. Two-thirds for new assessments. Unanimous consent only for amendments to this Article."
- `public-finance.md` §11: no change to term limits except the AG row added in S-4.
- `public-finance.md` Summary table, State row: revenue base becomes "County per-capita contributions (≤15% LVT) + state LVT + severance + infrastructure surcharge (≤2%, sunset)."

**Risk**: fiscal pressure on counties; surcharge creeps into general revenue.
**Mitigation**: still capped; 2/3 veto; surcharge dedicated, 2%, 5-year sunset; no borrowing; no income/sales/corporate/property tax.

---

### S-7 — County veto window + interposition threshold

**Why**: This is the actual "power shift," but it is procedural rather than numerical. A state act can currently be nullified at any time by a simple majority of county commissions, which makes state coordination permanently provisional. Adding a 90-day window preserves the simple-majority check while giving state acts a stable footing once the window closes. Federal acts keep the open-ended simple-majority veto.

**Files**: `constitution.md` (Art III §2, Art III §3, Art VI §3), `civil-liberties.md` (§3.1, §3.4), `judicial-system.md` (§2, §7), `agorist-solutions.md` (Item 8, cross-cutting table), `federal-remnant.md` (§2), `README.md` (glossary, key mechanisms).

**Current** (`constitution.md`, Art III §2):

> - **Nullification**: Any act voided by majority of county commissions representing >50% US population (County Veto).

**Proposed**:

> - **Nullification (federal acts)**: Any federal act voided by majority of county commissions representing >50% US population (County Veto). No deadline.
> - **Nullification (state acts)**: Any state act voided by majority of county commissions representing >50% US population, within 90 days of enactment. After 90 days, the state act stands unless repealed by the Council.

**Current** (`constitution.md`, Art III §3):

> - **Enforcement**: None. Relies on voluntary compliance. **Interposition**: 26+ state legislatures may nullify a ruling for their jurisdictions.

**Proposed**: change `26+` to `20+`.

**Current** (`constitution.md`, Art VI §3):

> - **Interposition**: 26+ states nullify federal rights violation.

**Proposed**: change `26+` to `20+`.

**Ripple edits**

- `civil-liberties.md` §3.1: split the process into federal (simple majority, no deadline) and state (simple majority, 90 days).
- `civil-liberties.md` §3.4: `26+` → `20+`.
- `judicial-system.md` §2 and §7: `26+` → `20+`.
- `agorist-solutions.md` Item 8: `26+` → `20+`.
- `agorist-solutions.md` cross-cutting table, County veto row: add the state-act window.
- `federal-remnant.md` §2: `26+` → `20+`.
- `README.md` glossary: update **County veto** and **Interposition**; update the Key Mechanisms table.

**Risk**: weaker accountability for state overreach after the 90-day window closes.
**Mitigation**: federal veto unchanged and open-ended; state acts remain nullifiable by simple majority during the window; Council repeal remains available after it; secession untouched; 60% charter opt-out from standards. Interposition is the remaining open question (see §1.5 #5).

---

### 1.3 Cross-file consistency edits (apply with the change set)

| File                           | Edit                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                    | State row in "The System in One Page": role becomes "Coordination + minimum standards"; funding becomes "Capped county contributions (≤15% LVT) + infrastructure surcharge." |
| `README.md`                    | Key Mechanisms: split **County veto** into federal (no deadline) and state (90-day window); change **Interposition** to 20+.                                                 |
| `README.md`                    | Glossary: update **County veto**, **Interposition**, **Backstops**.                                                                                                          |
| `remaining-systems.md`         | Universal principles: "state = coordination + minimum standards."                                                                                                            |
| `system-gaps.md`               | File map: add `edits.md`.                                                                                                                                                    |
| `public-finance.md`            | Summary table State row; add minimum-standard funding row; add infrastructure surcharge row.                                                                                 |
| `public-finance.md`            | §11 term limits: add State Attorney General.                                                                                                                                 |
| `continuity-and-operations.md` | §2.1 state row: add election-administration standards.                                                                                                                       |
| `healthcare.md`                | §5.2: state compact reporting under Art II §2.1(e), no federal reporting.                                                                                                    |
| `infrastructure.md`            | §1.2: state minimum standards are not compacts; state-chartered compact entities are corporations, not governments.                                                          |
| `defense-lattice.md`           | §3: 72-hour Guard deployment exception.                                                                                                                                      |
| `law-enforcement.md`           | §4: AG statewide lane is separate from SBI.                                                                                                                                  |

### 1.4 What this change set does **not** do

- No state income, sales, corporate, or property tax.
- No state police force; SBI jurisdiction unchanged.
- No general state legislative authority; no state regulation of county internal affairs.
- No state power to suspend Art VI rights.
- No state veto over county secession.
- No state appointment of county officials.
- No state control of county courts.
- No state borrowing.
- No state grants to counties (minimum-standard reimbursement is a reimbursement, not a grant).

### 1.5 Open questions for sign-off

The open decisions from this change set — charter opt-out threshold, AG selection, surcharge rate, interposition level, amendment thresholds, and state charter review — are tracked in **`open-issues.md` §F (OI-39 … OI-45)** so that every open decision lives in exactly one place.

### 1.6 Sign-off

| ID  | Change                                                    | Status    | Notes                                                                                   |
| --- | --------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| S-1 | State minimum standards                                   | `APPLIED` | Closed list; adding a domain requires an Art V amendment.                               |
| S-2 | State chartering of multi-county entities                 | `APPLIED` |                                                                                         |
| S-3 | Governor suspensive veto + coordination emergency         | `APPLIED` |                                                                                         |
| S-4 | State AG + narrow statewide grand jury                    | `APPLIED` |                                                                                         |
| S-5 | State appellate original jurisdiction + advisory opinions | `APPLIED` |                                                                                         |
| S-6 | Revenue cap 15%, 2/3 veto, infrastructure surcharge       | `APPLIED` | Superseded in part by D-3: surcharge is participating counties only, unanimous consent. |
| S-7 | County veto window + interposition                        | `APPLIED` | State acts: simple majority within 90 days. Interposition applied at 20.                |

### 1.7 Applied log

**Date**: 2026-11-01
**Files touched**: `constitution.md`, `public-finance.md`, `judicial-system.md`, `law-enforcement.md`, `civil-liberties.md`, `federal-remnant.md`, `agorist-solutions.md`, `defense-lattice.md`, `infrastructure.md`, `healthcare.md`, `continuity-and-operations.md`, `remaining-systems.md`, `README.md`, `system-gaps.md`, `edits.md`.

**Judgment call applied without a separate vote**: interposition lowered from 26+ to 20+ states, per the instruction to apply the "full set." This is the only item in the set that was still marked open. Reverting it is a one-line change in `constitution.md` (Art III §3, Art VI §3), `judicial-system.md` (§2, §7), `civil-liberties.md` (§3.4), `federal-remnant.md` (§2), `agorist-solutions.md` (Item 8), `public-finance.md` (§11), and `README.md` (glossary).

**Verification**: after applying, grep the corpus (outside this file) for `26+` (should return no interposition references), `10% of county LVT` (should return no state-contribution cap), `No veto power` (should return no Governor clause), and `No original jurisdiction` (should return no state-judiciary clause).

---

## Change Set 2 — Transition Consistency Pass (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: Consistency pass on the new state powers against every Year 0–5 timeline.

### Findings

| #    | Finding                                                                                  | Fix                                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| T-1  | State minimum standards had no start date.                                               | Year 1 adoption; Year 5 re-adoption or lapse; re-adoption cannot add a domain.                                           |
| T-2  | State AG had no start date, but the SBI director is appointed by the AG in Year 1.       | AG elected Year 1 by county commissions; appoints SBI director.                                                          |
| T-3  | Governor suspensive veto / coordination emergency had no start date.                     | Year 1, after the Council of Counties is seated.                                                                         |
| T-4  | State appellate original jurisdiction / advisory opinions had no start date.             | Year 2, when the State Courts of Appeals are seated.                                                                     |
| T-5  | The 90-day county-veto window had no test milestone.                                     | Year 2: first state-act County Veto test.                                                                                |
| T-6  | Interposition 20 had no test milestone.                                                  | Year 3: first interposition at the 20-state threshold.                                                                   |
| T-7  | The 15% cap lived only in `public-finance.md`, so the Year 5 sunset could erase it.      | Promoted to `constitution.md` Art II §3 as a constitutional limit.                                                       |
| T-8  | The state infrastructure surcharge and the Transition Trust levy had no sequencing rule. | Surcharge starts Year 2, capped at 1% during Years 2–5, rises to 2% after the Trust levy sunsets; 5-year sunset from 2%. |
| T-9  | Minimum-standard enforcement was unassigned.                                             | County sheriff enforces within the county; AG handles cross-county violations.                                           |
| T-10 | State AG staffing was unassigned.                                                        | `personnel-transition.md` DOJ row includes the state AG office; Year 1 milestone.                                        |
| T-11 | State minimum standards were not reflected in the sector timelines.                      | Added to infrastructure (Year 1), healthcare (Year 2), continuity/elections (Year 1), border/ports (Year 2).             |
| T-12 | Regional entity chartering was not reflected in financial-infrastructure transfer.       | Fedwire consortium, deposit mutuals, mortgage mutuals, and federal-charter conversion now allow state charters.          |

### Files touched

`constitution.md`, `public-finance.md`, `judicial-system.md`, `law-enforcement.md`, `civil-liberties.md`, `infrastructure.md`, `healthcare.md`, `continuity-and-operations.md`, `border-immigration.md`, `remaining-systems.md`, `README.md`, `personnel-transition.md`, `debt-obligations.md`, `asset-transfer.md`, `edits.md`.

### Residual issue (resolved by Change Set 4)

The state minimum standards are enforced by county sheriffs, but a county that has opted out under Art II §2.1(4) has no duty to enforce the standard. **Change Set 4 (D-4)** closes this: the opt-out no longer shields a county from liability for cross-county harm, and the inter-county enforcement compact now covers Art II §2.1 orders. See below.

---

## Change Set 3 — NotebookLM Discrepancy Fixes (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: Three cross-file discrepancies identified in review.

### Findings

| #   | Discrepancy                                                                                                                                                                                                         | Fix                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | `agorist-solutions.md` Item 9 gave county commissions binding instructions and automatic recall over **Senate** delegates, but Art III §2 makes Senate delegates appointed and recallable by the state legislature. | Instruction rights now apply to **House delegates** (county delegates), recallable by county commission (2/3). Senate delegates remain state-legislature appointed and recallable.                 |
| D-2 | `debt-obligations.md` §9.3 called the infrastructure surcharge a "separate state levy," contradicting `public-finance.md` §3's "share of county LVT, not a separate state levy."                                    | Reworded to "carved-out share of the county-collected LVT base, not a separate state levy."                                                                                                        |
| D-3 | Compact councils require unanimous consent for capital assessments (`infrastructure.md` §1.3), but the state surcharge could fund the same compact capital with Council 2/3 + county veto.                          | Surcharge now applies only to **participating counties** and requires **unanimous consent of their commissions**; non-participating counties pay nothing. The compact unanimity rule is preserved. |

### Files touched

`agorist-solutions.md`, `debt-obligations.md`, `infrastructure.md`, `constitution.md`, `public-finance.md`, `edits.md`.

### Notes

- D-3 also resolves the ambiguity in the old "survives County Veto" wording. Because participating counties must consent unanimously, the county veto is no longer the operative check for the surcharge; the unanimity requirement is stronger.
- The 2/3 Council vote remains the state-level procedural threshold. The unanimity requirement is the county-level consent threshold. Both must be satisfied.

---

## Change Set 4 — Enforcement & Veto Clarifications (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: Three enforcement tensions identified in review.

### Findings

| #   | Tension                                                                                                                                                                                          | Fix                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-4 | An opt-out county could discharge pollution into a downstream county, and the state had no civil compliance or abatement mechanism because minimum standards are floors with protected opt-outs. | Art II §2.1(7): opt-out does not shield cross-county harm. Downstream county/resident may sue in the State Court of Appeals for injunction + damages; judgments enforced under the inter-county enforcement compact, extended to Art II §2.1. AG may seek civil abatement under Art II §6. |
| D-5 | The 90-day County Veto window vs. the 5-year minimum-standard sunset: unclear whether re-adoption restarts the veto clock.                                                                       | Art II §2.1(5) and Art III §2: re-adoption or amendment is a new enactment; the 90-day window restarts.                                                                                                                                                                                    |
| D-6 | The AG could prosecute with 2/3 Council authorization over a sheriff's objection but had no police apparatus to serve warrants or make arrests.                                                  | Art II §6: arrests/warrants remain with the sheriff; if the sheriff refuses, the State Court of Appeals may appoint a special marshal from a cross-deputized sheriff under the inter-county enforcement compact. Refusing sheriff faces personal liability and recall.                     |

### Files touched

`constitution.md`, `civil-liberties.md`, `law-enforcement.md`, `public-finance.md`, `README.md`, `edits.md`.

### Notes

- D-4 preserves the opt-out as a shield against state enforcement while removing it as a shield against neighbor liability. The design principle is "pollution is trespass" (`remaining-systems.md` ENV-01), and this makes that principle enforceable without a state police force.
- D-5 is a clarification, not a new power. It prevents a re-adopted standard from becoming permanently immune to the county veto.
- D-6 keeps sheriff primacy intact: the AG prosecutes, the sheriff polices, and a refusing sheriff is replaced for that specific order by a cross-deputized marshal — not by a state police force.
- **Residual dependency**: The special-marshal mechanism in D-6 depends on at least one county being a member of the inter-county enforcement compact. If no member county is available, the State Court of Appeals order may be unenforceable. This is a deliberate limit: the design has no state police, so enforcement capacity is voluntary. Flagged for stress-testing.

---

## Change Set 5 — Minimum-Standard Funding Mechanics (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: OI-03, the first issue with status `OPEN` in `open-issues.md`: reimbursement obligations could exceed the state's capped revenue, with no measurement rule and no prioritization rule.

### Finding and fix

| #   | Problem                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-7 | "Funded or void" (Art II §2.1(3)) had no cost-measurement rule, no adoption-budgeting rule, and no prioritization rule. The Council could adopt standards the state could not fund, and a land-value crash (OI-10) could strand all of them at once. | Four mechanics added to Art II §2.1(3): (1) annual treasurer certification of net new cost, amortizing one-time costs over the 5-year sunset, subject to the sortition audit; (2) pay-as-you-go adoption — a standard may be adopted or re-adopted only if the same budget act appropriates its certified cost; (3) oldest-first seniority on shortfall, with the unfunded standard lapsing for that year (re-adoption restarts the 90-day county veto window); (4) self-executing nonpayment — no reimbursement within 90 days voids the standard in that county for the following year. The state may satisfy the obligation by providing the function directly instead of reimbursing. |

### Files touched

`constitution.md` (Art II §2.1(3), Art II §5, Art VIII Years 1–2), `public-finance.md` (§3 revenue row, §3 spending row, §3 hard limit 5, §10 Years 1–2), `judicial-system.md` (§2 original jurisdiction), `open-issues.md` (OI-03 status, OI-10 cross-note, status mix), `edits.md`.

### Notes

- The 15% cap stays constitutional and hard. The fix does not raise revenue; it makes overcommitment impossible and gives shortfalls a deterministic outcome (seniority + lapse) instead of discretion.
- Synergy with OI-10: a land-value crash now automatically sheds the newest standards rather than starving the Guard and courts.
- Renumbering §2.1 was avoided so existing references to §2.1(4), (5), and (7) stay valid.
- Reimbursement-certification disputes go to the State Court of Appeals (added to Art II §5 original jurisdiction), keeping the state from being its own judge on certified amounts.
- OI-03 status updated to `MITIGATED`; the numeric test (all five standards vs. available revenue) remains open.

---

## Change Set 6 — Savings Clause for Lapsed/Opt-Out Standards (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: OI-04 (open-issues.md): unclear what happens to pending enforcement, judgments, and reimbursement arrears when a standard lapses, is opted out of, or is voided for nonpayment.

### Finding and fix

| #   | Problem                                                                                                                                                                                                                                                                                  | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-8 | Sunset/opt-out/voidance rules said nothing about accrued matters. Three bad outcomes were possible: (a) pending cases abate, letting violators litigate past a sunset; (b) judgments dissolve with the standard, erasing won remedies; (c) lapse opens a liability vacuum for new harms. | Art II §2.1(8) savings clause, split by conduct timing: (1) pending claims and prosecutions for pre-lapse conduct continue under the standard as it then existed; (2) final judgments survive and are enforced under full faith & credit, with injunctions modifiable (not auto-dissolved) on motion; (3) no new enforcement under the lapsed standard; (4) post-lapse cross-county harm falls to county common law — trespass, nuisance, strict liability — with State Court of Appeals jurisdiction preserved as an inter-county dispute; (5) certified arrears remain state liabilities with seniority. |

### Files touched

`constitution.md` (Art II §2.1(5) cross-ref, new §2.1(8), Art VIII Year 5), `judicial-system.md` (§13 edge case), `civil-liberties.md` (§3.6 surviving-orders note), `open-issues.md` (OI-04 RESOLVED, status mix), `edits.md`.

### Notes

- The savings clause closes the "stall-until-sunset" defense: a violator cannot outlast a standard by litigating slowly.
- It mirrors the corpus's transition logic — contracts, vested IP, and judgments survive; statutes and standards sunset. Standards are prospective obligations, not erasers of accrued rights.
- The common-law floor matters most for OI-01: even where compact enforcement fails, the downstream county retains a trespass/nuisance action — the enforcement-capacity gap remains, but the substantive right does not vanish.
- OI-04 marked `RESOLVED` by explicit design decision (open-issues.md §J); the optional numeric test (no stall-until-sunset defense in a simulated multi-year delay) is recorded in its row.

---

## Change Set 7 — Duty-in-Office Execution (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: OI-01/OI-02 (and OI-30, same root): enforcement authority derived from voluntary compact membership, while the obligations being enforced bind by default.

### Finding and fix

| #   | Problem                                                                                                                                                                                                                                                                                                                                                        | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-9 | Enforcement capacity was opt-in: cross-deputized teams came from compact members, so a non-member (or a region where nobody joined) was judgment-proof in execution — though fully liable on paper. The mismatch: obligations bind by default (Art VI §1 "original, not derivative"; §2.1(7) pierces opt-out for cross-county harm), but remedies were opt-in. | Duty-in-office: a sheriff's duty to execute lawful orders from courts of competent jurisdiction — habeas, warrants, injunctions, including cross-county orders — derives from the office plus the order, not from compact membership. The compact becomes a coordination overlay (rosters, procedures, reimbursement) and remains voluntary as coordination. Scope rule preserves the opt-out: no entry to enforce a standard the county validly opted out of (Art II §2.1(8)); entry to enforce Art VI rights or surviving orders is lawful execution, not invasion. Court-appointed marshals need no compact board vote. |

### Files touched

`constitution.md` (Art II §6 marshal language; Art VI §3 compact bullet rewritten as cross-county execution duty), `civil-liberties.md` (§3.6 gap/mechanism/governance/opt-out rewritten; residual-limit bullet added), `law-enforcement.md` (§1 Patrol jurisdiction amended + new Cross-County Orders row; §4 AG lane; §15 edge case), `open-issues.md` (OI-01, OI-02, OI-30 RESOLVED; status mix; critical path), `README.md` (Key Mechanisms purpose), `edits.md`.

### Notes

- This is the most sovereignty-touching change so far and was adopted deliberately: execution of lawful orders can no longer be blocked by local refusal. Substantive obligations are unchanged — Art VI already bound every county, and §2.1(7) already pierced the opt-out for cross-county harm. What changed is delivery of the remedy.
- "Voluntary coordination" survives where it belongs: the compact as coordination (funding, rosters) is still opt-in. What is not voluntary is a sheriff's refusal to execute a lawful order — and that was already true via personal liability and recall.
- Honest residual, documented in §3.6: a county apparatus can physically resist a cross-deputized team until political backstops move (recall, county veto, interposition, secession). The design has no occupation force by intention. A geographically coherent bloc opting out together is a pre-secession posture; secession is the designed terminal backstop.
- OI-30 resolved by the same root fix — it is OI-01 at broader scope ("captured county" vs. "opt-out county").
- Status mix after this change set: 1 `MITIGATED` · 33 `OPEN` · 7 `DEFERRED` · 4 `RESOLVED`.

---

## Change Set 8 — Corpus Reorganization (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: The file set had grown messy: three meta-files with colliding vocabulary, relative filenames, and a duplicated decision list.

### Actions

1. **Removed** `system-gaps.md` — fully historical (all 23 gaps ✅). Live functions relocated: subsystem ID registry → `README.md` (Meta, "Subsystem ID Registry"); the design-quality checklist for new subsystems → `open-issues.md` §J.
2. **Merged** `items.md` into `agorist-solutions.md` (new "The Problem: 22 Taboos" section) — `agorist-solutions.md` already restated every item; the problem statement now lives with its solutions. `items.md` deleted.
3. **Renamed** four files to content-based names. Historical entries in this log keep the filenames in use at the time; only live cross-references were updated:
   - `edits.md` → `changelog.md`
   - `remaining-systems.md` → `domestic-policy.md`
   - `low-priority-systems.md` → `vestigial-functions.md`
   - `continuity-and-operations.md` → `civic-operations.md`
4. **Deduplicated** §1.5 above → open decisions now tracked only in `open-issues.md` §F.

### Rationale

- "Gaps / issues / edits" was colliding vocabulary across three meta-files; two now do distinct jobs (`changelog.md` = what changed; `open-issues.md` = what's unproven) and the ID registry lives with the rest of the navigation in `README.md`.
- Relative filenames describe status, not content; the new names describe what's in the file.
- Net file count: 22 → 20 (removed `system-gaps.md`, merged and removed `items.md`; renames do not change the count).

---

## Change Set 9 — Pre-Evaluation Sweep & Documentation (Applied)

**Status**: `APPLIED` — 2026-11-01.
**Trigger**: Final quality pass before external evaluation. **No design changes.**

### Sweep findings and fixes

| #   | Finding                                                                                                                                                          | Fix                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| S-1 | Shorthand `Art VI §5` / `§6` references in `law-enforcement.md` (3×) — Art VI has only §1–§3; the enumerated rights live in §2.x                                 | Normalized to `Art VI §2.5` / `§2.6`        |
| S-2 | Dangling `Per Public-Finance.md §15` in `healthcare.md` — public-finance ends at §11; the apprenticeship-charter concept is agorist-solutions.md item 15         | Repointed to `agorist-solutions.md #15`     |
| S-3 | Eight capitalized `Public-Finance.md` references across six files                                                                                                | Normalized to lowercase `public-finance.md` |
| S-4 | Mis-numbered subsections: `healthcare.md` §9.1/§9.2 under section 10; `civic-operations.md` §2.1 under section 3; `personnel-transition.md` §2.1 under section 6 | Renumbered (10.1/10.2, 3.1, 6.1)            |
| S-5 | `federal-remnant.md` §1 cited "(Art III §2)" for federal funding; the assessment authority actually lives in public-finance §4                                   | Repointed to `public-finance.md` §4         |

A full `.md`-reference extraction (grep → uniq) confirmed every live file pointer resolves; the only remaining mentions of removed or renamed files are this log's historical entries (intentional).

### Documentation additions

- `README.md`: version stamp (v1.0, through this change set) + new "For Reviewers" section — what feedback is wanted, deliberate trade-offs, out-of-scope items.
- **Design freeze**: no further design changes until external evaluation returns; new findings go to `open-issues.md`.

### Files touched

`law-enforcement.md`, `healthcare.md`, `border-immigration.md`, `civil-liberties.md`, `infrastructure.md`, `judicial-system.md`, `civic-operations.md`, `personnel-transition.md`, `federal-remnant.md`, `README.md`, `changelog.md`.

---

## Change Set 10 — External Evaluation Corrections, Round 1 (Applied)

**Status**: `APPLIED` — 2026-11-01. **Open for additional findings.**
**Trigger**: External evaluation findings ("Contradictions"), starting with the federal-remnant headcount.

### Findings and fixes

| #   | Finding                                                                                                                                                                                                                                                                               | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-1 | Headcount inconsistency: the enumerated total (Mint 200 + Diplomatic Receipt 12 + IDCO 12 + Governors' Nuclear Council 0) is **224**, but `README.md` (×3), `federal-remnant.md` (summary), and `personnel-transition.md` §2 said "~225" — and the constitution never stated a total. | Canonical number set to **224** everywhere. Constitution Art III §6 now states the total explicitly; `federal-remnant.md` component rows normalized (~12→12, ~200→200) so the sum is exact.                                                                                                                                                                                                                                                                                                                                                                         |
| E-2 | Reported: `vestigial-functions.md` allegedly refers to "~250 civilian employees." **Not found** — a corpus-wide grep for `250` returns no such claim in any file. The evaluator may have worked from an earlier snapshot or misread.                                                  | No edit. Flagged back to the evaluator for the exact quote; if it surfaces, it will be corrected to 224.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E-3 | Reported: `debt-obligations.md` §9.3 "and the summary tables in `public-finance.md`" describe the surcharge as "a separate state levy on the county LVT base."                                                                                                                        | **Already fixed** — Change Set 3 (D-2). Current text in both locations reads "a carved-out share of the county-collected LVT base, not a separate state levy"; the public-finance Summary table lists the surcharge neutrally as a revenue flow with no levy characterization. The reported phrasing matches the pre-CS3 debt-obligations sentence nearly verbatim → the evaluator is reading a pre-Change-Set-3 snapshot. Also clarified the public-finance Summary table row ("carved from county LVT") to pre-empt the flow-vs-levy misreading at summary level. |

### E-4 (appended): Small-claims panels — partially real, two fabricated citations

**Reported**: small-claims disputes described as single "resident judges" or informal mediation panels rather than a formal Art VI §2.4 trial jury — citing `civic-operations.md` §2.2, `judicial-system.md` §1/§6, and `domestic-policy.md` COM-01/Arbitration.

**Verified consistent (no defect)**: `constitution.md` Art VI §2.4 (3–5 resident panel satisfies the jury guarantee); `judicial-system.md` §1 Procedure ("resident panel (3–5 residents), which is a jury for Art VI §2.4 purposes") and §6; the 7-juror rule for >$25k is consistent across constitution, judicial-system, civil-liberties §5.3, and border-immigration §4.1.

**Real defect (fixed)**: `agorist-solutions.md` Item 18 said "Judges = randomly selected residents (like jury duty)" — loose enough to read as a single resident judge, with no panel size and no §2.4 tie. Fixed to "Decided by a resident panel of 3–5 randomly selected residents (like jury duty) — the Art VI §2.4 small-claims jury." The panel size was also made explicit in the `judicial-system.md` §1 Structure table.

**Fabricated citations (no edit)**: `domestic-policy.md` COM-01 contains no arbitration or small-claims content (grep: zero matches); `civic-operations.md` §2.2 is election methods (ballots, STV, audits) — no jury content.

### E-8 (appended): Re-adoption veto window omitted from civil-liberties §3.1 — real omission (fixed)

**Reported**: constitution Art II §2.1(5) and public-finance §10 state that re-adoption restarts the 90-day County Veto window, but `civil-liberties.md` §3.1's state-acts process omits the restart rule.

**Verdict**: **omission, not contradiction** — the constitutional source (Art III §2) already carried the general rule ("Re-adoption or amendment of a state act is a new enactment; the 90-day window restarts," from Change Set 4/D-5). But §3.1 is the enforcement-machinery file where the veto process is specified in detail, and the omission could mislead a reader into treating a re-adopted standard as veto-immune. All three citations in this finding were accurate — the first fully-accurate citation set in the batch.

**Fixed**: §3.1 state-acts bullet now ends "Re-adoption or amendment of a state act is a new enactment — the 90-day window restarts (Art III §2), so re-adopted minimum standards are re-vetoable."

**Deliberately not propagated**: one-line summaries (README key mechanisms/glossary, judicial-system §7, agorist cross-cutting) stay terse — the constitution is the canonical source, and echoing every clause into every summary is how drift started. The rule: detailed process files mirror the constitution; one-line summaries point to it.

### E-5 (appended): "Stale file cross-references" — false

**Reported**: "dozens of citations" in `README.md`, `constitution.md`, `open-issues.md`, and `public-finance.md` still pointing to `remaining-systems.md`, `continuity-and-operations.md`, `low-priority-systems.md`, and `system-gaps.md`.

**Verified (case-sensitive corpus grep)**: **zero** occurrences of any of the four old names in those four files — or in any design file. All 11 occurrences in the corpus are inside this log's historical change-set entries (CS1, CS2, CS4) and the CS8 rename record, which preserve the filenames in use at the time by documented policy (see the file note at the top of this log).

**Likely mechanism**: a RAG-based evaluator ingesting `changelog.md` surfaces its historical filename mentions as if they were live cross-references.

**No edit required.**

### E-6 (appended): Consol terminology — real defect (renamed), fabricated citations

**Reported**: "10-year consols" (debt-obligations §3.3/§9.1, public-finance §6) vs. "perpetual bonds / perpetual consols paying a small coupon (1%)" (debt-obligations §1.3, agorist-solutions Item 1).

**Real defect (fixed)**: a consol is by definition a perpetuity; the corpus used "consol" for a 10-year self-liquidating instrument and even said "Not perpetual" in the same breath. The instrument is renamed **10-year Transition Trust notes (1% coupon)** across all six bond-related occurrences (debt-obligations §3.3 ×2, §9.2, §13, §14, §15; open-issues OI-27), with an explicit "not consols" terminology note at first mention. `public-finance.md` §6 now cross-links its "time-bounded instruments" to the §3.3 definition. **Mechanics unchanged** — coupon, maturity, funding, and sunset are identical.

**Fabricated citations (no edit)**: no "§1.3" exists in debt-obligations (§1 has no subsections); no "perpetual consols/bonds" text exists anywhere (all 8 uses of "perpetual" are "no perpetual liability" negations); agorist-solutions Item 1 contains no consols. Also §9.1 has no consols (§9.2 does), and public-finance §6 never used the word.

### External "Problems" batch (A–D): re-derivations of tracked issues — no edits

Four problem narratives from the external evaluation, all mapping to existing tracker entries. No design changes (freeze holds); verdicts recorded.

| Item                                            | Maps to | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — unenforceable injunction vs. opt-out county | OI-01   | **Partially stale**: describes pre-CS7 mechanics ("relies entirely on the compact", "no authority over the upstream sheriff"). Post-D-9, execution derives from office + court order; any qualified sheriff can be court-appointed; refusal = personal liability + recall. The genuine residual — physical resistance until political backstops move — is documented as intentional (§3.6). OI-01 stays `MITIGATED`.                                                                                                                                       |
| B — reimbursement vs. 15% cap                   | OI-03   | **Stale on mechanism**: CS5 added the exact "missing prioritization rule" (PAYGO adoption + oldest-first seniority + lapse), so "all five voided simultaneously" is no longer possible by rule. The genuinely open question is narrower: adequacy of ≤15% + surcharge against five domains' certified costs (the OI-03 numeric test). OI-03 stays `MITIGATED`.                                                                                                                                                                                             |
| C — surcharge holdout on corridor projects      | OI-09   | **Real, still open, deliberate.** The unanimity requirement (CS3/D-3) is the price of "compacts, not mandates"; the holdout's leverage is real only when its territory is essential to the corridor (re-scoping to exclude a non-essential county remains available). Eminent-domain override is barred by design (ED is county-only). OI-09 stays `OPEN` — recommend accept-as-designed unless a supermajority override is wanted, which would weaken the unanimity firewall.                                                                             |
| D — nuclear launch in degraded C3               | OI-24   | **Real, still open, and the sharpest version of the issue**: the corpus documents deterrent fragility as intentional ("impossible to start and impossible to escalate — at the cost of slow, consensus-bound"), but says nothing about succession, surviving-governor thresholds, or physically unavailable communications. This is a policy decision, not a bug: (a) surviving-majority fallback, (b) pre-delegated release authority, or (c) accept paralysis-in-chaos as coherent no-escalation policy. OI-24 stays `OPEN` pending a deliberate choice. |

**Meta-observation**: all four were already in `open-issues.md` — the tracker's coverage is validated. But A and B describe pre-CS7/pre-CS5 mechanics, indicating the evaluator's retrieval missed the newest change sets even where citations were nominally accurate. The grep-before-fix discipline remains mandatory.

### Documentation counters (housekeeping, no design change)

Four change-set counters were stale relative to this change set. Corrected to "1–10":

| File             | Location                   | Was                           | Now                            |
| ---------------- | -------------------------- | ----------------------------- | ------------------------------ |
| `README.md`      | Meta reading list, item 18 | Change Sets 1–8               | Change Sets 1–10               |
| `open-issues.md` | Purpose line               | after Change Sets 1–4         | after Change Sets 1–10         |
| `open-issues.md` | Companion-files line       | Change Sets 1–8               | Change Sets 1–10               |
| `changelog.md`   | Appendix preamble          | drifted after Change Sets 1–8 | drifted after Change Sets 1–10 |

**Deliberately not changed**:

- `open-issues.md` §A heading "Known residuals from Change Sets 1–7" is **not** stale — that section's entries (OI-01, OI-02, OI-04, OI-30) all trace to D-9 (Change Set 7), so 1–7 is the correct scope for that section.
- The `README.md` version line ("v1.0 (2026-11-01, through Change Set 9)") is intentional: v1.0 froze at Change Set 9, and this change set is post-freeze correction rather than a new design version.

### Files touched

`constitution.md` (Art III §6 total, Art II §4 AG recall, Art II §6 automatic marshal), `README.md` (×3, + For Reviewers warning line, + Meta counter), `federal-remnant.md` (§4 rows, summary), `personnel-transition.md` (§2 rule 5), `agorist-solutions.md` (E-4), `judicial-system.md` (E-4), `civil-liberties.md` (E-8), `debt-obligations.md` (E-6), `public-finance.md` (E-6, + §11 AG recall), `law-enforcement.md` (sheriff bond formula), `open-issues.md` (E-6, + two counters, + OI-40 resolved, + OI-05 resolved, + OI-09 resolved), `changelog.md` (E-4, E-5, E-6, E-8, + Appendix counter).

### Notes

- Design freeze still holds: this is a consistency correction, not a design change.
- **Evaluator reliability pattern**: of the first four findings — E-1 real (fixed); E-2 not found in the corpus; E-3 real but already fixed in Change Set 3; E-4 a real kernel wrapped in two fabricated citations (`domestic-policy.md` COM-01 has no arbitration content; `civic-operations.md` §2.2 is election methods). E-3's phrasing matched the pre-CS3 sentence nearly verbatim, so the evaluation likely ran against a stale snapshot, and the fabricated citations suggest confabulation on top. Recommend re-running against the v1.0 set (version-stamped in `README.md`) and treating every citation as unverified until grepped.
- **Problems batch (A–D)**: all four re-derive issues already tracked in `open-issues.md` (OI-01, OI-03, OI-09, OI-24) — validating tracker coverage. A and B, however, argue against mechanics that Change Sets 7 and 5 already superseded, confirming that the evaluator's retrieval lags the newest change sets.
- Additional external findings will be appended to this change set as they arrive; each will be verified against current text before any edit.
- **Freeze lifted** (post-CS10): design freeze removed; design changes now permitted. `README.md` version stamp remains at v1.0 (2026-11-01, through Change Set 9); new design work will be tracked in subsequent change sets or appended to CS10 as appropriate.

---

## Change Set 11 — Post-Freeze Design Work (Applied)

**Status**: `APPLIED` — 2026-11-03.
**Trigger**: Design freeze lifted after external evaluation round 1. This set records the design changes made afterward: small-county capacity, rogue-sheriff enforcement, bond affordability, and county-count generalization.

### Design changes

| #    | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | **Small-county consolidation offer.** A county under 10,000 population, or one unable to staff a sheriff, court, and commission for 2 consecutive years, receives an automatic consolidation offer from the State Council — the largest contiguous county within the same state. Contiguous small counties may also jointly consolidate into one county. Requires commission consent + majority referendum in each affected county (Art I §4). Voluntary; no merger is forced.            | `constitution.md` Art IV §3; `changelog.md` O-6; `open-issues.md` OI-45                                                                                                                               |
| D-2  | **Contiguous-only consolidation.** Consolidation and boundary adjustment are limited to contiguous counties.                                                                                                                                                                                                                                                                                                                                                                              | `changelog.md` O-6; `open-issues.md` OI-45                                                                                                                                                            |
| D-3  | **Automatic marshal on refusal.** If a sheriff refuses to execute a lawful order under Art VI, Art II §2.1, or Art II §6 for 72 hours, the State Court of Appeals **shall** automatically appoint a special marshal from any qualified sheriff of another county. The refusing sheriff forfeits bond, faces personal liability, and is subject to immediate recall. Judicial trigger; no executive enforcement apparatus.                                                                 | `constitution.md` Art II §6                                                                                                                                                                           |
| D-4  | **Sheriff bond formula.** Replaced the flat $500k bond with 10% of the county's prior-year LVT revenue, minimum $50k, maximum $500k — so small/poor counties are not priced out of the office. Other officials keep fixed bonds ($50k–$250k).                                                                                                                                                                                                                                             | `law-enforcement.md` §1; `civil-liberties.md` §3.3; `open-issues.md` OI-32                                                                                                                            |
| D-5  | **County-count generalization.** Hardcoded "3,143" replaced with "all counties" / "one per county" / "all county charters" so the text survives consolidation changing the count.                                                                                                                                                                                                                                                                                                         | `README.md`, `agorist-solutions.md`, `constitution.md`, `domestic-policy.md`, `open-issues.md`, `public-finance.md`, `healthcare.md`, `infrastructure.md`, `judicial-system.md`, `law-enforcement.md` |
| D-6  | **Registry completion.** Added `DEF-01 Defense & Military Replacement` → `defense-lattice.md` (the only design file without an ID); renamed `OPS-01` from "Continuity & Operations" to "Civic Operations" to match the CS8 file rename.                                                                                                                                                                                                                                                   | `README.md`                                                                                                                                                                                           |
| D-7  | **Consistency pass.** Marshal scope aligned to `civil-liberties.md` §3.6 (Art VI / §2.1 / §6; any qualified sheriff); consolidation now cross-references Art I §4 commission consent; status arithmetic corrected after OI-40 resolution; severity table's decision row relabeled `DECISIONS`.                                                                                                                                                                                            | `constitution.md`, `civil-liberties.md`, `open-issues.md`, `README.md`                                                                                                                                |
| D-8  | **Nuclear launch surviving-majority fallback (upgraded).** Added two-thirds majority of surviving governors as fallback launch authority if governors are unreachable due to decapitation/comms failure. Council maintains verified-alive registry updated quarterly. **Upgraded per external review**: added cryptographic proof-of-life ping (30-min window), explicit denominator shift (50→N), explicit trigger (confirmed nuclear strike), monthly protocol testing. Resolves OI-24. | `constitution.md` Art III §6; `defense-lattice.md` §1; `open-issues.md` OI-24                                                                                                                         |
| D-9  | **Equity-driven transition levy (voluntary).** High-income/high-wealth payers may opt to direct their transition levy into newly chartered county mutuals (infrastructure, water, energy) in exchange for proportional equity stakes. Turns a punitive levy into productive seed capital and aligns wealthy interests with local infrastructure success.                                                                                                                                  | `debt-obligations.md` §3.4; `public-finance.md` §10                                                                                                                                                   |
| D-10 | **Phased opt-in debt swap for retail holders.** Before the haircut, retail Treasury holders (≤$500k/household) may swap face value for county LVT credits, county TANs, or 10-year Trust notes at par. Window Years 0–2; institutional holders excluded. Anchors liquidity locally and creates immediate demand for county revenue instruments.                                                                                                                                           | `debt-obligations.md` §3.5; `public-finance.md` §10                                                                                                                                                   |

### Decisions closed

- **OI-05** — AG recall aligned to the electing body (county commission majority). Constituency mismatch eliminated; Council keeps the 2/3 prosecution-authorization gate (Art II §6).
- **OI-09** — surcharge holdout accepted as designed; the unanimity firewall is load-bearing.
- **OI-40** — AG selection: county commissions (one vote per county), now consistent with the OI-05 recall fix.

### Files touched

`constitution.md`, `defense-lattice.md`, `law-enforcement.md`, `civil-liberties.md`, `README.md`, `agorist-solutions.md`, `domestic-policy.md`, `public-finance.md`, `debt-obligations.md`, `healthcare.md`, `infrastructure.md`, `judicial-system.md`, `open-issues.md`, `changelog.md`.

### Notes

- All changes are voluntary-preserving: consolidation requires commission consent + referendum; the marshal trigger is judicial, not executive; the bond formula scales rather than mandates.
- External review items **not** adopted: mandatory administrative pooling and inverse-LVT SWF seeding (would break the no-redistribution firewall); **automatic** economic quarantine of rogue counties (would create a central enforcement trigger); staggered legal-tender phase-out and a federal Stability Corps (would create a permanent transition state). **Adopted**: decentralized economic containment (border-level CRC suspension, clearinghouse freeze, compact severance, transit blockade) as primary escalation in inter-county enforcement compact; compact expulsion (2/3 board vote) as secondary escalation. Both are decentralized, voluntary, and use existing compact/border authorities — no central trigger. Rationale recorded in the session discussion; the design's cold-turkey Vanish Protocol stands.
- **Economic transition (external review #3)**: adopted both voluntary mechanisms — the equity-driven transition levy (D-9) and the phased opt-in debt swap for retail holders (D-10). Both are opt-in, use existing county instruments (mutuals, LVT credits, TANs, Trust notes), and reduce capital-flight incentives without creating a new federal program. The punitive haircut remains the default for institutional holders and non-participating retail holders.
- `open-issues.md` remains the queue. Critical path unchanged: OI-14, OI-27, OI-28.

---

## Optional Add-Ons (not in the core set)

These are real levers for state authority, but each is either larger than "slight" or cuts against a load-bearing county protection. Listed so the decision is explicit.

| ID      | Change                                                                                                                                                                                                                                                                                                       | Effect                                            | Recommendation                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **O-1** | SWF may make market-rate loans to counties and hold equity in compact infrastructure                                                                                                                                                                                                                         | State becomes a lender/investor, not a grantor    | **Adopt if** you want state capacity without taxation. Low risk.                                                     |
| **O-2** | Narrow equalization fund for compact infrastructure only                                                                                                                                                                                                                                                     | Breaks the "no state → county grants" firewall    | **Defer.** This is the firewall that keeps the state from becoming a redistributive government.                      |
| **O-3** | State minimum education standards (civics, graduation)                                                                                                                                                                                                                                                       | State sets a floor in K–12                        | **Defer.** Education is the most culturally contested domain; keep it county.                                        |
| **O-4** | State licensing registry for high-risk occupations                                                                                                                                                                                                                                                           | State registry + minimum safety standards         | **Defer.** Conflicts with the apprenticeship/universal-recognition design.                                           |
| **O-5** | Amendment thresholds: 34 → 30 states to call a convention; 38 → 34 to ratify                                                                                                                                                                                                                                 | Makes the state layer the dominant amendment path | **Defer.** Bigger than "slight"; revisit after S-1…S-7 are stress-tested.                                            |
| **O-6** | State Council may initiate county consolidation/boundary adjustment (contiguous counties only), subject to county referendums; automatic offer for counties <10,000 pop or unable to staff for 2 yrs (**to largest contiguous county within same state**; contiguous small counties may jointly consolidate) | State gains agenda-setting power over boundaries  | **Adopt if** administrative fragmentation becomes a stated concern.                                                  |
| **O-7** | Losing state gets a 90-day negotiation period on county exit (not a veto)                                                                                                                                                                                                                                    | Procedural courtesy, no substantive check         | **Adopt.** Cheap, reduces friction, preserves exit.                                                                  |
| **O-8** | State Court of Appeals may review a county charter for Art VI conformity on petition by 3 counties or the AG                                                                                                                                                                                                 | State gains a rights-enforcement backstop         | **Defer.** The inter-county enforcement compact already covers this; adding state review weakens county sovereignty. |

---

## Appendix — Anchor Index

Durable anchors for the edits above. Section headings are the durable anchors; line numbers are from the original drafting and have drifted after Change Sets 1–11. Use the headings, not the numbers.

| File                   | Section                                  | Original line (pre-edit) |
| ---------------------- | ---------------------------------------- | ------------------------ |
| `constitution.md`      | Art II §2 State Powers                   | L54–64                   |
| `constitution.md`      | Art II §3 State Legislature              | L65–70                   |
| `constitution.md`      | Art II §4 State Executive                | L71–76                   |
| `constitution.md`      | Art II §5 State Judiciary                | L77–82                   |
| `constitution.md`      | Art III §2 Congress / Nullification      | L100–107                 |
| `constitution.md`      | Art III §3 Supreme Court / Interposition | L108–115                 |
| `constitution.md`      | Art VI §3 Remedies                       | L228–237                 |
| `constitution.md`      | Art VII §1 Hierarchy                     | L242–251                 |
| `constitution.md`      | Art VII §2 Conflict Resolution           | L252–257                 |
| `public-finance.md`    | §3 State Revenue                         | L59–67                   |
| `public-finance.md`    | §3 State Hard Limits                     | L78–84                   |
| `public-finance.md`    | §6 Firewalls                             | L130–141                 |
| `public-finance.md`    | §7 Crisis Finance                        | L145–154                 |
| `public-finance.md`    | §11 Term Limits                          | L207–223                 |
| `judicial-system.md`   | §2 State Appellate Courts                | L40–68                   |
| `judicial-system.md`   | §4 Inter-County Disputes                 | L96–112                  |
| `judicial-system.md`   | §7 Structural Remedies                   | L186–191                 |
| `law-enforcement.md`   | §4 SBI                                   | L97–128                  |
| `civil-liberties.md`   | §3.1 County Veto                         | L152–158                 |
| `civil-liberties.md`   | §3.4 Interposition                       | L181–187                 |
| `federal-remnant.md`   | §2 Supreme Court                         | L19–27                   |
| `agorist-solutions.md` | Item 8                                   | L58–63                   |
| `agorist-solutions.md` | Cross-cutting table                      | L171–180                 |
| `defense-lattice.md`   | §3 County Militia / Activation           | L28–36                   |
| `infrastructure.md`    | §1.2 Compact Rules                       | L19–24                   |
| `healthcare.md`        | §5.2 Disease Surveillance                | L176–180                 |
| `civic-operations.md`  | §2.1 Who Runs Elections                  | L42–47                   |
| `README.md`            | System in One Page                       | L~120                    |
| `README.md`            | Key Mechanisms                           | L~130                    |
| `README.md`            | Glossary                                 | L~150                    |
