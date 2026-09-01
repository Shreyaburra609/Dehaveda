import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const TOKEN_KEY = "dv_token";

export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(err, fallback = "Something went wrong. Please try again.") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return err?.message || fallback;
}

export const GALLERIES = {
  ahara: [
    { url: "https://images.unsplash.com/photo-1610492219815-f76905e3f084?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Whole foods across every category", alt: "Wooden board with sliced fruits, vegetables and nuts" },
    { url: "https://images.unsplash.com/photo-1786994060314-eccbdd13066d?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Pulses — the protein backbone of Indian meals", alt: "Six piles of dried legumes arranged in a flower shape" },
    { url: "https://images.unsplash.com/photo-1780478238047-13e4e6c07cba?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Split peas and chickpeas, side by side", alt: "Yellow split peas next to dried chickpeas" },
    { url: "https://images.unsplash.com/photo-1656497119922-068c6a5e1193?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Spices carry flavour, not calories", alt: "Steel masala box filled with coloured ground spices" },
    { url: "https://images.unsplash.com/photo-1509359149003-657ef23eaf04?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Portion size decides the number on the label", alt: "Four small steel spoons holding different condiments" },
  ],
  swara: [
    { url: "https://images.unsplash.com/photo-1579018371841-0f7e275dd50f?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "A folk musician holding the drone", alt: "Seated musician playing a long-necked string instrument" },
    { url: "https://images.unsplash.com/photo-1706582276953-0e9ad3a416ef?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "The tanpura shape, built for resonance", alt: "Silhouette of a tanpura hanging against a wall" },
    { url: "https://images.unsplash.com/photo-1711446732113-a3442a163346?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Swara is carried by voice and instrument alike", alt: "Musician in a turban holding a decorated string instrument" },
  ],
  manas: [
    { url: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Attention rests when the surroundings are quiet", alt: "Woman sitting cross-legged on a wooden deck at sunrise" },
    { url: "https://images.unsplash.com/photo-1782654177675-7d0d81b38cf5?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Calm is a condition you set up, not force", alt: "Stone statue surrounded by green leaves with the word calm" },
    { url: "https://images.unsplash.com/photo-1541588007165-da26f41a1996?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Time outdoors helps attention recover", alt: "Person seated on a rock formation in daylight" },
    { url: "https://images.unsplash.com/photo-1632760212493-73793779b863?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400", caption: "Breathing practice needs no equipment", alt: "Person meditating in a park in low light" },
  ],
  games: [
    "https://images.unsplash.com/photo-1704265586142-db3e17d0dea0?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
    "https://images.unsplash.com/photo-1561034645-2e17134a4395?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
    "https://images.unsplash.com/photo-1592134212762-51ee580cd38a?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
    "https://images.unsplash.com/photo-1780719993842-79bc8b4b4dd5?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
    "https://images.unsplash.com/photo-1634926123131-a215ac9d136c?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
  ],
};

export const PILLARS = [
  {
    code: "ahara",
    accentText: "#B45309",
    index: "01",
    name: "AHARA",
    subtitle: "Food & Nutrition",
    blurb: "Learn about healthy foods, nutrients, calories and everyday nutrition.",
    path: "/ahara",
    accent: "#E07A5F",
    image:
      "https://images.unsplash.com/photo-1610492219815-f76905e3f084?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
  {
    code: "jala",
    accentText: "#0369A1",
    index: "02",
    name: "JALA",
    subtitle: "Water & Water Knowledge",
    blurb: "Understand drinking water, groundwater, minerals, contamination and quality.",
    path: "/jala",
    accent: "#38BDF8",
    image:
      "https://images.unsplash.com/photo-1696371269814-ae41fc67cf03?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
  {
    code: "swara",
    accentText: "#7E22CE",
    index: "03",
    name: "SWARA",
    subtitle: "Sound & Swara",
    blurb: "Explore sound, vibration, the seven swaras and their cultural background.",
    path: "/swara",
    accent: "#A855F7",
    image:
      "https://images.unsplash.com/photo-1579018371841-0f7e275dd50f?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
  {
    code: "manas",
    accentText: "#047857",
    index: "04",
    name: "MANAS",
    subtitle: "Mind",
    blurb: "Brain and mind, thoughts, attention, memory, emotion and calmer states.",
    path: "/manas",
    accent: "#10B981",
    image:
      "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
  {
    code: "games",
    accentText: "#4338CA",
    index: "05",
    name: "GAMES",
    subtitle: "Mind Games",
    blurb: "Play original memory, reaction, attention and pattern games.",
    path: "/games",
    accent: "#6366F1",
    image:
      "https://images.unsplash.com/photo-1752432257342-0057ffd8440e?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
];
