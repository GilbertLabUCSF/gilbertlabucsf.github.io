# Gilbert Lab Website

A [Jekyll](https://jekyllrb.com/) site hosted on GitHub Pages. Content lives in
plain data files under `_data/`, so most updates don't require touching any HTML.

## For Content Editors

**Almost everything you'll want to change lives in the `_data/` folder.** Edit a
file, commit/push it, and GitHub rebuilds the site automatically (usually within
a minute).

| What to update | File to edit |
|----------------|--------------|
| Team — PI, scientists, students, staff | `_data/team.yml` |
| Alumni | `_data/alumni.yml` |
| Publications | `_data/publications.yml` |
| Research areas | `_data/research.yml` |
| Protocols & resources | `_data/protocols.yml` |
| Lab events | `_data/events.yml` |

### Format basics

The data files are [YAML](https://learnxinyminutes.com/docs/yaml/). The rules:

- Keep the **indentation** (2 spaces) exactly as shown.
- Each list entry starts with `- `.
- Each property is `key: value`.
- If a value contains a colon followed by a space, wrap it in quotes.

### Add a team member

In `_data/team.yml`, add an entry under `scientists`, `students`, or `staff`:

```yaml
  - name: Jane Doe
    role: Postdoc
    photo: images/team/jane.jpg
    linkedin: https://www.linkedin.com/in/janedoe/   # optional
```

### Add an alumnus

In `_data/alumni.yml` (kept alphabetical):

```yaml
- name: Jane Doe
  years: 2020-2024          # optional
  current: Scientist, Acme Bio   # optional
  linkedin: https://www.linkedin.com/in/janedoe/   # optional
```

### Add a publication

In `_data/publications.yml` (newest first):

```yaml
- year: 2026
  title: Your paper title
  authors: Doe J et al.
  journal: Nature
  url: https://doi.org/10.xxxx/xxxxx
```

### Edit a research area

In `_data/research.yml`. The `icon` picks one of the built-in SVGs
(`helix`, `nodes`, `screen`, `network`, `cells`, `shield`):

```yaml
  - title: New Area
    icon: helix
    description: One or two sentences describing the work.
```

### Add a lab event

In `_data/events.yml` (newest first; the carousel shows the 12 most recent, so a new entry with a recent date appears automatically):

```yaml
- date: 2026-05-01
  title: "Lab Retreat"
  description: "Annual offsite"   # optional
  image: images/events/retreat-2026.jpg
```

## Adding photos

1. Put the image in `images/team/`.
2. Reference it in the YAML as `images/team/filename.jpg`.
3. Square-ish portraits work best (e.g. 400×500).

## Previewing locally (optional)

The live site builds on GitHub automatically — you don't need any of this just to
publish. To preview before pushing, you need Jekyll once:

```bash
gem install bundler jekyll
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000. (Because the site is now templated, opening
`index.html` directly via `file://` will not render the content — use the
local server, or just push and view the live site.)

## Notes

- **Don't hand-edit** `index.html`, `css/`, or `js/` for content changes — use the
  `_data/` files.
- `_config.yml` holds site-wide settings.
- The DNA-helix hero animation lives in `js/main.js`.
