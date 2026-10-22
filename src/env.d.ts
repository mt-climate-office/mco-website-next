interface ImportMetaEnv {
  /** Set in astro.config.mjs: the production origin, for canonical URLs. */
  readonly MCO_CANONICAL_ORIGIN: string;
  /** Set in astro.config.mjs: true only for a deploy to the production host. */
  readonly MCO_INDEXABLE: boolean;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
