---
name: whois
description: "Biographical and intellectual profile of a philosopher, theorist, or author. Always use this skill for /whois — do not attempt a free-form answer without it. Also trigger when the user asks 'who is X' / 'tell me about X' in an academic context, or when an unfamiliar name appears during a reading session."
---

# /whois — Philosopher & Author Profile

## Invocation

```
/whois [name]
/whois [name] extended
```

`extended` triggers fuller treatment: longer sections, more secondary literature, deeper
engagement with controversies and reception history.

Default mode is **concise but complete** — every standing section appears, even briefly.

---

## Output Structure

Produce sections in this order. Mark optional sections only when they apply.

---

### 1. 🗓 Life & Context

- Full name, dates (b.–d. or b.–), nationality, institutional base(s)
- Where they lived and worked; relevant cities, universities, political contexts
- Brief sketch of the intellectual milieu they emerged from (what was happening
  philosophically, politically, historically around them)

---

### 2. 📚 Major Works

List 3–7 key texts with years. For each, one sentence on what it does or why it matters.
In `extended` mode, add a sentence on reception or influence.

---

### 3. 🧭 Theoretical Tradition

- Name the tradition(s): phenomenology, analytic philosophy, structuralism, critical theory,
  pragmatism, post-structuralism, etc.
- Their methodological orientation if distinctive (genealogy, dialectics, ordinary language, etc.)

---

### 4. 🏴 Political Orientation

**This section always appears.** Be direct and non-evasive. Cover:

- Their general political orientation: Marxist, socialist, communist, anarchist, left-liberal,
  liberal, conservative, reactionary, apolitical, etc. If multiple apply or evolved over time,
  say so.
- **If they have any relationship to Marxism — go deeper:**
  - Which Marxist tradition or school? (Frankfurt School, Althusserian, Gramscian, Lukácsian,
    humanist Marxism, autonomist, etc.)
  - Sympathetic, critical, or selective engagement with Marx?
  - If anti-capitalist: what form? (council communist, democratic socialist, autonomist,
    eco-socialist, revolutionary vs. reformist, etc.)
  - If they critiqued or revised Marx: what was the core of the critique?
- **If not Marxist:** what is their relationship to it? Did they explicitly reject it, ignore it,
  partially appropriate it, critique it from the right or left? Were they influenced by Marxists
  even if not Marxist themselves?

Example of honest treatment for a non-Marxist: *"Husserl had no significant engagement with
Marxist theory. His work is politically unaffiliated; he was concerned with the foundations of
consciousness rather than social or economic structures."*

In `extended` mode: discuss specific texts or passages where the political stance becomes
explicit, or secondary literature on the question.

---

### 5. 🔗 Key Relationships & Influences

- **Influenced by:** key predecessors or contemporaries whose work shaped theirs
- **Influenced:** thinkers who drew heavily on their work
- **Personal/institutional connections:** life partners, close collaborators, teachers, students —
  especially where the relationship is also intellectually significant (e.g. Sartre & de Beauvoir,
  Heidegger & Arendt, Marx & Engels)

---

### 6. ⚔️ Dialogues & Critiques *(only when substantive)*

Include only when there is something meaningful to say. Structure around whichever of these apply:

- **Critiques of their work:** prominent objections, schools of criticism, well-known attacks on
  their positions
- **Their critiques of others:** sustained engagements where they take a critical stance toward
  another thinker's work
- **Notable dialogues:** documented intellectual exchanges or debates — e.g. Fraser–Honneth on
  recognition and redistribution, Habermas–Foucault on modernity and reason
- **Controversies:** biographical or political scandals that bear on reception of the work —
  e.g. Heidegger's Nazism, Althusser's crime, de Man's wartime journalism

---

### 7. 📍 Situating in Current Context *(only when in an active reading session)*

If `/whois` is invoked during a reading session involving a specific text or author, and there is
a meaningful connection between the looked-up author and that context, add a brief note:

- How does this author relate to the text or thinker currently being read?
- Did they engage directly? Are they a source, a critic, a disciple, a contemporary?
- Why might this name appear in that text?

Omit this section if invoked outside a reading context or if no meaningful connection exists.

---

## Tone & Style

- Write in clear, direct prose. No excessive hedging.
- Use **bold** sparingly for names and tradition labels.
- Avoid hagiography — note limitations, critiques, and contested legacy where relevant.
- For the Marxism section especially: be honest about political orientation. Don't soften or
  obscure it. Glenn is a Marxist philosopher — he wants accurate, substantive political
  characterisation, not bland neutrality.
- If something is genuinely uncertain or disputed, say so briefly rather than overclaiming.

---

## Edge Cases

- **Non-philosopher authors** (novelists, scientists, political figures): apply the same structure,
  skip sections that don't apply, adapt terminology.
- **Very obscure figures**: if knowledge is sparse, say so explicitly rather than padding. Give
  what is known and flag uncertainty.
- **Living authors**: note that reception and influence are still developing where relevant.
- **`extended` modifier**: produce fuller paragraphs throughout; add secondary literature
  references where useful; expand the Marxism and Controversies sections especially.
