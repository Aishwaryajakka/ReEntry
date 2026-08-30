# Requirements Document

## 1. Application Overview

**App Name:** ReEntry

ReEntry is an adolescent-first concussion recovery mobile app focused on return-to-school and return-to-life functional tolerance.

ReEntry supports recovery through observational self-reporting and pattern visibility. It does not diagnose concussion, estimate severity, predict recovery time, prescribe treatment/accommodations, or clear return-to-play.

This document covers the Foundation build plus the Fast Build layer: persistent backend foundation, user-scoped settings, and control repair. The Fast Build adds no redesign of existing screens and does not rebuild authentication.

---

## 2. Users

**Primary User:** Adolescents ages 13-18 recovering from concussion.

**Demo User:** Maya, age 16.

The eventual experience allows students to log functional experiences, understand patterns in their records, and communicate relevant school supports through a calm, low-stimulation interface.

---

## 3. Non-Negotiable Product Boundaries

* Never diagnose concussion or symptoms.
* Never estimate severity or recovery time.
* Never prescribe treatment or accommodations.
* Never determine medical readiness or return-to-play clearance.
* Never claim causality from correlation.
* Never present self-report ratings as clinical scores.
* Every generated insight must expose its supporting records.
* Teacher/school views must use minimum-necessary disclosure.
* Color must never be the sole carrier of medical or functional meaning.
* The entire product must remain usable in Low-Stimulation Mode.

Approved observational language:

* \"You reported...\"
* \"Your records show...\"
* \"This pattern appeared...\"
* \"Compared with your earlier entries...\"
* \"Consider discussing this with your care team.\"

Never use language such as:

* \"This caused...\"
* \"This means you have...\"
* \"You are recovered...\"
* \"You should stop...\"
* \"You should return to sports...\"
* \"You are medically ready...\"

---

## 4. Design System — Final Visual Lock

This section supersedes the previous color and visual identity definitions. All screens must conform to the Final Visual Lock.

### 4.1 Color Tokens

Store all colors in one shared token system. Do not duplicate hardcoded hex values across screens.

* Warm White `#FFFDF7`
* Moon `#E8E3D9`
* Linen `#DDD1BF`
* Forest `#344431`
* Deep Forest `#263528`
* Moss `#71856A`
* Bright ReEntry Yellow `#F6C945`
* Warm Gold `#F4B93F`
* Rust `#A5572F`
* Turmeric `#D29443`

### 4.2 Color Usage Rules

* **Backgrounds:** Warm White `#FFFDF7` and Moon `#E8E3D9` as primary canvas colors.
* **Typography:** Forest `#344431` and Deep Forest `#263528` as dominant text colors.
* **Signature accents:** Bright ReEntry Yellow `#F6C945` and Warm Gold `#F4B93F` used strategically and sparingly — not as full-screen fills. Reserved for hero cards, selected states, key credential elements, and active navigation indicators.
* **Supporting palette:** Moss, Rust, Turmeric used as secondary accents where appropriate.
* Color must never be the sole carrier of medical or functional meaning.

### 4.3 Visual Identity

A nature field journal transformed into a premium modern mobile product: editorial, botanical/terrain-inspired, calm, tactile, sophisticated, warm, adolescent but not childish.

**Use:**

* Compact mobile information density
* Page gutters: 16-20px
* Card padding: 14-18px
* Moderate rounded corners
* Reduced gaps; avoid oversized whitespace
* Editorial typography: compact bold headings, modest uppercase labels, readable body text
* Refined editorial typography
* Subtle paper texture (removable in Low-Stimulation Mode)
* Extremely faint topographic motifs (removable in Low-Stimulation Mode)
* Minimal shadows
* Accessible hierarchy
* Large comfortable touch targets (approximately 44pt or larger)
* Low visual stimulation

**Avoid:**

* Medical blue
* Neon gradients
* Glassmorphism
* Confetti
* Streaks/gamification
* Excessive animation
* Childish illustrations
* Generic SaaS dashboards
* Generic AI-chatbot styling
* Dense analytics
* Excessive shadows or decoration
* Oversized whitespace that creates unnecessary scrolling

### 4.4 Iconography

* Use professional inline SVG vector icons only.
* No emoji, no Unicode symbols, no raster images, no AI-generated icons.

**Tab icons (inline SVG):**

* Today — sun
* Tolerance — pulse/trend line
* Journey — folded map
* Pass — open book/pass
* Profile — person/circle

**Functional icons (inline SVG):**

* Reading — open book
* Screens — monitor/laptop
* School/Class — building
* Noise — speaker with waves
* Concentration — focus/target
* Physical activity — walking figure
* Chemistry — flask
* Cafeteria — people group
* Privacy — lock
* Settings — gear
* Pass/credential — shield

### 4.5 Botanical Linework

* Use original inline SVG botanical linework only.
* Used sparingly: on the Today yellow hero card and on the ReEntry Pass credential card.
* Do not apply botanical linework to other screens.

---

## 5. Low-Stimulation Mode

Low-Stimulation Mode is now a real persistent user preference stored in `user_preferences.low_stimulation_enabled`. It is no longer local/app-level state only.

Create global state:

`lowStimulationMode: boolean` — loaded from the authenticated user's `user_preferences` row on sign-in. Defaults to `false` for unauthenticated state.

The Low-Stimulation Mode preference is controlled by the toggle on the Profile screen. It is a single shared global preference consumed by all five tabs (Today, Tolerance, Journey, Pass, Profile) and the Teacher View modal. The preference must persist while navigating between tabs and across app restarts. Changes are written to `user_preferences` for the current authenticated user. On sign out, in-memory Low-Stimulation state is cleared and the interface returns to the default unauthenticated state (Low-Stimulation OFF).

### 5.1 When Low-Stimulation Mode is ON — Remove or Reduce

Across all screens and the Teacher View, remove or reduce the following:

* Decorative botanical graphics (Today hero card botanical SVG, Pass credential card botanical SVG)
* Decorative background leaf graphics
* Paper texture
* Decorative topographic/contour motifs
* Decorative shadows if visually distracting
* Nonessential animations
* Nonessential transitions
* Looping animations
* Nonessential entrance animations, fades, and slides
* Simplified chart decoration
* Purely decorative visual effects

When Low-Stimulation Mode is ON, nonessential microinteraction transitions (as defined in Section 17) must also be removed or minimized.

