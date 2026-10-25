// The public MCO News list on Listmonk (DECISIONS D11, D15, D28), which the
// footer's signup form subscribes to. The owner creates the list with
// mco-mailing-lists/scripts/listmonk_news_bootstrap.py; set `uuid` to the
// UUID it prints. While `uuid` is null the form is not rendered and no page's
// CSP allows posting to Listmonk.

export const NEWS_LIST = {
  /** The list's UUID: the form's hidden `l` field. */
  uuid: null as string | null,
  /** Listmonk's public form endpoint. Rate-limited in its Caddy (D15). */
  action: 'https://lists.climate.umt.edu/subscription/form',
};

/** The origin the form posts to, for the CSP's form-action. */
export const NEWS_LIST_ORIGIN = new URL(NEWS_LIST.action).origin;
