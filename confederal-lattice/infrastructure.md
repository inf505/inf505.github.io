# Infrastructure Coordination System

**Design Principle**: _Infrastructure follows geography, not jurisdiction. Counties coordinate via voluntary compacts. No federal highway trust fund, no FERC, no FCC, no Army Corps. Physical layer = county-owned, compact-operated._

---

## 1. Governance Model: The Compact Layer

### 1.1 Compact Types

| Compact                  | Scope                                                   | Governance                                           | Funding                                |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| **Transport Corridor**   | Highways, rail, pipelines, fiber along defined corridor | County commissions on corridor (1 vote each)         | Per-mile assessments + user fees       |
| **Watershed / Aquifer**  | River basin, aquifer recharge zone                      | County commissions in basin (weighted by withdrawal) | Per-acre-foot fees + LVT surcharge     |
| **Electric Reliability** | Generation, transmission, distribution across counties  | County commissions + generator reps (2:1)            | Ratepayer assessments (postage stamp)  |
| **Digital Backbone**     | Fiber, microwave, satellite ground stations, spectrum   | County commissions + ISP reps (2:1)                  | Per-strand lease + spectrum auction    |
| **Port / Waterway**      | Seaports, inland ports, locks, channels                 | County commissions + terminal operators (2:1)        | Wharfage + throughput fees             |
| **Emergency Mutual Aid** | All-hazards resource sharing                            | All counties in region (1 vote each)                 | Annual dues + deployment reimbursement |

### 1.2 Compact Rules (Constitution Art IV §4)

- **Voluntary**: Counties join/leave per compact terms (typically 90-day notice).
- **Specific**: Single purpose. No mission creep.
- **Terminable**: Any party can withdraw. Assets divided per contribution.
- **No New Government**: Compacts create _coordination_, not a new level of governance. A state minimum standard under Art II §2.1 is not a compact. A state-chartered compact operating entity is a corporation, not a government.
- **County Veto Applies**: Any compact provision violating rights nullified by County Veto.

### 1.3 Compact Council (Per Compact)

- **Composition**: 1 commissioner per member county (+ stakeholders per compact type).
- **Decisions**: Majority for operations. Unanimous for new powers/assessments. The state infrastructure surcharge (public-finance.md §3) is the only state-level funding path, and it requires unanimous consent of participating counties; it does not bypass this rule.
- **Staff**: Minimal (secretariat, engineers, accountants). No police, no taxing authority.
- **Transparency**: All meetings livestreamed. All records public. Open data API.

---

## 2. Transportation: Roads, Rail, Ports

### 2.1 Road Network

| Tier                                 | Owner                               | Manager          | Funding                      | Standards                          |
| ------------------------------------ | ----------------------------------- | ---------------- | ---------------------------- | ---------------------------------- |
| **Local** (driveways, cul-de-sacs)   | County                              | County road dept | LVT + consumption tax        | County charter                     |
| **Collector** (county highways)      | County                              | County road dept | LVT + fuel tax (county)      | State compact (optional)           |
| **Arterial** (inter-county highways) | **Transport Corridor Compact**      | Compact board    | Per-mile assessments + tolls | Compact standards (AASHTO-adapted) |
| **Bridges / Tunnels**                | Compact (if inter-county) or County | Compact / County | Tolls + assessments          | Compact / County standards         |

**No Federal Highway Administration. No Interstate System. No federal gas tax.**

- **Fuel tax**: County-level only (0–$0.50/gal). No state/federal.
- **Tolls**: Electronic, interoperable via compact. No cash. Dynamic pricing for congestion.
- **Maintenance**: Condition-based (sensors + AI). No "worst-first" politics.
- **Expansion**: Only if compact counties unanimously agree + funding secured.

### 2.2 Rail Network

