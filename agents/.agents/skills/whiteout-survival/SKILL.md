---
name: whiteout-survival
description: Use when the user asks any Whiteout Survival game question — heroes, skills, gear, troop training, research, alliances, beast hunts, events, fishing tournament, or any other game mechanic. Also use when updating Whiteout Survival notes in Obsidian.
---

# Whiteout Survival

## Workflow

```
1. Search Obsidian vault → read relevant notes
2. Answer from vault if complete
3. Gap or outdated? → search online (sources below)
4. New findings → update vault (use schematic-notes skill)
```

```bash
obsidian search query="<topic>" limit=10
obsidian read file="<note name>"
```

## Vault notes (wiki/)

| note | covers |
|------|--------|
| `whiteout survival - molly` | exploration skills (Super Snowball/Frost Ambush/Youthful Persistence), expedition skills (Calling of the Snow/Ice Dominion/Youthful Rage), star progression, Yeti Spirit Charm, mode-by-mode |
| `whiteout-survival - heroes & gear` | hero roster + gear levels, team compositions, upgrade decisions, exploration skill decisions |
| `whiteout survival - expedition skills & rally buffs` | expedition skill mechanics, joiner vs leader distinction, upgrade rules, card costs |
| `whiteout survival - troop training` | train vs promote, troop priority, bear trap formation |
| `whiteout survival - tech research` | research priority, RC/furnace milestones, Daybreak Island, Jasser bonus |
| `whiteout survival - arena` | points ladder mechanics, points per win (+9/+10-12), targeting strategy, daily limits, timing tips |
| `whiteout survival - SR heroes` | Epic (purple) hero roster, expedition skill values per level, upgrade priority; includes ¬-SR clarifications (Eugene/Charlie/Smith = Rare/blue tier) |
| `whiteout survival - growth heroes` | Charlie/Cloris/Smith (Rare/blue tier) gather hero skill types, level curve, upgrade priority (gather speed > city output) — note: Eugene is Rare tier, ¬ SR |

New notes may exist — always run `obsidian search` first rather than assuming the table above is complete.

## Trusted sources (ranked)

1. **onechilledgamer.com** — most complete, has per-level skill scaling data; search `onechilledgamer.com whiteout survival <topic>`
2. **whiteoutsurvivalhandbook.com/guides/** — full hero + mechanic guides; JS-rendered (may need headless browser)
3. **allclash.com/whiteout-survival/** — strategic advice, upgrade priorities
4. **pillarofgaming.com** — gear, tier lists, hero comparisons
5. **theriagames.com** — mode-by-mode (exploration/arena/expedition) breakdowns
6. **heaven-guardian.com** — mechanic explanations (joiner vs leader, troop counter-types)
7. **whiteoutsurvival.wiki/heroes/** — base stats and skill lists; **may be outdated pre-2024** (verify against newer sources)

## Key distinctions (easy to confuse)

- **expedition skills** = troop buffs, active only when hero marches with troops (PvP/beasts/rallies) — upgraded with purple expedition cards
- **exploration skills** = hero combat skills in Exploration PvE and Arena — upgraded with gold/mythic skill manuals
- **rally joiner vs leader**: joiner only contributes hero's 1st expedition skill; leader contributes all 3 — changes upgrade priority entirely (see vault note)
- **server age matters**: hero shard sources change ~Day 195; Mia (Gen 3 Lancer) available ~Day 120
- **SR = Epic (purple), ¬ Rare (blue)**: Eugene/Charlie/Smith = Rare tier gather heroes; Jessie/Sergey/Gina/Bahiti etc. = SR/Epic tier combat heroes

## Vault update rules

- **mandatory**: after every answer that used online research or revealed new/missing info, update vault before ending the turn
- use **schematic-notes** skill for all vault writes
- add new findings to existing notes where relevant; create new note only if topic has no existing home
- always add sources section with URLs
- flag data conflicts between sources explicitly
- update the vault notes table in this skill if a new note is created