### 5.2 When Low-Stimulation Mode is ON — Must Preserve

The following must remain fully intact and functional:

* All text content
* All functional icons
* All buttons and interactive controls
* All navigation (tabs, Back/Close actions)
* All activity records and evidence records
* All accommodation information
* All chart data and chart labels
* All status labels and accessibility labels
* All functionality
* All medical/recovery information
* All permissions and access controls
* Readable contrast
* Large touch targets
* Clear navigation
* Appearance setting (Low-Stimulation Mode must not change the Appearance/theme)

Use Forest, Moss, Linen, and Moon as the restrained core palette when Low-Stimulation Mode is active.

Do not create duplicate low-stimulation screens. Shared components must react to the global preference via the LowStimWrapper component.

Do not increase whitespace if it creates unnecessary scrolling.

### 5.3 Reduced Motion

Respect the device/browser `prefers-reduced-motion` signal via `useReducedMotion` from react-native-reanimated. When reduced motion is requested:

* Remove nonessential transitions.
* Journey evidence expansion must be immediate or use a minimal fade only.
* Teacher View opening and closing must avoid unnecessary movement.
* Buttons remain responsive without animated scaling.
* Navigation remains clear and functional.

Reduced motion behavior is independent of the Low-Stimulation Mode toggle; both may be active simultaneously.

When either `prefers-reduced-motion` is active OR Low-Stimulation Mode is active, all nonessential microinteraction transitions defined in Section 17 must be removed or minimized.

---

## 6. Shared Data Architecture

Create one shared structured fictional 14-day dataset for Maya (demo only).

Every screen, chart, summary, history, accommodation, and future insight must derive from this source for the demo user.

Do not create screen-specific duplicate demo data.

Use stable IDs for all referenced records.

### DemoUser

* id
* firstName
* age

Seed Maya, age 16.

### ActivityLog

* id
* date
* activityType
* durationMinutes
* toleranceRating
* notes
* challengeTagIds

`toleranceRating`:

1 = Very difficult
2 = Difficult
3 = Some difficulty
4 = Mostly manageable
5 = Manageable

This is self-reported functional tolerance, not a clinical score.

### ChallengeTag

* id
* label
* category

Example labels: headache, concentration, light, noise, fatigue, dizziness, memory, emotional stress, screen glare, crowded hallway.

Categories may include environmental, cognitive, social, physical.

### DailyCheckIn

* id
* date
* overallFeeling
* energyLevel
* headachePresent
* headacheIntensity
* activeChallengeTagIds
* freeNote

`overallFeeling`:

1 = Very difficult day
2 = Difficult day
3 = Mixed
4 = Mostly manageable
5 = Manageable day

`energyLevel`:

1 = Very low
2 = Low
3 = Moderate
4 = Good
5 = High

If `headachePresent = false`, `headacheIntensity = null`.

If present:

1 = Very mild
2 = Mild
3 = Moderate
4 = Strong
5 = Very strong

All values are self-reported observations, not clinical severity scores.

### AccommodationRecord

* id
* dateIssued
* accommodationType
* issuedBy
* activeUntil
* visibleToSchool

Example accommodations: reduced screen exposure, additional assignment time, quiet testing environment, rest breaks.

`issuedBy` is a role label only.

ReEntry records accommodations; it does not prescribe, approve, or medically authorize them.

### InsightEvidence

* id
* insightId
* insightText
* supportingActivityLogIds
* supportingCheckInIds
* generatedOn

Every insight must be traceable to its exact supporting records and use observational language only.

---

## 7. Maya 14-Day Demo Data

Seed realistic non-linear recovery data showing:

* Reading gradually becoming more manageable.
* Concentration improving somewhat with occasional regression.
* Noise remaining difficult.
* Screen tolerance fluctuating.
* School attendance/participation gradually increasing.
* Difficult days occurring after improvement.
* Days 9 and 12 showing regression/increased difficulty.
* Headache being intermittent rather than daily.

Do not create a perfectly improving recovery curve.

Minimum seed data:

* 1 DemoUser
* Exactly 14 DailyCheckIns
* ActivityLogs distributed across the 14 days
* Reusable ChallengeTags
* At least 3 InsightEvidence records
* At least 2 AccommodationRecords

Demo data is isolated to the demo/Maya context. It must not appear in real authenticated student accounts.

---

## 8. Application Shell

Build a mobile-first app with five fixed bottom-navigation tabs:

1. Today
2. Tolerance
3. Journey
4. Pass
5. Profile

Tab icons as specified in Section 4.4 (inline SVG only).

* Active tab: Forest `#344431`.
* Inactive tabs: Moss at reduced emphasis.
* Tab background: Moon `#E8E3D9`.

No badges, notification counts, streaks, or gamification.

Requirements:

* All tabs navigate correctly.
* No horizontal overflow.
* Safe-area-aware layout.
* Vertical scrolling where necessary.
* No clipped text.
* Important touch targets approximately 44pt or larger.

---

## 9. Global State

One shared app state must provide access to:

* Current DemoUser
* 14-day dataset
* ActivityLogs
* ChallengeTags
* DailyCheckIns
* AccommodationRecords
* InsightEvidence
* lowStimulationMode (loaded from user_preferences on sign-in; cleared on sign-out)
* appearance (loaded from user_preferences on sign-in; cleared on sign-out)
* activeTab
* authenticatedUser (Supabase Auth session)
* userRole (`student` | `school_staff` | `clinician`)

All demo/activity data is local/demo-only. Auth session and role are persisted via Supabase Auth. Appearance and Low-Stimulation Mode are persisted via `user_preferences` in Supabase.

Architecture must support later incremental features without duplicating data.

---

## 10. Foundation Screens

### 10.1 Today

**Canvas:** Warm White `#FFFDF7` background.

**Hero card:** Compact Bright ReEntry Yellow `#F6C945` hero card displaying:

* Label: \"TODAY AT SCHOOL\" (compact uppercase label)
* Activity count for the day
* A brief observational note
* Original inline SVG botanical linework, used sparingly as decoration (removed when Low-Stimulation Mode is ON)

**Activity cards below hero:** Compact light-background cards (Moon or Linen) for logged activities. Each card displays:

* Inline SVG vector icon for activity type (Reading = open book, Screens = monitor/laptop, Chemistry = flask, Cafeteria = people group)
* Duration
* Short observational note
* Compact three-segment tolerance indicator
* Text status label

Status indicators on the Today screen must not rely on color alone. The existing combination of shape/marker + text label + icon + color must be preserved.

**Additional content:**

* Maya's name from shared data
* Current/demo date
* Daily check-in entry point
* Most recent DailyCheckIn summary
* Last 2-3 ActivityLogs from shared data

Daily check-in and full activity logging may remain non-functional during Foundation.

### 10.2 Tolerance

**Canvas:** Warm White `#FFFDF7` background.

**Section heading:** \"Your Recovery Terrain\"

**Activity category cards:** Compact light-background cards (Moon or Linen) for each category. Each card displays:

* Inline SVG vector icon for the category (Reading = open book, Screens = monitor/laptop, Class/School = building, Noise = speaker with waves, Concentration = focus/target, Physical activity = walking figure)
* Small tolerance bar
* Observational note
* Trend indicator
* Record count

Categories:

* Reading
* Screens
* Noise
* Concentration
* Physical activity
* Social activity

Status indicators on the Tolerance screen must not rely on color alone. The existing combination of shape/marker + text label + icon + color must be preserved.

Indicate that information derives from Maya's shared dataset.

No medical scores, recovery percentages, severity predictions, or claims that Maya is recovered.

Interactive charts are out of scope for Foundation.

### 10.3 Journey

**Canvas:** Deep Forest `#263528` as the dominant background color.

**Typography:** Warm White `#FFFDF7` and Linen `#DDD1BF` for text on the dark background.

**Accent usage:** Bright ReEntry Yellow `#F6C945` for:

* Selected filter pills
* Day markers indicating notable entries
* Insight card highlight
* Active navigation indicator

**Content:**