| Segment                    | Owner                       | Operator                       | Funding                           | Coordination                                   |
| -------------------------- | --------------------------- | ------------------------------ | --------------------------------- | ---------------------------------------------- |
| **Class I Mainlines**      | Private (BNSF, UP, CSX, NS) | Private                        | Private                           | **Rail Compact** (safety, dispatching, hazmat) |
| **Shortlines / Regionals** | County / Compact / Private  | Private / Compact              | Revenue + assessments             | Rail Compact                                   |
| **Passenger Corridors**    | Compact                     | Compact / Private (concession) | Fares + assessments + LVT capture | Rail Compact + Transport Corridor Compact      |
| **Right-of-Way**           | Compact (preserved)         | N/A                            | LVT on adjacent land              | Rail Compact                                   |

**Rail Compact** (voluntary, all counties with rail):

- **Safety**: County inspectors (FRA standards adapted). No federal FRA.
- **Dispatching**: Shared platform (open source). Priority: freight = economic; passenger = schedule.
- **Hazmat**: Real-time tracking. County emergency managers notified.
- **Grade Crossings**: County responsibility. Compact funds 50% of upgrades.
- **Abandonment**: County/Compact right of first refusal (railbanking for trail/future).

### 2.3 Ports & Waterways

| Facility         | Owner                                        | Operator                         | Funding                      | Coordination               |
| ---------------- | -------------------------------------------- | -------------------------------- | ---------------------------- | -------------------------- |
| **Seaports**     | Port Compact (counties + terminal operators) | Private (concession)             | Wharfage + rent + throughput | Port Compact               |
| **Inland Ports** | County / Compact                             | Private / County                 | Throughput + assessments     | Transport Corridor Compact |
| **Locks / Dams** | Waterway Compact                             | Compact / State Guard (security) | Commercial user fees         | Waterway Compact           |
| **Channels**     | Waterway Compact                             | Compact (dredging contracts)     | Ad valorem on cargo          | Waterway Compact           |

**Port Compact**:

- **Governance**: 2 county commissioners : 1 terminal operator rep.
- **Security**: County sheriff (port district). No CBP/TSA.
- **Customs**: County sponsorship (see BDR-01). Private brokers.
- **Environmental**: County standards (stricter than federal). Compact monitors.
- **Expansion**: Unanimous compact vote + LVT capture zone.

---

## 3. Digital Infrastructure: Fiber, Spectrum, Mesh

### 3.1 County Fiber Utility (Every County)

- **Ownership**: County (via utility trust).
- **Operation**: County employees OR private concession (competitive bid, 10-year max).
- **Architecture**: **Open access** — any ISP can lease strands (dark fiber) or capacity (lit).
- **Funding**: LVT capture (fiber increases land value) + per-strand lease fees.
- **Standard**: Single-mode, 288-strand minimum backbone. GPON/XGS-PON for last mile.
- **Redundancy**: Dual-homed to 2+ adjacent counties (compact).

### 3.2 Digital Backbone Compact (Multi-County)

| Function                      | Mechanism                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| **Long-haul fiber**           | Compact leases strands from county utilities. Operates as neutral carrier.                      |
| **Microwave / mmWave**        | Compact licenses spectrum (see §3.3). Deploys rural backhaul.                                   |
| **Satellite ground stations** | Compact hosts (Starlink, OneWeb, Kuiper). County gets free capacity for public safety.          |
| **IXPs (Internet Exchanges)** | Compact operates carrier-neutral IXP in each major metro. Peering mandatory for ISPs >10k subs. |
| **DNS / Root**                | Compact operates anycast recursive resolvers. No federal NTIA. Root zone via ICANN (voluntary). |

### 3.3 Spectrum Management (No FCC)

| Band                     | Allocation                 | Mechanism                                                         |
| ------------------------ | -------------------------- | ----------------------------------------------------------------- |
| **<1 GHz** (propagation) | County-licensed (auction)  | County Spectrum Board (commission + sortition). 10-year licenses. |
| **1–6 GHz** (capacity)   | Compact-licensed (auction) | Digital Backbone Compact. Regional licenses.                      |
| **>6 GHz** (Wi-Fi, mesh) | **Unlicensed** (commons)   | No license. Power limits only (county ordinance).                 |
| **mmWave** (24–100 GHz)  | Compact-licensed (auction) | Short-range, high-capacity. Urban only.                           |
| **Satellite**            | **No national allocation** | County/compact negotiates directly with operators.                |

