export type DiscoverContentType =
  | "popular"
  | "topRated"
  | "onTheAir"
  | "nowPlaying"
  | "latest"
  | "latest4k"
  | "latesttv"
  | "genre"
  | "provider"
  | "editorPicks"
  | "recommendations";

export type MediaType = "movie" | "tv";

export interface UseDiscoverMediaProps {
  contentType: DiscoverContentType;
  mediaType: MediaType;
  id?: string;
  fallbackType?: DiscoverContentType;
  page?: number;
  genreName?: string;
  providerName?: string;
  mediaTitle?: string;
  isCarouselView?: boolean;
  enabled?: boolean;
}

export interface DiscoverMedia {
  id: number;
  title: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  type?: "movie" | "show";
}

export interface UseDiscoverMediaReturn {
  media: DiscoverMedia[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  sectionTitle: string;
  actualContentType: DiscoverContentType;
}

export interface Provider {
  name: string;
  id: string;
}

export interface Genre {
  id: number;
  name: string;
}

// Shuffle array utility
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Editor Picks data
export interface EditorPick {
  id: number;
  type: "movie" | "show";
}

const MOVIES_DATA: EditorPick[] = [
  { id: 9342, type: "movie" }, // The Mask of Zorro
  { id: 293, type: "movie" }, // A River Runs Through It
  { id: 370172, type: "movie" }, // No Time To Die
  { id: 661374, type: "movie" }, // The Glass Onion
  { id: 207, type: "movie" }, // Dead Poets Society
  { id: 378785, type: "movie" }, // The Best of the Blues Brothers
  { id: 335984, type: "movie" }, // Blade Runner 2049
  { id: 13353, type: "movie" }, // It's the Great Pumpkin, Charlie Brown
  { id: 27205, type: "movie" }, // Inception
  { id: 106646, type: "movie" }, // The Wolf of Wall Street
  { id: 334533, type: "movie" }, // Captain Fantastic
  { id: 693134, type: "movie" }, // Dune: Part Two
  { id: 765245, type: "movie" }, // Swan Song
  { id: 264660, type: "movie" }, // Ex Machina
  { id: 92591, type: "movie" }, // Bernie
  { id: 976893, type: "movie" }, // Perfect Days
  { id: 13187, type: "movie" }, // A Charlie Brown Christmas
  { id: 11527, type: "movie" }, // Excalibur
  { id: 120, type: "movie" }, // LOTR: The Fellowship of the Ring
  { id: 157336, type: "movie" }, // Interstellar
  { id: 762, type: "movie" }, // Monty Python and the Holy Grail
  { id: 666243, type: "movie" }, // The Witcher: Nightmare of the Wolf
  { id: 545611, type: "movie" }, // Everything Everywhere All at Once
  { id: 329, type: "movie" }, // Jurrassic Park
  { id: 330459, type: "movie" }, // Rogue One: A Star Wars Story
  { id: 279, type: "movie" }, // Amadeus
  { id: 823219, type: "movie" }, // Flow
  { id: 22, type: "movie" }, // Pirates of the Caribbean: The Curse of the Black Pearl
  { id: 18971, type: "movie" }, // Rosencrantz and Guildenstern Are Dead
  { id: 26388, type: "movie" }, // Buried
  { id: 152601, type: "movie" }, // Her
  { id: 11886, type: "movie" }, // Robin Hood
  { id: 1362, type: "movie" }, // The Hobbit 1977
  { id: 578, type: "movie" }, // Jaws
  { id: 78, type: "movie" }, // Blade Runner
  { id: 348, type: "movie" }, // Alien
  { id: 198184, type: "movie" }, // Chappie
  { id: 405774, type: "movie" }, // Bird Box
  { id: 333339, type: "movie" }, // Ready Player One
];

const TV_SHOWS_DATA: EditorPick[] = [
  { id: 456, type: "show" }, // The Simpsons
  { id: 73021, type: "show" }, // Disenchantment
  { id: 1434, type: "show" }, // Family Guy
  { id: 1695, type: "show" }, // Monk
  { id: 1408, type: "show" }, // House
  { id: 93740, type: "show" }, // Foundation
  { id: 60625, type: "show" }, // Rick and Morty
  { id: 1396, type: "show" }, // Breaking Bad
  { id: 44217, type: "show" }, // Vikings
  { id: 90228, type: "show" }, // Dune Prophecy
  { id: 13916, type: "show" }, // Death Note
  { id: 71912, type: "show" }, // The Witcher
  { id: 61222, type: "show" }, // Bojack Horseman
  { id: 93405, type: "show" }, // Squid Game
  { id: 87108, type: "show" }, // Chernobyl
  { id: 105248, type: "show" }, // Cyberpunk: Edgerunners
  { id: 82738, type: "show" }, // IRODUKU: The World in Colors
  { id: 615, type: "show" }, // Futurama
  { id: 4625, type: "show" }, // The New Batman Adventures
  { id: 513, type: "show" }, // Batman Beyond
  { id: 110948, type: "show" }, // The Snoopy Show
  { id: 110492, type: "show" }, // Peacemaker
  { id: 125988, type: "show" }, // Silo
  { id: 87917, type: "show" }, // For All Mankind
  { id: 42009, type: "show" }, // Black Mirror
  { id: 86831, type: "show" }, // Love, Death & Robots
  { id: 261579, type: "show" }, // Secret Level
];

export const EDITOR_PICKS_MOVIES = shuffleArray(MOVIES_DATA);
export const EDITOR_PICKS_TV_SHOWS = shuffleArray(TV_SHOWS_DATA);

// Static provider lists
export const MOVIE_PROVIDERS: Provider[] = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "2" },
  { name: "Amazon Prime Video", id: "10" },
  { name: "Hulu", id: "15" },
  { name: "Disney Plus", id: "337" },
  { name: "Max", id: "1899" },
  { name: "Paramount Plus", id: "531" },
  { name: "Shudder", id: "99" },
  { name: "Crunchyroll", id: "283" },
  { name: "fuboTV", id: "257" },
  { name: "AMC+", id: "526" },
  { name: "Starz", id: "43" },
  { name: "Lifetime", id: "157" },
  { name: "National Geographic", id: "1964" },
];

export const TV_PROVIDERS: Provider[] = [
  { name: "Netflix", id: "8" },
  { name: "Apple TV+", id: "350" },
  { name: "Amazon Prime Video", id: "10" },
  { name: "Paramount Plus", id: "531" },
  { name: "Hulu", id: "15" },
  { name: "Max", id: "1899" },
  { name: "Adult Swim", id: "318" },
  { name: "Disney Plus", id: "337" },
  { name: "Crunchyroll", id: "283" },
  { name: "fuboTV", id: "257" },
  { name: "Shudder", id: "99" },
  { name: "Discovery +", id: "520" },
  { name: "National Geographic", id: "1964" },
  { name: "Fox", id: "328" },
];
