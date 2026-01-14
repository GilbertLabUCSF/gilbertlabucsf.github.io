# Gilbert Lab Website

## For Content Editors (Non-Technical Users)

This guide explains how to update website content. **You only need to edit files in the `content/` folder.**

---

## Quick Start

1. Open the file you want to edit in any text editor
2. Make your changes following the format examples below
3. Save the file
4. Refresh the website to see your changes

---

## File Locations

| What to Update | File to Edit |
|----------------|--------------|
| Lab events | `content/events.md` |
| Protocols & resources | `content/protocols.md` |
| Alumni list | `content/alumni.md` |
| Publications | `content/publications.md` |
| Research areas | `content/research.md` |
| Team - Scientists | `content/team/scientists.md` |
| Team - Students | `content/team/students.md` |
| Team - Staff | `content/team/staff.md` |
| PI info | `content/team/pi.md` |

---

## How to Edit Each Section

### Adding a Lab Event

Open `content/events.md` and add a new event under "Upcoming" or "Past":

```markdown
### Event Title
- date: January 20, 2026
- presenter: Person Name
- topic: What the event is about
```

### Adding a Protocol

Open `content/protocols.md` and add:

```markdown
## Protocol Name
- description: Brief description of what this protocol covers.
- file: protocols/filename.pdf
```

For external links instead of PDFs:
```markdown
## Resource Name
- description: Brief description.
- link: https://example.com/resource
```

### Adding an Alumni

Open `content/alumni.md` and add:

```markdown
## Person Name
- years: 2020-2024
- current: Current Position, Company/University
```

### Adding a Publication

Open `content/publications.md` and add under the appropriate year:

```markdown
### Paper Title
- authors: LastName A et al.
- journal: Journal Name
- doi: 10.1234/example.doi
```

### Adding a Team Member

Open the appropriate file in `content/team/`:
- Scientists/Postdocs: `scientists.md`
- Graduate Students: `students.md`
- Staff: `staff.md`

Add:
```markdown
## Person Name
- role: Their Role
- photo: images/team/filename.jpg
```

---

## Adding Photos

1. Put the photo file in the `images/team/` folder
2. Reference it in the markdown file as `images/team/filename.jpg`
3. Recommended: Square photos work best (e.g., 400x400 pixels)

---

## Important Notes

- **Don't change the `##` symbols** - these mark section headers
- **Keep the `- ` before each property** - this is required formatting
- **Don't edit `index.html`** - that's the template file
- **Don't edit files in `css/` or `js/`** - those control styling

---

## Need Help?

Contact the lab webmaster or see the [Markdown Guide](https://www.markdownguide.org/basic-syntax/) for formatting help.