**Spectrum Auctions**: Ascending clock. Revenue → county/compact LVT reduction (not general fund).
**Enforcement**: County sheriff + compact engineers. Direction-finding trucks. Fines = 3x revenue gained.

### 3.4 Mesh & Community Networks

- **County easements**: Public rights-of-way available for mesh nodes (LoRa, Wi-Fi, 900 MHz).
- **No permit** for <1W, <30ft. Registration only (contact info).
- **County seed funding**: $10k/yr for mesh starter kits (libraries, schools, fire stations).
- **Interoperability**: Compact defines common protocols (IPv6, BGP, DNSSEC).

---

## 4. Electric Grid: Generation, Transmission, Distribution

### 4.1 County Electric Utility (Every County)

- **Ownership**: County (via utility trust).
- **Operation**: County employees OR private concession (competitive bid).
- **Structure**: **Vertically integrated** (gen + trans + dist) OR **wires-only** (county choice).
- **Mandate**: Reliability (SAIDI <60 min/yr), affordability (rates ≤ regional median), decarbonization (county target).
- **Rate Setting**: County commission (public hearings). No PUC. No FERC.

### 4.2 Electric Reliability Compact (Multi-County)

| Function                  | Mechanism                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **Transmission planning** | Compact board (2 county : 1 generator). 10-year plan. Eminent domain = county only.   |
| **Generation adequacy**   | Capacity market (county-run auction). Resources bid. Counties procure for peak + 15%. |
| **Real-time operations**  | Compact ISO (independent system operator). Open-source EMS/SCADA. No PJM/MISO.        |
| **Ancillary services**    | Frequency regulation, reserves, black start — procured via auction.                   |
| **Interconnection**       | Standardized (IEEE 1547-adapted). County approves ≤10MW. Compact >10MW.               |
| **Emergency ops**         | Mutual aid (crews, transformers, generation). Reimbursement at cost + 10%.            |

### 4.3 Generation Mix (County Choice, Compact Coordination)

| Source                               | County Role                                         | Compact Role                                 |
| ------------------------------------ | --------------------------------------------------- | -------------------------------------------- |
| **Solar / Wind**                     | Permitting (county). Net metering (county rate).    | Transmission access. Curtailment rules.      |
| **Nuclear**                          | County hosts (if willing). State compact for waste. | Reliability credit. Long-term contracts.     |
| **Hydro**                            | Waterway compact coordinates.                       | Environmental flows. Relicensing = county.   |
| **Gas / Coal**                       | County permits (air/water). Carbon fee (county).    | Firm capacity credit. Pipeline coordination. |
| **Storage**                          | County permits. Ratepayer-funded (reliability).     | Frequency regulation market.                 |
| **Distributed (rooftop, microgrid)** | County interconnection standard.                    | Aggregation (VPP) via compact ISO.           |

**No federal subsidies (ITC, PTC, loan guarantees). No federal siting. No NERC.** Reliability = compact contract, not federal mandate.

### 4.4 Grid Hardening & Resilience

- **County responsibility**: Vegetation management, pole hardening, undergrounding (LVT capture zones).
- **Compact responsibility**: Spare transformer bank (regional). Black-start resources. Cyber defense (see law-enforcement.md).
- **Microgrids**: County facilities (hospital, shelter, water, comms) = priority. Islandable in 10 seconds.

---

## 5. Water & Wastewater: Watershed Compacts

### 5.1 County Water Utility (Every County)

- **Ownership**: County (via utility trust).
- **Sources**: Groundwater (county-managed), surface water (compact), reuse, desal (coastal).
- **Treatment**: County plants. Standards = EPA 1990 + county additions (stricter).
- **Distribution**: County pipes. Smart meters (county-owned data). Leak detection (acoustic + AI).
- **Rates**: Cost-of-service + infrastructure replacement fund. Lifeline tier (first 3,000 gal/mo free).

### 5.2 Watershed / Aquifer Compact (Multi-County)

