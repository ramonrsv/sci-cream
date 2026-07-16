---
name: update-changelog
description: Update a package's CHANGELOG.md `[Unreleased]` section from the commits since its last release tag. Use when preparing a release for the `sci-cream` crate or the app, or when asked to write/refresh/regenerate an Unreleased section or "update the changelog". Runs `cargo release changes` / `scripts/release.sh changes`, rewrites the Unreleased section, and writes a `changes.log` audit report. Leaves everything uncommitted.
---

# Update CHANGELOG.md for a release

Turn the commits since a package's last release tag into its `[Unreleased]` section, plus an audit
report that accounts for every commit. Write the changes, then **stop and wait** — the user reviews
the diff, and only commits (Step 8) once they explicitly say so.

## Scope

Argument selects the package; no argument means **both**.

| Arg | Package directory | Release tags |
| --- | --- | --- |
| `sci-cream` | `packages/sci-cream` (the crate) | `sci-cream-v*` |
| `app` | `packages/app` (the Next.js app) | `app-v*` |

Both the `CHANGELOG.md` and the `changes.log` report live in that package directory.

Do the packages one at a time, start to finish. Their commit lists overlap but their audiences
differ, so entries are not transferable.

## Step 1 — list the commits

Run the package's own tool. Both stop at the package's last tag and filter to its paths:

```bash
cd packages/sci-cream && cargo release changes 2>&1   # crate — note the 2>&1
cd packages/app && ./scripts/release.sh changes       # app
```

`cargo release changes` prints **everything to stderr**. Without `2>&1` any pipe or capture yields
nothing, silently. (`release.sh` uses stdout normally.)

## Step 2 — cross-check the list against git, and reconcile

**`cargo release changes` under-reports — always cross-check it.** It resolves the package's file
list at HEAD, so a commit whose *only* touched files have since been renamed, split, or deleted
drops out of the listing entirely. Real example from the 0.0.7 cycle: `src/balancing.rs` was split
into `src/balancing/`, and four commits touching only that path — including a substantive
`Thread FastComposition through balancing` — were missing from the tool's output.

Get the authoritative list, then diff the two:

```bash
git log --format='%h %s' <last-tag>..HEAD -- :/packages/<pkg>   # sci-cream-v* / app-v*
```

The leading `:/` anchors the pathspec to the repo root. Keep it: Step 1 leaves the shell inside the
package directory, and a bare `-- packages/<pkg>` resolves relative to *that*, matching nothing and
printing **zero commits with no error** — an empty changelog that looks like "no changes".

`git log` is a superset and wins on completeness; treat anything only it reports as a real
candidate, not noise. If the counts differ, find each missing commit and judge it on its merits.
(`release.sh` filters by directory, so the app's list should already agree — if it doesn't, work out
why before continuing.) This reconciled list is the unit of accounting: by the end, every commit on
it is either cited by an entry or listed as unused with a reason.

## Step 3 — read the full commit messages

Both listings are `--oneline`; subjects are truncated to ~50 chars and the body carries what the
change actually did. Read the bodies before writing anything:

```bash
git log --format='%h%n%s%n%b%n---' <last-tag>..HEAD -- :/packages/<pkg>
```

A commit appearing in both packages' lists usually touched both. Frame its entry per audience — the
crate's changelog gets the API change, the app's gets the UI change — and only where user-visible.
When attribution is unclear, check what it actually touched with `git show --stat <sha>`.

## Step 4 — read the current Unreleased section

The section may already be populated by an earlier run of this skill. **Reconcile, don't clobber.**
Keep existing entries that still describe the end state, revise ones a later commit changed, drop
ones a later commit undid, and add what's missing. Preserve the existing wording where it still
holds — the user may have edited it by hand.

## Step 5 — write the entries

### Only the end state counts

The changelog describes the delta from the *last release* to the *next one*, not the path taken.

- Added then removed in the same cycle → **omit entirely**, both commits.
- Added then renamed/reworked → describe **only the final** name and shape, as a single entry.
- A bug introduced *and* fixed within the cycle → **not** a `Fixed` entry; it was never released.
  `Fixed` is only for bugs a released version actually had.
- Several commits building one feature → **one** entry citing all of them.

### Hard rules

- **One line per entry, maximum.** Need more? Make it a group (below) — never a second flat line.
- **≤100 characters per line**, including the `- ` marker and any indent. Prettier does not check
  `CHANGELOG.md`, so nothing catches an overrun but you. Verify with the command in Step 7.
- Sections in keepachangelog order: `Added`, `Changed`, `Fixed`, `Removed`. Omit empty ones.
- Backtick identifiers, paths, and struct/enum/field names (`CompKey::NetPAC`, `data/recipes/*`).
- Write for a consumer of the package, describing the change, not the commit that made it.
- Never touch `<!-- next-header -->`, `<!-- next-url -->`, released sections, or the link refs at
  the bottom — `cargo release` / `release.sh` own those.

### Groups

When one theme genuinely needs more than a line, use a parent line ending in `:` and indented
sub-bullets. This is the only way to exceed one line. Each sub-bullet is itself capped at one line
and 100 chars:

```markdown
- Further significant expansion of automatic recipe balancing functionality and usability:
  - Direct targeting of ABV and the FPD keys, translated to `Alcohol`/`AbsPAC`/`AbsNetPAC` proxies.
  - Ingredient locking via `Lock` of `Fraction` (of mix) or `Amount` (grams), incl. locked-at-zero.
```

### What to leave out

Skip these, and record each in the report with its reason:

- Release plumbing — `chore: Release ...`, "Update CHANGELOG.md for upcoming release".
- Commits touching only the *other* package (they appear in both listings when they touch both).
- Internal refactors, test-only, CI-only, and TODO-only commits with no user-visible surface.
- Work later reverted or superseded within the same cycle.

Skipping is a judgement call, not a formality: if a "refactor" changed a public signature, it is a
`Changed` entry. When genuinely torn, include it and say so in the report.

## Step 6 — write the report

Write `packages/<pkg>/changes.log` — plain text, untracked, gitignored. It exists so the user can
audit entry-by-entry without re-reading every commit.

```text
CHANGELOG report — <pkg>
Range:   <last-tag>..HEAD (<n> commits)
Command: <the Step 1 command>
Date:    <YYYY-MM-DD>

== Entries ==

### Added
- <entry text exactly as written in CHANGELOG.md>
    abc1234 Commit subject
    def5678 Commit subject

### Changed
...

== Unused commits ==

    1234abc Commit subject
        Release plumbing.
    5678def Commit subject
        App-only; no crate-visible change.

== Accounting ==
<n> commits = <x> cited + <y> unused
```

The accounting line must balance. A commit may back more than one entry — cite it in each and count
it once. If it doesn't balance, a commit was dropped silently; find it.

## Step 7 — verify

```bash
# Every line ≤100 chars — nothing else checks this.
awk 'length > 100 { print FILENAME ":" FNR ": " length " chars" }' packages/<pkg>/CHANGELOG.md
```

Then confirm: every entry is one line or a proper group; no entry describes work undone within the
cycle; the report's accounting balances; and `git status` shows **only** the `CHANGELOG.md` edit —
`changes.log` is gitignored, so it must not appear there. That ignore matters: both release tools
stage the whole package directory (`git add -- packages/app`), so an unignored report would be
swept into the release commit.

Report to the user: the entry count per section, the unused-commit count, and any call you were
unsure about. Then **stop and wait** — leave everything uncommitted for review.

## Step 8 — commit, once the user confirms

Only after the user explicitly says to commit ("commit this", "yes, commit"). Approval of the
*content* is not approval to *commit*: "looks good", "continue", and "what's next" are not
authorization — if that's all you have, ask. Commit on the current branch; don't branch first.

The subject names the **upcoming** version, so you need it before committing. The manifest still
holds the *previous* released version at this point — the release tool bumps it later — so read it
and apply the user's intended bump level:

```bash
grep -m1 -oP '^version = "\K[^"]+' packages/sci-cream/Cargo.toml   # crate
grep -m1 -oP '"version":\s*"\K[^"]+' packages/app/package.json     # app
```

Ask which level (patch/minor/major) unless the user already said; don't assume patch. It should
match the `cargo release <level>` / `release.sh release <level>` they run next, and the manifest
version should equal the last tag's — if it doesn't, stop and say so.

Stage only the changelog. `changes.log` is gitignored, so a precise `git add` keeps it out — never
`git add -A` or stage the package directory:

```bash
git add packages/sci-cream/CHANGELOG.md   # and nothing else
git commit -m 'Update `sci-cream/CHANGELOG.md` for 0.0.8 release' \
           -m 'Co-Authored-By: Claude <model> <noreply@anthropic.com>'

git add packages/app/CHANGELOG.md         # and nothing else
git commit -m 'Update `app/CHANGELOG.md` for 0.0.5 release' \
           -m 'Co-Authored-By: Claude <model> <noreply@anthropic.com>'
```

One commit per package (both packages → two commits). Keep the form
``Update `<pkg>/CHANGELOG.md` for <next-version> release`` verbatim, substituting only the version.

Mind the 50-char summary limit — the crate is the tight one, at 49 chars for a 5-char version. It
survives 6 (`0.0.10`, `10.0.0`, exactly 50) and breaks at 7 (`0.10.10`). Measure, don't eyeball:

```bash
s='Update `sci-cream/CHANGELOG.md` for 0.0.8 release'; echo "${#s}"   # must be ≤ 50
```

If a future version ever overflows, shorten with `rel` (``for 0.0.8 rel``, 45) rather than dropping
the version — earlier commits used `for upcoming <ver> rel`, which no longer fits the crate at 54.

Subject plus the trailer, no body: the changelog diff is its own description, and the precedent
commits (`0429fca7`, `8df6ffea`) carry no body. Fill in `<model>` with the actual model.

Then stop for real. **Never amend, push, or tag**, and never run `cargo release patch` or
`release.sh release` — the user owns the release commit, its tag, and the push.
