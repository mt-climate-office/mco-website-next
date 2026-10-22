# Voice — Montana Climate Office website

How copy on `climate.umt.edu` is written. This applies to every word that
ships: headings, body, buttons, labels, captions, error states, alt text,
commit-adjacent content like release notes. It does not apply to code
comments.

**The office did not have a written voice before this document.** It was
derived from the one place the office already writes well: the microcopy
inside its own tools. Those lines were written to be used, not approved, and
they are the model.

---

## The model

```
Partly cloudy tonight, calm, no precipitation in 3 days.
Updated 17 min ago · Provisional
1 station hidden (no report in 3 h)
Only HydroMet stations require a Maintenance visit at least once per
  calendar year (a Repair visit does not count).
Cell status subject to change
```

Dry. Exact. Qualified in line. Assumes the reader is competent. Never sells.

## The anti-model

From the live site, retained here so it is recognisable, not reproduced:

```
The MCO sits at the nexus of two of America's great river basins… No other
provider of climate information has within their mission the goal of
assimilating, organizing, and disseminating climate information across
providers for the benefit of a large and diverse stakeholder community.
```

Written to be approved. Says nothing a reader can act on. If a draft could
sit in that paragraph without friction, rewrite it.

---

## Six rules

1. **Lead with the number or the measurement**, not a claim about it.
2. **Name the specific thing** — the place, the index, the program, the
   county. "59 inches at Lolo Pass", not "significant snowfall".
3. **Put the limit in the same sentence as the claim.** Provisional. In
   review. As of. Subject to change. This is where authority comes from for a
   data office; naming a limit is not conceding one.
4. **One idea per sentence.** If the second clause restates the first, cut it.
5. **Use the verbs you would use out loud**: measure, check, publish, run,
   visit, fix, install. Not deliver, provide, strive, leverage, empower,
   facilitate.
6. **Never describe the office.** Let the figures do it. There is exactly one
   page where the office may describe itself, and it is `/about/`.

Rule 3 is the distinctive one. Rule 6 is the one that kills most bad drafts.

---

## Test for "service-oriented"

Every page makes clear what the reader can do next. A page that only informs
is an about page, and the site has one.

---

## Rewrites

| Instead of | Write |
|---|---|
| "a variety of meteorological variables" | "air temperature, humidity, wind, precipitation, and soil moisture at four depths" |
| "high-quality, timely, relevant, and scientifically based climate information" | "253 stations. Every reading checked before it is published. Free to anyone." |
| "🚨 NEW TOOL ALERT! 🚨 Mesonet Photo Explorer Now Live!" | "Mesonet Photo Explorer — photos from 152 station cameras, on one map, searchable by direction and time." |
| "Conditions across the state" | "How dry is it?" |
| "Start where you work" | "Where people usually start" |
| "Our mission is to provide…" | (delete; show the numbers) |

---

## Banned constructions

These are the tells that make copy read as machine-written. None of them
appear in the tools' microcopy, and none should appear on the site.

- **Antithesis with a semicolon or colon.** "Sensors tell you the number;
  these tell you the season." Never.
- **"Not X, but Y"** framing.
- **Colon-then-reveal.** "One thing matters above all: soil moisture."
- **Tricolon.** "whether the grass came back, whether the snow held, whether
  the smoke rolled in." Pick one.
- **Em-dash asides** carrying the real content.
- **Tracked-out ALL-CAPS eyebrow labels** above headings.
- **Meta strings joined with middle dots** as decoration. (A timestamp line
  like `Oct 21, 3:00 PM · facing north` is data, and is fine.)
- **"→" appended to link text.**
- **Stock openers**: "In today's rapidly changing climate…", "It's worth
  noting that…", "Whether you're a rancher or a researcher…"
- **Emoji**, including in headings and news posts.

## Banned words

deliver (except of physical things), provide, strive, robust, leverage,
empower, facilitate, utilize, seamless, cutting-edge, state-of-the-art,
world-class, comprehensive, holistic, stakeholder-facing, actionable insights,
unlock, journey, solution, ecosystem (unless literally ecological).

"Stakeholder" is permitted in grant and policy contexts where it is the term
of art. It does not belong on a public page.

---

## Specifics that change

Never state these in prose; read them from data and let the UI show them.

- The number of stations, cameras, or reporting stations
- The photo capture schedule (it is changing; see the rebuild plan §1.4.3)
- Any "as of" date
- Percentages of network health

A sentence that will be wrong next quarter is a sentence to rewrite now.

---

## Claims

Do not invent supporting claims. An earlier draft of this site's copy
contained "the measurement most Montana producers ask for first", which was
fabricated. If a claim about what users want or do is not sourced, cut it or
mark it for someone to verify.