* Compact filter pills for date/category filtering
* Compact 14-day chart using dates from the shared dataset
* Shape-based markers (in addition to color) to distinguish more manageable and harder days
* Legend explaining marker shapes and colors
* Yellow Insight card displaying an observational insight with observational framing (\"Your records show...\")

Status indicators on the Journey screen must not rely on color alone. The existing combination of shape-based markers + text labels + legend + color must be preserved.

Journey evidence expansion must be immediate or use a minimal fade only when `prefers-reduced-motion` is active.

Do not use a giant light-background timeline layout. Do not use a large background leaf watermark.

Full generated insights and evidence interactions come later.

### 10.4 Pass

**Canvas:** Warm White `#FFFDF7` and Moon `#E8E3D9` background.

**Credential card:** Compact Bright ReEntry Yellow `#F6C945` card displaying:

* Label: \"REENTRY PASS\"
* Student first name: Maya
* Context label: \"Return-to-Learn\"
* Active accommodation count
* Valid-through date (activeUntil from qualifying AccommodationRecords)
* Original inline SVG botanical linework, used sparingly (removed when Low-Stimulation Mode is ON)
* Shield inline SVG icon

**Show Pass button:** Full-width Forest `#344431` filled PrimaryButton. Opens the Teacher View (see Section 10a). Touch target must be approximately 44pt or larger. Semantic button behavior and visible focus state must be preserved.

**Accommodation cards below credential:** Compact cards (Moon or Linen) for each AccommodationRecord, displaying:

* accommodationType
* activeUntil
* issuedBy role label

Use minimum-necessary disclosure.

Do not imply ReEntry prescribed or authorized accommodations.

### 10a. Teacher View

The Teacher View is a modal or full-screen overlay opened by the Show Pass button on the Pass screen. It is not a separate tab.

Teacher View opening and closing must avoid unnecessary movement when `prefers-reduced-motion` is active.

**Canvas:** Warm White `#FFFDF7` and Moon `#E8E3D9`, consistent with shared design token system.

**Data source:** Shared AccommodationRecords filtered to records where `visibleToSchool = true` and `activeUntil` is on or after the current demo date. The Teacher View must consume the same AccommodationRecord demo data used by the Pass screen. No separate hardcoded Teacher View accommodation list is permitted.

**Content displayed:**

* Student first name: Maya (from DemoUser.firstName)
* Context label: \"Return-to-Learn\"
* List of current active school accommodations (accommodationType for each qualifying AccommodationRecord)
* Issuer/source: issuedBy role label for each accommodation
* Expiration/valid-through date: activeUntil for each accommodation
* Last-updated date: dateIssued for each accommodation, if available

**Required disclosure statements (static text, always visible):**

* \"Only information relevant to current school support is shown here.\"
* \"ReEntry displays recorded accommodations. It does not prescribe or authorize accommodations.\"

**Minimum-necessary disclosure — the Teacher View must NOT display:**

* Activity history or ActivityLog data
* Journey insights or InsightEvidence data
* Symptom or ChallengeTag history
* Emotional information or overallFeeling values
* Private notes or freeNote content
* Full medical information of any kind
* DailyCheckIn data
* Tolerance history
* Any unrelated health information

**Navigation:**

* Include a Back or Close action that dismisses the Teacher View and returns to the Pass screen.
* The Teacher View must not replace or alter the Pass screen or any other tab.

**Optional demo visual:**

* A polished DEMO QR or share visual placeholder may be included for visual completeness. It must be clearly labeled as a demo/placeholder and must not implement actual QR generation, sharing, or external transmission.

**Constraints:**

* No authentication required to open the Teacher View.
* No backend services or school accounts.
* No redesign of existing screens.
* Teacher View must respect Low-Stimulation Mode via shared LowStimWrapper component.
* Teacher View must use the shared design token system (Forest, Moss, Linen, Moon, SectionCard, BodyText, LabelText, PrimaryButton/SecondaryButton as appropriate).

### 10.5 Profile

**Canvas:** Warm White `#FFFDF7` and Moon `#E8E3D9` background.

**Profile card:** Compact SectionCard displaying:

* Yellow avatar element (Bright ReEntry Yellow `#F6C945` circle/avatar)
* First name (from DemoUser.firstName)
* Age (from DemoUser.age)
* Read-only; no editing.

**Recovery Context Section:** Compact read-only summary derived from shared data:

* Total number of DailyCheckIns recorded
* Total number of ActivityLogs recorded
* Date of first entry and most recent entry

All values derived from shared dataset. Use observational framing only. Do not present any value as a clinical score, recovery percentage, or medical status.

**Settings Section:** Compact card containing two independent toggles:

* **Appearance toggle** — controls Light/Dark appearance for the current authenticated user. Persisted to `user_preferences.appearance`. Visual state reflects the current user's persisted value. Does not affect Low-Stimulation Mode.
* **Low-Stimulation Mode toggle** — controls Low-Stimulation Mode for the current authenticated user. Persisted to `user_preferences.low_stimulation_enabled`. Visual state reflects the current user's persisted value. Does not affect Appearance.
* Gear inline SVG icon
* Each toggle must affect all five screens and the Teacher View modal, and must remain active while navigating.
* Each toggle touch target must be approximately 44pt or larger. Semantic toggle behavior and visible focus state must be preserved.
* One control must not modify the other.

**About / Disclaimer Section:** Compact card containing brief static about and disclaimer text consistent with Section 3. Must preserve the following safety language: \"Recovery support — not diagnosis\" and the explanation that ReEntry does not diagnose, estimate severity, predict recovery time, prescribe treatment, or clear return-to-play.

**Sign Out:** A SecondaryButton (outlined rounded-rectangle) labeled \"Sign Out\" accessible on the Profile screen. On tap, terminates the Supabase Auth session, clears the current user's active UI preference state (appearance and low_stimulation_enabled in-memory values), and returns the user to the Sign In screen. Protected routes must not remain accessible after sign out.

Do not add account management, messaging, clinician settings, or school accounts.

---

## 11. Reusable Components

Create reusable design-token-driven components including:

**ScreenShell** — safe-area-aware screen container with optional texture/contours and Low-Stimulation behavior.

**SectionCard** — restrained reusable Linen/Moon card with 14-18px padding and moderate rounded corners.

**PrimaryButton** — Forest `#344431` fill, Warm White `#FFFDF7` or Moon text, large touch target (~52-56px tall), full-width where specified, visible background, clear padding and boundary, rounded-rectangle shape. Disabled state: muted Moss/gray-green surface, visible boundary, readable dark text — must remain recognizably a button. Buttons must remain responsive without animated scaling when `prefers-reduced-motion` is active.

**SecondaryButton** — Forest outline/text, rounded-rectangle shape, large touch target (~52-56px tall), visible boundary. Used for Sign Out across all three role screens (Student Profile, School Staff workspace, Clinician workspace).

**HeadingText / BodyText / LabelText** — shared typography system using Forest and Deep Forest as dominant text colors; compact bold headings, modest uppercase labels.

**TabBar** — consumes global activeTab state; uses inline SVG tab icons as specified in Section 4.4. Navigation must remain clear and functional when `prefers-reduced-motion` is active.

**LowStimWrapper** — reacts to global Low-Stimulation Mode and removes decorative stimulation (botanical graphics, textures, topographic motifs, decorative shadows, nonessential animations and transitions, looping animations, nonessential entrance animations/fades/slides, simplified chart decoration, purely decorative visual effects) without hiding functionality, text, functional icons, chart data, medical/recovery information, navigation, buttons, accessibility labels, data, or permissions. Also reacts to `prefers-reduced-motion` to remove nonessential transitions independently of the toggle state.

**DataBadge** — reusable ChallengeTag label.

**DividerLine** — subtle token-driven divider.

---

## 12. Data-Flow Verification and Repair

This section defines the data-flow verification and repair task. No redesign and no new features are introduced.

### 12.1 Shared Activity Data Consistency

Today, Tolerance, and Journey must all read ActivityLog records from the single shared global dataset defined in Section 6. No screen may maintain its own copy of activity data.

* If Today already writes a newly logged activity into shared global state, that behavior must be preserved.
* A newly logged activity must not cause runtime errors, broken Tolerance category cards, broken Journey chart rendering, or duplicate records in any screen.
* Verify that Tolerance category cards derive their tolerance bars, trend indicators, and record counts from the same ActivityLog records visible on Today and Journey. If any screen reads from a separate local copy, repair it to consume the shared source.

### 12.2 Journey Evidence Integrity

Preserve the existing \"Why am I seeing this?\" functionality.

* Evidence displayed beneath an insight must correspond to existing Maya records in the shared dataset (ActivityLog and/or DailyCheckIn records referenced by InsightEvidence.supportingActivityLogIds and InsightEvidence.supportingCheckInIds).
* Evidence items must display only existing fields: date, activity/category, duration, toleranceRating (labeled as self-reported manageability), and relevant challengeTagIds resolved to ChallengeTag labels.
* Do not fabricate evidence fields or values not present in the shared data model.
* If evidence currently displays fabricated or screen-local data, repair it to reference actual shared records by stable ID.

### 12.3 Accommodation Data Consistency

Pass and Teacher View must consume the same AccommodationRecord demo data from the shared global dataset.

* The Teacher View must not maintain a separate hardcoded accommodation list.
* If a discrepancy exists between the accommodation data shown on the Pass screen and the Teacher View, repair the Teacher View to filter from the shared AccommodationRecords (visibleToSchool = true, activeUntil on or after demo date).
* The active accommodation count on the Pass credential card must reflect the same filtered set used by the Teacher View.

### 12.4 Teacher View Privacy Boundary Verification

Verify that the Teacher View exposes only the following fields:

* DemoUser.firstName (Maya)
* Context label: \"Return-to-Learn\" (static)
* accommodationType for each qualifying AccommodationRecord
* issuedBy role label for each qualifying AccommodationRecord
* activeUntil for each qualifying AccommodationRecord
* dateIssued for each qualifying AccommodationRecord (if available)
* Both required disclosure statements (static text)

Verify that the Teacher View does not expose:

* ActivityLog data or activity history
* Tolerance history or category summaries
* InsightEvidence data or Journey insights
* ChallengeTag history or symptom history
* overallFeeling, energyLevel, headachePresent, headacheIntensity, or any DailyCheckIn field
* freeNote or any private note content
* Any unrelated health information or full medical records

If any prohibited field is currently rendered in the Teacher View, remove it.

### 12.5 Observational Language Audit

Review all generated and demo observation strings across Today, Tolerance, Journey, Pass, Teacher View, and Profile.

* Prefer approved language: \"You reported...\", \"Your records show...\", \"This pattern appeared...\", \"Compared with your earlier entries...\", \"Consider discussing with your care team...\"
* Remove or replace any causal, diagnostic, severity, recovery-status, or medical-readiness claims.
* Do not rewrite copy that already conforms to approved observational language.
* InsightEvidence.insightText strings must use observational language only.

### 12.6 Repair Constraints

* Do not add backend beyond what is specified in Sections 18 and 20.
* Do not add external AI, external APIs, new screens, or new features.
* Do not redesign any existing screen.
* Do not refactor unrelated working components.
* Repair only the specific data-flow inconsistencies identified in Sections 12.1 through 12.5.
* Preserve all existing functionality, visual design, and navigation.

---

## 13. Build Discipline

* Use reusable components.
* Use one shared structured dataset.
* Never duplicate Maya's data per screen.
* Derive summaries and future trends from structured data.
* Preserve validated screens and behaviors in later builds.
* Do not refactor unrelated working components.
* Keep all Foundation demo data local/demo-only.
* Do not invent additional features.

Do not add:

* External APIs
* External AI
* Push notifications
* Messaging
* Payments
* Wearables
* App-store integrations
* Clinician login beyond the placeholder workspace
* School login beyond the placeholder workspace
* Social features
* Gamification
* Diagnosis
* Severity estimation
* Prognosis
* Return-to-play clearance
* Decorative animation

---

## 14. Acceptance Criteria

Foundation passes when:

1. All five tabs are visible, tappable, and navigate correctly.
2. All screens render at mobile width without horizontal overflow or clipped text.
3. Maya exists once in shared data as age 16.
4. Exactly 14 DailyCheckIns exist.
5. ActivityLogs support the required non-linear recovery narrative.
6. Reading improves gradually; concentration improves unevenly; noise remains difficult; screens fluctuate; school participation increases.
7. Days 9 and 12 contain regression/increased difficulty.
8. At least 3 InsightEvidence and 2 AccommodationRecords exist.
9. All referenced records use stable IDs.
10. Every screen consumes the same shared dataset with no duplicate screen-specific data.
11. Rating scales follow the definitions in this document and are never presented as clinical scores.
12. One coherent design-token system is used across all screens, using the Final Visual Lock color tokens defined in Section 4.1.
13. Color is never the sole carrier of medical/functional meaning.
14. Low-Stimulation Mode exists in global state, is loaded from user_preferences on sign-in, and affects all five tabs and the Teacher View modal.
15. Low-Stimulation Mode removes decorative stimulation (botanical graphics, textures, topographic motifs, decorative shadows, nonessential animations and transitions, looping animations, nonessential entrance animations/fades/slides, simplified chart decoration, purely decorative visual effects) without removing information, functional icons, chart data, status labels, medical/recovery information, navigation, buttons, accessibility labels, or functionality.
16. Low-Stimulation Mode persists while navigating between tabs and across app restarts.
17. Important touch targets are approximately 44pt or larger.
18. No diagnostic, causal, prognostic, prescriptive, severity, or medical-readiness claims appear.
19. No prohibited integrations/features are present.
20. Architecture remains reusable for later incremental features.
21. Profile screen displays Maya's first name and age from shared DemoUser data.
22. Profile screen displays total DailyCheckIns count, total ActivityLogs count, first entry date, and most recent entry date, all derived from the shared dataset.
23. All Profile screen values use observational framing and are not presented as clinical scores or medical status.
24. The Show Pass button on the Pass screen opens the Teacher View.
25. The Teacher View displays Maya's first name, the \"Return-to-Learn\" label, current active school accommodations (accommodationType), issuedBy role, activeUntil date, and dateIssued (last-updated) for each qualifying AccommodationRecord.
26. The Teacher View displays both required disclosure statements.
27. The Teacher View does not display activity history, Journey insights, symptom/challenge history, emotional information, private notes, DailyCheckIn data, Tolerance history, or full medical information.
28. The Teacher View includes a Back or Close action that returns the user to the Pass screen.
29. The Teacher View respects Low-Stimulation Mode via the shared LowStimWrapper component.
30. The Teacher View uses only shared AccommodationRecord demo data with no new or duplicate data.
31. No authentication, backend services, or school accounts are required to open the Teacher View.
32. Existing screens (Today, Tolerance, Journey, Profile) are not redesigned or altered beyond the accessibility and Low-Stimulation Mode behavior requirements described in this document.
33. All tab icons are professional inline SVG vector icons as specified in Section 4.4.
34. All functional icons are professional inline SVG vector icons as specified in Section 4.4.
35. Botanical linework is original inline SVG, used only on the Today hero card and the ReEntry Pass credential card (and removed when Low-Stimulation Mode is ON).
36. Today screen includes a compact Bright ReEntry Yellow hero card with \"TODAY AT SCHOOL\", activity count, observation, and botanical SVG (removed in Low-Stimulation Mode), plus compact activity cards with vector icons, duration, observation, three-segment indicator, and text status label.
37. Tolerance screen displays compact cards with SVG icons, small tolerance bars, observations, trends, and record counts for each category.
38. Journey screen uses Deep Forest `#263528` as dominant background, Warm White/Linen typography, Bright Yellow for selected filters/markers/Insight card/active nav, compact filter pills, compact 14-day chart, shape-based markers, and legend.
39. Pass screen uses Warm White/Moon canvas with compact Bright Yellow credential card, full-width Forest Show Pass button, and compact accommodation cards.
40. Profile screen uses Warm White/Moon canvas with compact profile card including yellow avatar, compact settings and about sections.
41. Page gutters are 16-20px; card padding is 14-18px; rounded corners are moderate; gaps are compact without oversized whitespace.
42. Low-Stimulation Mode is controlled by a single toggle on the Profile screen and the preference is shared globally across all five tabs and the Teacher View modal.
43. The Low-Stimulation Mode preference persists while navigating between tabs and across app restarts via user_preferences; cleared on sign out.
44. When Low-Stimulation Mode is ON, all text, functional icons, buttons, navigation, activity records, evidence records, accommodation information, chart data, chart labels, status labels, accessibility labels, medical/recovery information, and permissions remain fully visible and functional.
45. Charts remain understandable in Low-Stimulation Mode.
46. The device/browser `prefers-reduced-motion` signal is respected via `useReducedMotion` from react-native-reanimated.
47. Reduced-motion behavior operates independently of the Low-Stimulation Mode toggle; both may be active simultaneously.
48. Today, Tolerance, and Journey status indicators do not rely on color alone.
49. Touch targets for Show Pass, Journey evidence controls, Low-Stimulation toggle, Appearance toggle, and other interactive controls are approximately 44pt or larger, with semantic button behavior and visible focus states preserved.
50. Profile About/Disclaimer section preserves the safety language \"Recovery support — not diagnosis\".
51. The approved visual design is unchanged when Low-Stimulation Mode is OFF.
52. Today, Tolerance, and Journey all read ActivityLog records from the single shared global dataset; no screen maintains a separate local copy.
53. A newly logged activity does not cause runtime errors, broken Tolerance cards, broken Journey rendering, or duplicate records.
54. Journey evidence items correspond to existing Maya records referenced by stable ID; no fabricated evidence fields are present.
55. Pass credential card active accommodation count and Teacher View accommodation list are both derived from the same shared AccommodationRecords filtered set.
56. All generated and demo observation strings use approved observational language; no causal, diagnostic, severity, recovery-status, or medical-readiness language is present.
57. Pressed/active states are present on all interactive controls listed in Section 17.1.
58. Normal transitions are 120-180ms; restrained transitions applied as specified in Section 17.2.
59. No bouncing, parallax, animated backgrounds, looping animations, confetti, exaggerated scaling, or decorative motion is present.
60. When `prefers-reduced-motion` is active OR Low-Stimulation Mode is active, all nonessential microinteraction transitions are removed or minimized.
61. Bottom navigation shows exactly one selected tab at all times.
62. Obvious visual inconsistencies are repaired; intentional differences between screens are preserved.
63. All interactive controls remain comfortably tappable.
64. Colors, fonts, icons, charts, major section positions, copy, decorative graphics (in normal mode), features, data, and unrelated code are unchanged from the pre-polish state.
65. Sign up creates a new Supabase Auth account with an assigned role and persists the session.
66. Sign in authenticates an existing Supabase Auth account and restores the session and role.
67. Sign out clears the Supabase Auth session, clears the current user's in-memory UI preference state (appearance and low_stimulation_enabled), and returns the user to the Sign In screen.
68. The authenticated user's role persists across app restarts and session resumption.
69. Unauthenticated users cannot access any app route; they are redirected to the Sign In screen.
70. After successful authentication, a `student` role user is routed to the existing five-tab student ReEntry app.
71. After successful authentication, a `school_staff` role user is routed to the School workspace placeholder screen.
72. After successful authentication, a `clinician` role user is routed to the Clinician workspace placeholder screen.
73. Auth screens (Sign Up, Sign In) are accessible without authentication.
74. Auth screens use ReEntry's existing cream/Forest/yellow visual language with no new colors, fonts, or layout styles introduced.
75. No activity database, accommodations database, AI, messaging, notifications, payments, or wearables are added as part of the auth implementation.
76. The `user_preferences` table exists in Supabase with columns: id, user_id, appearance (light | dark, default light), low_stimulation_enabled (default false), updated_at.
77. On sign-in, the app loads the authenticated user's user_preferences row and applies their saved appearance and low_stimulation_enabled values to global state.
78. On sign-out, in-memory appearance and low_stimulation_enabled values are cleared; the interface returns to the default unauthenticated state (Light appearance, Low-Stimulation OFF).
79. The previous user's appearance or Low-Stimulation preference never determines the next user's experience.
80. A brand-new Student account starts with 0 activity_logs, 0 daily_checkins, no Journey/Tolerance history, and no accommodations unless genuinely created by that user or a linked clinician.
81. Demo data (Maya's 14-day dataset) is isolated and does not appear in real authenticated student accounts.
82. The Appearance toggle and Low-Stimulation Mode toggle on the Profile screen each reflect the current authenticated user's persisted values independently; changing one does not change the other.
83. Sign In and Create Account buttons are full-width rounded-rectangle buttons approximately 52-56px tall with visible background, clear padding, and visible boundary. Enabled: Forest fill, cream/white text. Disabled: muted Moss/gray-green surface, visible boundary, readable dark text.
84. Sign Out is a SecondaryButton (outlined rounded-rectangle) accessible on the Profile screen (Student) and on the School Staff and Clinician workspace placeholder screens.
85. The `activity_logs`, `challenge_tags`, `daily_checkins`, `accommodation_records`, `student_access`, and `user_preferences` tables exist in Supabase with the schemas defined in Section 20.
86. Row-level access rules enforce that students access only their own data; school staff access only actively linked students' minimum-necessary accommodation info; clinicians access only actively linked students' permitted recovery info and may create/update accommodations for linked students; users never read or update another user's user_preferences row.

---

## 15. Out of Scope — Foundation

Do not implement yet:

* Functional daily check-in submission
* Complete activity logging
* Interactive tolerance charts
* Full Recovery Terrain visualization
* Full Recovery Story insight generation
* \"Why am I seeing this?\" evidence interactions (beyond preserving existing behavior)
* Teacher View sharing via actual QR generation or external transmission
* Pass/QR sharing to external systems
* External AI
* Backend persistence beyond Supabase Auth session, role, user_preferences, and the schema defined in Section 20
* Notifications
* Messaging
* Payments
* Wearables
* Full clinician workspace functionality
* Full school staff workspace functionality
* Return-to-play features
* Severity estimation or prognosis
* Profile editing or account management

These belong to later build stages.

---

## 16. Foundation Build Instruction

Build only the reusable architecture, shared dataset, design system, five-tab mobile shell, polished Foundation screens, functional Teacher View modal, global Low-Stimulation Mode, data-flow verification and repair, microinteraction and consistency polish, authentication with role-aware routing, persistent backend schema, user-scoped settings, and control repair described here.

Do not implement later-stage functionality.

Do not invent additional features.

Preserve this architecture for subsequent incremental builds.

---

## 17. Microinteraction and Consistency Polish

This section defines the microinteraction and consistency polish task. No redesign, no new features, and no data changes are introduced.

### 17.1 Interaction Feedback — Pressed/Active States

Add restrained pressed/active states only where missing. Do not alter the visual design of controls in their default (unpressed) state.

Controls requiring pressed/active state coverage:

* PrimaryButton (all instances, including Sign In, Create Account, Show Pass)
* SecondaryButton (all instances, including Sign Out)
* Tappable activity cards (Today screen)
* Journey evidence expand/collapse controls
* Teacher View close/back control
* Profile Low-Stimulation Mode toggle
* Profile Appearance toggle
* Bottom navigation tab items

Pressed state behavior:

* Use a restrained opacity reduction or subtle background shift within the existing token palette.
* Do not use large scale changes, exaggerated color shifts, or decorative effects.
* Pressed states must not alter the control's size, layout, or surrounding content.
* Buttons must remain responsive without animated scaling when `prefers-reduced-motion` is active.

### 17.2 Motion — Transition Timing and Restraint

Normal transitions must generally be 120-180ms.

Apply restrained transitions to:

* Journey evidence expand/collapse
* Teacher View open/close
* Toggle state changes (Low-Stimulation Mode toggle, Appearance toggle)
* Button pressed feedback

Do NOT add:

* Bouncing
* Parallax
* Animated backgrounds
* Looping animations
* Confetti
* Exaggerated scaling
* Decorative motion of any kind

When `prefers-reduced-motion` is active OR Low-Stimulation Mode is active, remove or minimize all nonessential transitions defined in this section.

### 17.3 Navigation Consistency

Verify that bottom navigation behaves consistently across all five tabs.

* Exactly one tab must show a clear selected state at all times.
* Selected state must be visually unambiguous and consistent in appearance across all tabs.
* Do not redesign the navigation bar.

### 17.4 Visual Consistency Repairs

Repair only obvious unintentional inconsistencies. Do not normalize intentional differences between screens.

Repair targets:

* Accidentally mismatched border radius on cards or buttons sharing the same component
* Inconsistent card border treatment
* Accidental spacing mismatch (card padding deviating from 14-18px without design intent)
* Misaligned icon/text combinations within cards or list items
* Inconsistent button state rendering across instances of the same button component
* Text clipping on any screen
* Accidental horizontal overflow
* Elements hidden behind the bottom navigation bar

### 17.5 Mobile Interaction — Touch Target Adequacy

Ensure all important interactive controls are comfortably tappable.

* Controls that fall below approximately 44pt in either dimension must be expanded to meet the target without altering the surrounding layout or screen density.
* Do not create oversized controls.

### 17.6 Polish Constraints

Do NOT:

* Change colors, fonts, or icons
* Move major sections or alter screen layout
* Rewrite or alter any copy
* Add decorative graphics
* Remove botanical graphics when Low-Stimulation Mode is OFF
* Add features, screens, or data
* Alter the shared dataset
* Refactor unrelated working components
* Alter chart rendering beyond correcting overflow or clipping

---

## 18. Authentication and Role-Aware Routing

This section defines the authentication and role-aware routing task. No redesign of existing screens is introduced. No new features beyond auth and role routing are added. The student app is unchanged.

### 18.1 Authentication Provider

Use Supabase Auth for all authentication. Implement sign up, sign in, sign out, and session persistence.

No other authentication provider is used.

### 18.2 User Roles

Three authenticated roles exist:

* `student`
* `school_staff`
* `clinician`

The role must be stored with the authenticated user (in a minimal user profile record associated with the Supabase Auth user) and must persist across sessions and app restarts.

No additional backend data models are added beyond the minimum profile information needed to store the role and user_preferences.

### 18.3 Auth Screens

Two auth screens are required: Sign Up and Sign In.

**Sign Up screen:**

* Fields: email, password, role selection (student / school_staff / clinician).
* On successful sign up, create the Supabase Auth account, store the selected role, initialize a user_preferences row with defaults (appearance = light, low_stimulation_enabled = false), and route the user based on role.

**Sign In screen:**

* Fields: email, password.
* On successful sign in, restore the session and role, load user_preferences, and route the user based on role.
* Include a link or navigation action to the Sign Up screen.

**Visual language:** Auth screens must use ReEntry's existing cream/Forest/yellow design token system. Use existing PrimaryButton, SectionCard, HeadingText, BodyText, and LabelText components. PrimaryButton on auth screens must conform to the button specification in Section 11 (full-width, ~52-56px tall, Forest fill enabled, muted Moss/gray-green disabled).

**Sign out:** A SecondaryButton (outlined rounded-rectangle) labeled \"Sign Out\" must be accessible from within the app on the Profile screen (student) and on the School Staff and Clinician workspace placeholder screens. On sign out, the Supabase Auth session is cleared, in-memory UI preference state is cleared, and the user is returned to the Sign In screen.

### 18.4 Role-Aware Routing

After successful authentication (sign up or sign in), route based on role:

* `student` — existing five-tab student ReEntry app.
* `school_staff` — School workspace placeholder screen.
* `clinician` — Clinician workspace placeholder screen.

### 18.5 Placeholder Workspace Screens

**School workspace placeholder screen:**

* Simple screen indicating the user is authenticated as school staff.
* Uses ReEntry's existing visual language.
* No functional features beyond displaying the placeholder and a SecondaryButton Sign Out action.

**Clinician workspace placeholder screen:**

* Simple screen indicating the user is authenticated as a clinician.
* Uses ReEntry's existing visual language.
* No functional features beyond displaying the placeholder and a SecondaryButton Sign Out action.

### 18.6 Protected Routes

All app routes (Today, Tolerance, Journey, Pass, Profile, School workspace, Clinician workspace) must be protected. Unauthenticated users attempting to access any app route are redirected to the Sign In screen.

Auth screens (Sign Up, Sign In) are accessible without authentication.

### 18.7 Session Persistence

The Supabase Auth session must persist across app restarts. On app launch, if a valid session exists, the user is routed directly to the appropriate destination based on their stored role without requiring re-authentication. user_preferences are loaded as part of session restoration.

### 18.8 Auth Constraints

* Do not redesign any existing screen.
* Do not alter the student app beyond adding route protection.
* Do not add activity database, accommodations database, AI, messaging, notifications, payments, or wearables.
* No backend data models beyond the minimum profile record needed to store the user role and user_preferences.
* The Teacher View does not require authentication to open.

---

## 19. Out of Scope — Foundation (Updated)

Do not implement yet:

* Functional daily check-in submission
* Complete activity logging
* Interactive tolerance charts
* Full Recovery Terrain visualization
* Full Recovery Story insight generation
* \"Why am I seeing this?\" evidence interactions (beyond preserving existing behavior)
* Teacher View sharing via actual QR generation or external transmission
* Pass/QR sharing to external systems
* External AI
* Backend persistence beyond Supabase Auth session, role, user_preferences, and the schema defined in Section 20
* Notifications
* Messaging
* Payments
* Wearables
* Full clinician workspace functionality
* Full school staff workspace functionality
* Return-to-play features
* Severity estimation or prognosis
* Profile editing or account management

These belong to later build stages.

---

## 20. Fast Build — Persistent Backend, User-Scoped Settings, Control Repair

This section defines the Fast Build additions. No redesign of existing screens is introduced. Existing authentication, roles, role routing, and current ReEntry layouts (Today, Tolerance, Journey, Pass, Profile) are preserved unchanged.

### 20.1 Data Models — Supabase Tables

Create the following Supabase tables. No additional tables are added beyond these and the minimum auth profile record.

**activity_logs**

* id
* student_id (references auth user)
* activity_category
* activity_name
* duration_minutes
* manageability
* note (nullable)
* occurred_at
* created_at

**challenge_tags**

* id
* activity_log_id (references activity_logs.id)
* tag

**daily_checkins**

* id
* student_id (references auth user)
* checkin_date
* overall_manageability
* attendance_context (nullable)
* note (nullable)
* created_at

**accommodation_records**

* id
* student_id (references auth user)
* title
* source_type
* source_name (nullable)
* issued_date (nullable)
* valid_until (nullable)
* status
* created_by
* updated_at

**student_access**

* id
* student_id (references auth user)
* viewer_user_id (nullable, references auth user)
* viewer_role
* status
* access_code (nullable)
* created_at

**user_preferences**

* id
* user_id (references auth user, unique)
* appearance (values: light | dark; default: light)
* low_stimulation_enabled (boolean; default: false)
* updated_at

### 20.2 User-Scoped Appearance

Fix the current bug where Dark/Light appearance behaves like shared browser/app state.

* On sign-in, load the authenticated user's user_preferences row and apply their saved appearance value to global state.
* Appearance changes made by the current user are written to their user_preferences row and apply only to their session.
* On sign-out, clear the in-memory appearance value. The interface returns to the default unauthenticated appearance (Light).
* The previous user's appearance must never determine the next user's experience.
* A newly created account receives appearance = light by default.

### 20.3 Low-Stimulation Mode — Persistent User Preference

Low-Stimulation Mode is a real persistent user preference stored in user_preferences.low_stimulation_enabled.

* On sign-in, load the authenticated user's low_stimulation_enabled value and apply it to global state.
* Changes are written to user_preferences for the current authenticated user only.
* On sign-out, clear the in-memory low_stimulation_enabled value. The interface returns to Low-Stimulation OFF.
* The previous user's Low-Stimulation preference must never determine the next user's experience.
* A newly created account receives low_stimulation_enabled = false by default.

When Low-Stimulation Mode is ON:

* Remove: decorative botanical illustrations, contour/terrain textures, background patterns, looping animations, nonessential entrance animations, fades/slides, chart decoration, decorative shadows.
* Keep layouts calm.
* Do NOT hide: medical/recovery information, navigation, buttons, accessibility labels, data, permissions, chart data, status labels, functional icons.
* Do NOT change Appearance (light/dark).

When Low-Stimulation Mode is OFF, use the normal visual experience.

### 20.4 Profile Toggle State

The Profile screen must display both the Appearance toggle and the Low-Stimulation Mode toggle.

* Each toggle's visual state must reflect the current authenticated user's persisted value from user_preferences.
* Changing the Appearance toggle must not modify low_stimulation_enabled.
* Changing the Low-Stimulation Mode toggle must not modify appearance.
* Both toggles write only to their respective user_preferences column for the current user.

### 20.5 Auth Button Repair

Sign In and Create Account (Sign Up) primary action buttons must conform to the following specification:

* Shape: rounded-rectangle.
* Width: full-width.
* Height: approximately 52-56px tall.
* Visible background fill.
* Clear padding and visible boundary.
* Enabled state: Forest `#344431` fill, cream/white text.
* Disabled state: muted Moss/gray-green surface, visible boundary, readable dark text. Disabled buttons must remain recognizably buttons.

This applies the existing PrimaryButton specification from Section 11 to the auth screens.

### 20.6 Sign Out Button

Sign Out must be a SecondaryButton (outlined rounded-rectangle) for all three roles:

* Student: accessible on the Profile screen.
* School Staff: accessible on the School workspace placeholder screen.
* Clinician: accessible on the Clinician workspace placeholder screen.

On sign out:

* Terminate the Supabase Auth session.
* Clear the current user's active in-memory UI preference state (appearance and low_stimulation_enabled).
* Return the user to the Sign In screen.
* Protected routes must not remain accessible after sign out.

### 20.7 User Data Isolation

* A brand-new Student account must start with 0 activity_logs, 0 daily_checkins, no Journey/Tolerance history, and no accommodation_records unless genuinely created by that user or a linked clinician.
* Demo data (Maya's 14-day dataset) is isolated to the demo context and must not appear in real authenticated student accounts.
* No cross-account data leakage is permitted.

### 20.8 Access Rules

Row-level security must enforce the following:

**STUDENT:**

* Read and write own activity_logs, challenge_tags, daily_checkins, user_preferences, student_access records.
* Read own accommodation_records.
* No access to other users' rows in any table.

**SCHOOL STAFF:**

* Read and write own user_preferences.
* Read accommodation_records for actively linked students only (student_access.viewer_role = school_staff, status = active).
* Minimum-necessary accommodation information only (title, valid_until, source_type).
* No access to activity_logs, challenge_tags, daily_checkins, or other health data.

**CLINICIAN:**

* Read and write own user_preferences.
* Read permitted recovery information for actively linked students only (student_access.viewer_role = clinician, status = active).
* Create and update accommodation_records for actively linked students.
* No access to unlinked students' data.

**All roles:**

* Users must never read or update another user's user_preferences row.

### 20.9 Fast Build Constraints

* Do not rebuild authentication.
* Do not redesign Today, Tolerance, Journey, Pass, or Profile.
* Do not add AI, messaging, or notifications.
* Do not add features beyond those specified in this section.
* Preserve all existing functionality, visual design, and navigation.