| Function                 | Mechanism                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Allocation**           | Prior appropriation (seniority) + compact reserves (ecological, growth). Administered by compact watermaster. |
| **Groundwater**          | County manages <100 AFY. Compact manages >100 AFY (modeling, monitoring, recharge).                           |
| **Quality**              | County enforces (NPDES-adapted). Compact monitors mainstem. Data shared real-time.                            |
| **Flood Control**        | Compact operates dams/levees. County land use (floodplain = no build).                                        |
| **Drought Response**     | Compact triggers stages (voluntary → mandatory → emergency). Allocations cut pro-rata.                        |
| **Inter-basin Transfer** | Unanimous compact vote + LVT capture in export basin.                                                         |

### 5.3 Wastewater & Reuse

- **County treatment**: Secondary minimum. Tertiary for reuse/discharge to sensitive waters.
- **Reuse**: Purple pipe (non-potable) + IPR/DPR (potable) — county choice. Compact coordinates regional reuse.
- **Biosolids**: County land application (permitted). Compact tracks regional balance.
- **Stormwater**: County LVT funds green infrastructure. Compact models watershed response.

---

## 6. Energy Pipelines & Fuel Transport

### 6.1 Pipeline Corridors (Transport Corridor Compact)

- **Siting**: Compact identifies corridor. Counties approve (unanimous). Eminent domain = county only.
- **Safety**: County inspectors (PHMSA standards adapted). Real-time leak detection (fiber DAS).
- **Liability**: Operator strict liability. Bond = $1B/incident. County first responder reimbursement.
- **Abandonment**: Operator funds removal + remediation. Compact holds bond.

### 6.2 Fuel Supply (Gasoline, Diesel, Jet A, Propane)

- **No federal strategic reserve**. County/Compact reserves (30-day supply).
- **Refineries**: County permits. State compact for regional supply security.
- **Alternative fuels**: Hydrogen, ammonia, synthetic — county permits. Compact coordinates corridors.

---

## 7. Funding Summary (Per public-finance.md)

| Infrastructure               | County LVT | User Fees              | Compact Assessments       | Other            |
| ---------------------------- | ---------- | ---------------------- | ------------------------- | ---------------- |
| **Roads (local/collector)**  | 60%        | Fuel tax, tolls        | —                         | —                |
| **Arterials / Bridges**      | 20%        | Tolls (80%)            | Per-mile (compact)        | LVT capture zone |
| **Rail (passenger)**         | 10%        | Fares (40%)            | Assessments (50%)         | LVT capture      |
| **Ports**                    | 10%        | Wharfage (90%)         | —                         | Rent             |
| **Fiber (backbone)**         | 30%        | Lease fees (70%)       | Compact lease             | —                |
| **Fiber (last mile)**        | 50%        | Subscriber fees (50%)  | —                         | —                |
| **Spectrum**                 | —          | Auction revenue (100%) | —                         | → LVT reduction  |
| **Electric (distribution)**  | 20%        | Rates (80%)            | —                         | —                |
| **Electric (transmission)**  | 10%        | —                      | Capacity market (90%)     | —                |
| **Water (distribution)**     | 30%        | Rates (70%)            | —                         | —                |
| **Water (source/watershed)** | 10%        | Withdrawal fees (40%)  | Compact assessments (50%) | —                |
| **Wastewater**               | 30%        | Rates (70%)            | —                         | Reuse revenue    |
| **Pipelines**                | 10%        | —                      | Throughput fees (90%)     | —                |

**Total County Infrastructure Spend**: ~25% of LVT (~$20M/yr median county).
**Compact Assessments**: ~5% of county LVT (passed through to compact).

---

## 8. Personnel & Procurement

### 8.1 Workforce

| Role                               | Source                                        | Training                                                   |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| **Engineers**                      | County hire / compact hire                    | State licensure (compact-recognized). Apprenticeship path. |
| **Operators** (water, grid, fiber) | County hire                                   | Certification (county academy + OJT).                      |
| **Construction**                   | Private bid (prevailing wage = county median) | Apprenticeship (county-chartered).                         |
| **Inspectors**                     | County hire / compact hire                    | Cross-trained (road, pipe, wire, fiber).                   |
| **Planners**                       | Compact hire                                  | Regional planning (GIS, modeling, economics).              |

