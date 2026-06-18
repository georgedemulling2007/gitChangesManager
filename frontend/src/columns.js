// The four board columns. `id` is the category value sent to the backend
// (empty string = Uncategorized, which the server treats as "clear").
export const COLUMNS = [
  { id: '', title: 'Uncategorized' },
  { id: 'needs-review', title: 'Needs More Review' },
  { id: 'reviewed', title: 'Reviewed' },
  { id: 'ignore', title: 'Ignore for Now' },
];
