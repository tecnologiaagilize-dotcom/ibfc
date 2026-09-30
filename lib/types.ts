export type Candidate = {
  id: string;
  name: string;
  ballot_name?: string | null;
  slug: string;

  state_uf: string;
  state_name: string;

  cargo: string;
  party: string | null;
  number: string | null;

  /* FOTO */
  photo_url: string | null;
  photo_position_x: number;
  photo_position_y: number;
  photo_zoom: number;

  /* PÁGINA EXTERNA */
  external_page_url: string | null;

  /* CONTEÚDO */
  biography: string | null;
  proposals: string | null;

  /* REDES E LINKS */
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  website_url: string | null;

  /* PUBLICAÇÃO */
  status: "draft" | "published";
};

export type State = {
  uf: string;
  name: string;
  region: string;
};
