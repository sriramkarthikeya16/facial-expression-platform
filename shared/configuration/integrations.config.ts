/**
 * MoodLens Shared Configuration - Third-Party Integrations Defaults
 */

export interface SpotifyTrackMeta {
  title: string;
  artist: string;
  imageUrl: string;
  playlistUri: string;
  webUrl: string;
}

export type SupportedLanguage = 'en' | 'hi' | 'es' | 'fr' | 'te' | 'ta' | 'ja';

export const INTEGRATION_CONFIG = {
  SPOTIFY: {
    CLIENT_ID: 'moodlens_spotify_client',
    AUTH_ENDPOINT: 'https://accounts.spotify.com/authorize',
    TOKEN_ENDPOINT: 'https://accounts.spotify.com/api/token',
    SCOPES: ['user-read-playback-state', 'user-modify-playback-state', 'playlist-read-private'],
    DEFAULT_PLAYLISTS: {
      happy: 'spotify:playlist:37i9dQZF1DXdPec7aLTmlC', // Happy Hits
      sad: 'spotify:playlist:37i9dQZF1DX3rxVfibe1L0', // Mood Booster / Comfort
      angry: 'spotify:playlist:37i9dQZF1DX3qCx5yEZ0ya', // Peaceful Piano / Calm
      fear: 'spotify:playlist:37i9dQZF1DWZqd5JICZI0u', // Deep Focus
      neutral: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO', // Peaceful Meditation
    },
    LANGUAGE_PLAYLISTS: {
      happy: {
        en: {
          title: 'Happy Hits',
          artist: 'Spotify Global Pop Curators',
          imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DXdPec7aLTmlC',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC',
        },
        hi: {
          title: 'Bollywood Butter & Mast Beats',
          artist: 'Top Bollywood Artists',
          imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX0XUfTFmZeeg',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmZeeg',
        },
        es: {
          title: 'Éxitos España & Viva Latino',
          artist: 'Latin Chart Toppers',
          imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX10zKzsJ2jva',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva',
        },
        fr: {
          title: 'Hits du Moment',
          artist: 'French Pop Stars',
          imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX1X23oo06SSz',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX1X23oo06SSz',
        },
        te: {
          title: 'Tollywood Chill & Dance',
          artist: 'Telugu Hits Daily',
          imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX3oVwhXgq3j6',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3oVwhXgq3j6',
        },
        ta: {
          title: 'Kuthu & Kondattam',
          artist: 'Tamil Party & Feel Good',
          imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX3zUqMhAeyH6',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3zUqMhAeyH6',
        },
        ja: {
          title: 'J-Pop Now',
          artist: 'Tokyo Sound Collective',
          imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DXdbXrPNafg9d',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdbXrPNafg9d',
        },
      } as Record<SupportedLanguage, SpotifyTrackMeta>,
      sad: {
        en: {
          title: 'Mood Booster',
          artist: 'Gentle Uplifting Hits',
          imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX3rxVfibe1L0',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0',
        },
        hi: {
          title: 'Sukoon & Melodies',
          artist: 'Soulful Bollywood Acoustic',
          imageUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX7gqPduT1u6y',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX7gqPduT1u6y',
        },
        es: {
          title: 'Calma Acústica',
          artist: 'Canciones Cálidas',
          imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX305141wP07t',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX305141wP07t',
        },
        fr: {
          title: 'Douce France Acoustique',
          artist: 'Mélodies Apaisantes',
          imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX64tq7v3pE9y',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX64tq7v3pE9y',
        },
        te: {
          title: 'Melody Wave Telugu',
          artist: 'Soothing Telugu Classics',
          imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX5cO1Kx6c810',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX5cO1Kx6c810',
        },
        ta: {
          title: 'Tamil Chill Melodies',
          artist: 'Comforting Tamil Acoustics',
          imageUrl: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX4YwXg08O4uG',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4YwXg08O4uG',
        },
        ja: {
          title: 'Peaceful Japanese Cafe',
          artist: 'Lofi & Instrumental Japan',
          imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300&auto=format&fit=crop&q=80',
          playlistUri: 'spotify:playlist:37i9dQZF1DX8Uebhn9wzrS',
          webUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
        },
      } as Record<SupportedLanguage, SpotifyTrackMeta>,
    },
  },
  FOOD: {
    PROVIDERS: ['swiggy', 'ubereats', 'doordash', 'zomato'] as const,
    MEAL_WINDOWS: {
      breakfast: [7, 11],
      lunch: [12, 15],
      evening_snack: [16, 18],
      dinner: [19, 23],
    },
  },
  WELLNESS: {
    BREATHING_PATTERNS: {
      box_breathing: { inhale: 4, hold1: 4, exhale: 4, hold2: 4, cycles: 4 },
      relax_478: { inhale: 4, hold1: 7, exhale: 8, hold2: 0, cycles: 4 },
    },
    GROUNDING_54321: {
      title: '5-4-3-2-1 Sensory Grounding',
      steps: [
        { count: 5, sense: 'SEE', prompt: 'Acknowledge 5 things you see around you right now.' },
        { count: 4, sense: 'TOUCH', prompt: 'Acknowledge 4 things you can physically touch or feel.' },
        { count: 3, sense: 'HEAR', prompt: 'Acknowledge 3 distinct sounds you hear in your space.' },
        { count: 2, sense: 'SMELL', prompt: 'Acknowledge 2 things you can smell or scents you enjoy.' },
        { count: 1, sense: 'TASTE', prompt: 'Acknowledge 1 thing you can taste or take a mindful sip of water.' },
      ],
    },
  },
  NEWS: {
    UPLIFTING_FEEDS: [
      {
        title: 'Good News Network',
        description: 'Inspiring news and positive stories from around the world',
        url: 'https://www.goodnewsnetwork.org/',
      },
      {
        title: 'Positive News UK',
        description: 'Good journalism about good things happening',
        url: 'https://www.positive.news/',
      },
      {
        title: 'Reddit /r/UpliftingNews',
        description: 'Community-curated positive events and human kindness',
        url: 'https://www.reddit.com/r/UpliftingNews/',
      },
    ],
  },
  MESSAGING: {
    CHECKIN_TEMPLATES: [
      {
        id: 'friendly_hello',
        label: 'Warm Hello',
        text: 'Hey! Just thinking of you and wanted to check in. Hope you are having a wonderful day!',
      },
      {
        id: 'catch_up',
        label: 'Coffee / Catch-up',
        text: 'Hi! It has been a little while—would love to catch up soon when you have a free moment!',
      },
      {
        id: 'grateful',
        label: 'Appreciation',
        text: 'Hey friend, just wanted to send some good energy your way today. Grateful to have you in my corner!',
      },
    ],
  },
} as const;
