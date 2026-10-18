export function presentComposeEntry(entry: {
  name: string;
  directory: string;
  description?: string;
  remote?: string;
  id?: string;
}) {
  return {
    name: entry.name,
    directory: entry.directory,
    ...(entry.id === undefined ? {} : { entry: entry.id }),
    ...(entry.description === undefined ? {} : { description: entry.description }),
    ...(entry.remote === undefined ? {} : { remote: entry.remote }),
  };
}
