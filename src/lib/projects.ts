// Projects and partners as pages use them (rebuild plan §4.2, §4.6), and the
// check that every reference between collections names an entry that exists:
// a publication's `projects` and a project's `partners` are slugs, which the
// CMS picks from a list but a hand edit could mistype. A bad slug fails the
// build with the file that holds it.
import { getCollection, type CollectionEntry } from 'astro:content';
import { PARTNER_ROLES, PROJECT_STATUSES } from '../content/_fields.ts';

export interface PartnerData {
  name: string;
  slug: string;
  url?: string;
  roles: (typeof PARTNER_ROLES)[number][];
  logo?: string;
  note?: string;
}

export interface ProjectData {
  name: string;
  shortName?: string;
  slug: string;
  summary: string;
  status: (typeof PROJECT_STATUSES)[number];
  url?: string;
  partners: string[];
  image?: string;
  imageAlt?: string;
  sources: string[];
}

export interface Partner extends PartnerData {
  /** Projects that name this partner, in project order. */
  projects: Project[];
}

export interface Project extends ProjectData {
  entry: CollectionEntry<'projects'>;
  /** What lists and filters call it: the short name, else the name. */
  label: string;
  partnerList: PartnerData[];
}

export const STATUS_LABEL: Record<ProjectData['status'], string> = {
  active: 'Active',
  completed: 'Completed',
};

export const projectPath = (slug: string): string => `projects/${slug}/`;

/** Throws if two files share a slug. */
function bySlug<T extends { slug: string }>(rows: { data: T; file: string }[], what: string): Map<string, T> {
  const out = new Map<string, T>();
  const files = new Map<string, string>();
  for (const { data, file } of rows) {
    if (files.has(data.slug)) throw new Error(`${what} slug "${data.slug}" is set in both ${files.get(data.slug)} and ${file}`);
    files.set(data.slug, file);
    out.set(data.slug, data);
  }
  return out;
}

let memo: Promise<{ projects: Project[]; partners: Partner[] }> | undefined;

async function load() {
  const partnerEntries = await getCollection('partners');
  const partners = bySlug(partnerEntries.map((e) => ({ data: e.data as PartnerData, file: e.filePath ?? e.id })), 'partner');

  const projectEntries = await getCollection('projects');
  bySlug(projectEntries.map((e) => ({ data: e.data as ProjectData, file: e.filePath ?? e.id })), 'project');
  const projects: Project[] = projectEntries.map((entry) => {
    const data = entry.data as ProjectData;
    const partnerList = data.partners.map((s) => {
      const p = partners.get(s);
      if (!p) throw new Error(`${entry.filePath}: partner "${s}" is not a slug in src/content/partners/`);
      return p;
    });
    return { ...data, entry, label: data.shortName ?? data.name, partnerList };
  });
  // Active first, then by name.
  const rank = (p: Project) => PROJECT_STATUSES.indexOf(p.status);
  projects.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));

  const partnerList: Partner[] = [...partners.values()]
    .map((p) => ({ ...p, projects: projects.filter((x) => x.partners.includes(p.slug)) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Publications name projects by slug.
  const known = new Set(projects.map((p) => p.slug));
  for (const e of await getCollection('publications')) {
    for (const s of (e.data as { projects: string[] }).projects) {
      if (!known.has(s)) throw new Error(`${e.filePath}: project "${s}" is not a slug in src/content/projects/`);
    }
  }
  return { projects, partners: partnerList };
}

const data = () => (memo ??= load());

/** Every project, active first. */
export const getProjects = async (): Promise<Project[]> => (await data()).projects;

/** Every partner, by name, with the projects that name it. */
export const getPartners = async (): Promise<Partner[]> => (await data()).partners;

/** Slug → project, for labelling a publication's projects. */
export async function projectsBySlug(): Promise<Map<string, Project>> {
  return new Map((await getProjects()).map((p) => [p.slug, p]));
}
