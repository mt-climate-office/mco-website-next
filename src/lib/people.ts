// The people collection as the team page uses it: current people only, in
// the page's groups, each group in its `order`.
import { getCollection, type CollectionEntry } from 'astro:content';
import { PEOPLE_GROUP_LABELS, PEOPLE_GROUPS } from '../content/_fields.ts';

export interface PersonData {
  name: string;
  role: string;
  group: (typeof PEOPLE_GROUPS)[number];
  order: number;
  current: boolean;
  photo?: string;
  photoAlt?: string;
  email?: string;
  orcid?: string;
  github?: string;
  website?: string;
}

export interface Person extends PersonData {
  entry: CollectionEntry<'people'>;
  /** The element id of the person's card, from the file name. */
  id: string;
}

export interface PeopleGroup {
  key: PersonData['group'];
  label: string;
  people: Person[];
}

/** Current people by group, in page order; empty groups are left out. */
export async function getTeam(): Promise<PeopleGroup[]> {
  const people: Person[] = (await getCollection('people')).map((entry) => {
    const data = entry.data as PersonData;
    return { ...data, entry, id: `person-${entry.id}` };
  });
  return PEOPLE_GROUPS.map((key) => ({
    key,
    label: PEOPLE_GROUP_LABELS[key],
    people: people.filter((p) => p.current && p.group === key)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
  })).filter((g) => g.people.length > 0);
}