### 8.2 Procurement

- **County projects**: Competitive bid (sealed). Threshold: >$50k = bid. >$500k = design-build.
- **Compact projects**: Same. Board approves >$1M.
- **Standards**: Performance-based (not prescriptive). Innovation encouraged.
- **Materials**: Domestic preference (county choice). No Buy America mandate.
- **Transparency**: All bids, awards, change orders public (real-time dashboard).

---

## 9. Technology & Data (Open, Federated)

### 9.1 Digital Twin (Every County + Compact)

- **Platform**: Open-source (CityGEN, OpenStreetMap, PostGIS, TimescaleDB).
- **Layers**: Parcel, zoning, roads, pipes, wires, fiber, soil, flood, fire, assets.
- **Access**: Public (read). County/compact (write). API for developers.
- **Uses**: Planning, emergency response, maintenance, public engagement.

### 9.2 Asset Management

- **Condition assessment**: Sensors (IoT) + drones + AI (crack detection, leak prediction).
- **Maintenance**: Predictive (not reactive). Work orders auto-generated.
- **Lifecycle costing**: Full cost (cap + op + replacement) tracked per asset.
- **Benchmarking**: County vs. county (compact shares anonymized data).

### 9.3 Cyber-Physical Security

- **OT networks**: Air-gapped from IT. No remote access (local HMI only).
- **Monitoring**: County cyber unit + compact SOC (see law-enforcement.md).
- **Standards**: IEC 62443 (adapted). No NERC CIP.
- **Incident response**: County leads. Compact coordinates multi-county.

---

## 10. Emergency & Resilience (All-Hazards)

### 10.1 Mutual Aid Compact (Every Region)

- **Resources typed**: NIMS-adapted (crews, equipment, materials, generators, pumps, transformers, pipe, fiber, fuel).
- **Deployment**: County requests → Compact coordinator → Donor counties respond.
- **Reimbursement**: Cost + 10% (labor, equipment, materials, overhead). Invoiced weekly.
- **Training**: Annual regional exercise (tabletop + functional). County EOCs + compact staff.

### 10.2 Critical Infrastructure Prioritization

| Priority   | Facilities                                                  | Restoration Target |
| ---------- | ----------------------------------------------------------- | ------------------ |
| **Tier 1** | Hospital, EOC, shelter, water plant, comms hub, fire/police | 0–4 hours          |
| **Tier 2** | Grocery, pharmacy, fuel, banking, schools, nursing homes    | 4–24 hours         |
| **Tier 3** | Residential, commercial, industrial                         | 24–72 hours        |
| **Tier 4** | Non-essential                                               | 72+ hours          |

### 10.3 Strategic Reserves (Compact-Level)

| Resource                       | Quantity             | Location          | Rotation |
| ------------------------------ | -------------------- | ----------------- | -------- |
| **Transformers**               | 1 per 50k customers  | Compact warehouse | 20-year  |
| **Generators**                 | 1 per 10k customers  | County yards      | 10-year  |
| **Pipe (water/sewer)**         | 5 miles per diameter | Compact warehouse | 20-year  |
| **Fiber (splice kits, cable)** | 10 miles             | County yards      | 10-year  |
| **Fuel (diesel, gasoline)**    | 500k gal             | County depots     | 6-month  |
| **PPE / Medical**              | 30-day supply        | Hospital + county | 1-year   |

---

## 11. Transition (Years 0–5)

| Year  | Milestone                                                                                                                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | FHWA, FERC, FCC, FRA, PHMSA, Army Corps, EPA Water, NTIA **abolished**. Assets → counties (per capita). Interstate highways → Transport Corridor Compacts.                                                                        |
| **1** | County utilities chartered. Compacts formed (transport, water, electric, digital). First assessments levied. State minimum standards for cross-county air/water adopted.                                                          |
| **2** | Digital twin live (all counties). Fiber backbone construction starts. Rail compact safety ops begin. State infrastructure surcharge levied on participating counties only (1% during Years 2–5, 2% after the Trust levy sunsets). |
| **3** | Electric ISO operational. Capacity market clears. Spectrum auctions (county/compact).                                                                                                                                             |
| **4** | Watershed compacts allocating. Mutual aid exercised (first real event).                                                                                                                                                           |
| **5** | **All federal infrastructure statutes void**. Only county charters + compacts bind. System mature.                                                                                                                                |

