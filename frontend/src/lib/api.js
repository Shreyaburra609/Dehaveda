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

export const PILLARS = [
  {
    code: "ahara",
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
    index: "03",
    name: "SWARA",
    subtitle: "Sound & Swara",
    blurb: "Explore sound, vibration, the seven swaras and their cultural background.",
    path: "/swara",
    accent: "#A855F7",
    image:
      "https://images.pexels.com/photos/7519797/pexels-photo-7519797.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    code: "manas",
    index: "04",
    name: "MANAS",
    subtitle: "Mind",
    blurb: "Brain and mind, thoughts, attention, memory, emotion and calmer states.",
    path: "/manas",
    accent: "#10B981",
    image:
      "https://images.unsplash.com/photo-1627728724901-e79f35800820?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
  {
    code: "games",
    index: "05",
    name: "GAMES",
    subtitle: "Mind Games",
    blurb: "Play original memory, reaction, attention and pattern games.",
    path: "/games",
    accent: "#6366F1",
    image:
      "https://images.unsplash.com/photo-1700756882452-967c1c905a99?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
  },
];
