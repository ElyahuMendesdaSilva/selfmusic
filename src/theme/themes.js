// Paletas de tema do app.
//
// Cada tema tem as cores: primary (fundo), surface (superfícies sólidas como a
// barra do tocador), text (texto principal), muted (texto secundário), accent
// (botões/destaques) e onAccent (ícone/texto sobre o accent).
export const THEMES = [
  {
    id: 'azul-marinho',
    name: 'Azul Marinho',
    colors: {
      primary: '#2C3E50',
      surface: '#34495E',
      text: '#FFFFFF',
      muted: '#BDC3C7',
      accent: '#1DB954',
      onAccent: '#FFFFFF',
    },
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    colors: {
      primary: '#1E293B',
      surface: '#24304A',
      text: '#ECFDF5',
      muted: '#34D399',
      accent: '#10B981',
      onAccent: '#FFFFFF',
    },
  },
  {
    id: 'grafite',
    name: 'Grafite',
    colors: {
      primary: '#1F2937',
      surface: '#4B5563',
      text: '#F9FAFB',
      muted: '#6B7280',
      accent: '#6B7280',
      onAccent: '#1F2937',
    },
  },
  {
    id: 'meia-noite',
    name: 'Meia-Noite',
    colors: {
      primary: '#1A1A2E',
      surface: '#262642',
      text: '#EEEEEE',
      muted: '#9B9BB8',
      accent: '#E94560',
      onAccent: '#FFFFFF',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: {
      primary: '#0F172A',
      surface: '#1B2A45',
      text: '#E2E8F0',
      muted: '#93A5C1',
      accent: '#22D3EE',
      onAccent: '#062A33',
    },
  },
  {
    id: 'padrao',
    name: 'Padrão',
    colors: {
      // Material 3 dark color roles (background, surface, onSurface,
      // onSurfaceVariant, primary and onPrimary).
      primary: '#111318',
      surface: '#1C1B1F',
      text: '#E4E1E6',
      muted: '#C4C7C5',
      accent: '#B7F397',
      onAccent: '#17380D',
    },
  },
];

export function getThemeById(id) {
  return THEMES.find((theme) => theme.id === id) || null;
}

export function getDefaultThemeId() {
  return THEMES[THEMES.length - 1].id;
}

// Converte uma cor hex para rgba com a opacidade informada.
export function withAlpha(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) {
    return hex;
  }
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
