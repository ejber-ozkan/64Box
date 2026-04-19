const performanceIndexes = [
  ["Games", "idx_games_ga_id", "CREATE INDEX IF NOT EXISTS idx_games_ga_id ON Games(GA_Id)"],
  ["Games", "idx_games_name_nocase", "CREATE INDEX IF NOT EXISTS idx_games_name_nocase ON Games(Name COLLATE NOCASE)"],
  ["Games", "idx_games_ye_id", "CREATE INDEX IF NOT EXISTS idx_games_ye_id ON Games(YE_Id)"],
  ["Games", "idx_games_ge_id", "CREATE INDEX IF NOT EXISTS idx_games_ge_id ON Games(GE_Id)"],
  ["Games", "idx_games_de_id", "CREATE INDEX IF NOT EXISTS idx_games_de_id ON Games(DE_Id)"],
  ["Games", "idx_games_pu_id", "CREATE INDEX IF NOT EXISTS idx_games_pu_id ON Games(PU_Id)"],
  ["Games", "idx_games_mu_id", "CREATE INDEX IF NOT EXISTS idx_games_mu_id ON Games(MU_Id)"],
  ["Games", "idx_games_la_id", "CREATE INDEX IF NOT EXISTS idx_games_la_id ON Games(LA_Id)"],
  ["Games", "idx_games_pr_id", "CREATE INDEX IF NOT EXISTS idx_games_pr_id ON Games(PR_Id)"],
  ["Games", "idx_games_ar_id", "CREATE INDEX IF NOT EXISTS idx_games_ar_id ON Games(AR_Id)"],
  ["Games", "idx_games_classic", "CREATE INDEX IF NOT EXISTS idx_games_classic ON Games(Classic)"],
  ["Games", "idx_games_adult", "CREATE INDEX IF NOT EXISTS idx_games_adult ON Games(Adult)"],
  ["Years", "idx_years_ye_id", "CREATE INDEX IF NOT EXISTS idx_years_ye_id ON Years(YE_Id)"],
  ["Genres", "idx_genres_ge_id", "CREATE INDEX IF NOT EXISTS idx_genres_ge_id ON Genres(GE_Id)"],
  ["Genres", "idx_genres_pg_id", "CREATE INDEX IF NOT EXISTS idx_genres_pg_id ON Genres(PG_Id)"],
  ["PGenres", "idx_pgenres_pg_id", "CREATE INDEX IF NOT EXISTS idx_pgenres_pg_id ON PGenres(PG_Id)"],
  ["Developers", "idx_developers_de_id", "CREATE INDEX IF NOT EXISTS idx_developers_de_id ON Developers(DE_Id)"],
  ["Publishers", "idx_publishers_pu_id", "CREATE INDEX IF NOT EXISTS idx_publishers_pu_id ON Publishers(PU_Id)"],
  ["Musicians", "idx_musicians_mu_id", "CREATE INDEX IF NOT EXISTS idx_musicians_mu_id ON Musicians(MU_Id)"],
  ["Languages", "idx_languages_la_id", "CREATE INDEX IF NOT EXISTS idx_languages_la_id ON Languages(LA_Id)"],
  ["Programmers", "idx_programmers_pr_id", "CREATE INDEX IF NOT EXISTS idx_programmers_pr_id ON Programmers(PR_Id)"],
  ["Artists", "idx_artists_ar_id", "CREATE INDEX IF NOT EXISTS idx_artists_ar_id ON Artists(AR_Id)"],
  ["Extras", "idx_extras_ga_id", "CREATE INDEX IF NOT EXISTS idx_extras_ga_id ON Extras(GA_Id)"],
  ["Extras", "idx_extras_ga_id_display_order", "CREATE INDEX IF NOT EXISTS idx_extras_ga_id_display_order ON Extras(GA_Id, DisplayOrder)"],
];

const supportObjects = [
  { name: "GameView", type: "view" },
  { name: "GameCoverIndex", type: "table" },
  { name: "idx_game_cover_index_ga_id", type: "index" },
  { name: "GameSearchIndex", type: "table" },
];

module.exports = {
  performanceIndexes,
  supportObjects,
};