---

## 12. What This Replaces

| Federal Agency               | Budget | Personnel | Replaced By                                                                     |
| ---------------------------- | ------ | --------- | ------------------------------------------------------------------------------- |
| **FHWA / FTA**               | $60B   | 3,000     | Transport Corridor Compacts (all counties)                                      |
| **FERC / NERC**              | $400M  | 1,500     | Electric Reliability Compacts (50 states → ~10 regions)                         |
| **FCC**                      | $400M  | 1,500     | County Spectrum Boards + Digital Backbone Compacts                              |
| **FRA**                      | $200M  | 800       | Rail Compacts (voluntary)                                                       |
| **PHMSA**                    | $100M  | 500       | County inspectors + Pipeline Corridor Compacts                                  |
| **Army Corps (Civil Works)** | $8B    | 23,000    | Waterway Compacts + Watershed Compacts                                          |
| **EPA (Water)**              | $4B    | 3,000     | County water utilities + Watershed Compacts                                     |
| **NTIA / FirstNet**          | $1B    | 200       | Digital Backbone Compacts + County Fiber Utilities                              |
| **BOR (Reclamation)**        | $1B    | 5,000     | Watershed Compacts (Western)                                                    |
| **MARAD / Ports**            | $500M  | 800       | Port Compacts                                                                   |
| **Total Federal Infra**      | ~$76B  | ~40,000   | **County utilities + Compacts** (more local, less overhead, no federal strings) |

---

## 13. Edge Cases & Answers

| Question                                                                  | Answer                                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **County refuses compact assessment?**                                    | Compact suspends services to that county. County Veto can nullify compact provision.    |
| **Compact fails (bankruptcy)?**                                           | Assets revert to counties per contribution. Services revert to county. No bailout.      |
| **Inter-compact conflict (water vs. electric)?**                          | Joint board (2 reps each). Mediation → arbitration (sortition). County Veto backstop.   |
| **Private utility refuses interconnection?**                              | County franchise = interconnection mandate. Compact ISO enforces.                       |
| **Spectrum interference across counties?**                                | County Spectrum Boards coordinate (compact). Direction-finding + fines.                 |
| **County wants to go 100% renewable, compact needs gas for reliability?** | County builds/buys renewable + storage. Compact pays capacity payments for reliability. |
| **Foreign cyberattack on grid?**                                          | County cyber unit + compact SOC + SBI (if criminal). No federal CISA/DOE.               |
| **Climate migration (county loses water)?**                               | Compact reallocates. County LVT captures new value. Secession if irreconcilable.        |

---

## 14. The Culture Shift

| Old Mindset                          | New Mindset                                          |
| ------------------------------------ | ---------------------------------------------------- |
| "Federal funding for local projects" | **We fund our infrastructure** (LVT + user fees)     |
| "Permit from DC"                     | **Permit from county** (compact coordinates)         |
| "Grid reliability = federal mandate" | **Reliability = compact contract**                   |
| "Spectrum = federal property"        | **Spectrum = local commons / county license**        |
| "Water rights = state/federal"       | **Water = watershed compact**                        |
| "Infrastructure = concrete/steel"    | **Infrastructure = data + governance + physical**    |
| "Maintenance = deferred"             | **Maintenance = predictive (sensors + AI)**          |
| "Resilience = FEMA"                  | **Resilience = mutual aid compact + local reserves** |

---

**The system is done when**: A county can build a road, lay fiber, drill a well, string a wire, or site a solar farm — permitted by their commission, engineered by their staff, built by their contractors, funded by their LVT, coordinated with neighbors via compact — without a single federal form, federal dollar, or federal permission. And if the neighbor county doesn't like it, they negotiate a compact. And if the compact fails, they go their own way. **Infrastructure is local. Coordination is voluntary. The physical layer serves the county, not the capital.**
