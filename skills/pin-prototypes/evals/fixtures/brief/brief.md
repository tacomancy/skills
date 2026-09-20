# Ledger — brief

Ledger is a reading log for one person: every book they own, are reading, or have finished, with the notes they took while reading. It is a desktop web application. It must feel like a private study, not a storefront: no covers as the primary object, no ratings, no recommendations.

## Objects

- **Book** — title, author, year, shelf (owned / reading / finished), date started, date finished.
- **Note** — a dated paragraph attached to one book, with an optional page number.
- **Shelf** — one of three fixed states of a book; a book is on exactly one shelf.

## Surfaces

### Library

Every book, grouped by shelf. A realistic library has three hundred books, forty of them with notes, six on the reading shelf. A book moves between shelves by an action on the row; moving to *finished* sets the finish date to today and cannot be undone from this surface. Sort is by date finished, newest first, within the finished shelf, and by date started within reading; owned has no order the user controls.

### Book

One book with all its notes in page order, then date order for notes without a page. A book with sixty notes is common. Adding a note takes one field and an optional page number; a note is edited in place; deleting a note asks once. The shelf and its dates are shown and changeable here with the same rule as the library.

### Notes across books

Every note, newest first, each showing its book's title. Searching filters notes by their text only — never by title or author. A realistic count is two thousand notes. Clicking a note opens its book with that note in view.

## Constraints

- One user, no sharing, no accounts.
- The typeface and palette come from the brand kit; the design tool proposes neither.
- Keyboard: `n` starts a new note on the book surface; `/` focuses search on the notes surface.
