document.addEventListener('DOMContentLoaded', () => {
    // Upewnij się, że elementy istnieją na stronie, zanim dodasz do nich eventy
    const themeIcon = document.getElementById('theme-picker-icon');
    const themePalette = document.getElementById('theme-palette');
    const headerLogo = document.querySelector('.header-logo');

    if (!themeIcon || !themePalette || !headerLogo) { // Sprawdzenie logo
        console.error('Nie znaleziono elementów do zmiany motywu!');
        return;
    }

    // === TUTAJ BRAKUJE DEKLARACJI ZMIENNEJ ===
    let isThemeChanging = false; // Zmienna blokująca, aby uniknąć nakładania się animacji

    // Definicja 9 motywów kolorystycznych
const themes = [

    { name: 'teal-shadow', colors: { '--theme-gradient-start': '#20B2AA', '--theme-gradient-end': '#008080', '--theme-user-message': '#005C5C', '--theme-button-hover': '#008080', '--theme-border-selected': '#008080', '--theme-glow': 'rgba(32, 178, 170, 0.3)' } },

    { name: 'teal-current', colors: { '--theme-gradient-start': '#00A9A9', '--theme-gradient-end': '#006B6B', '--theme-user-message': '#005C4B', '--theme-button-hover': '#006B6B', '--theme-border-selected': '#006B6B', '--theme-glow': 'rgba(0, 169, 169, 0.3)' } },

    { name: 'teal-abyss', colors: { '--theme-gradient-start': '#00CED1', '--theme-gradient-end': '#0c3b3b', '--theme-user-message': '#002E2E', '--theme-button-hover': '#0c3b3b', '--theme-border-selected': '#0c3b3b', '--theme-glow': 'rgba(0, 206, 209, 0.3)' } },

    { name: 'steel-blue', colors: { '--theme-gradient-start': '#4682B4', '--theme-gradient-end': '#4169E1', '--theme-user-message': '#2E5A88', '--theme-button-hover': '#4169E1', '--theme-border-selected': '#4169E1', '--theme-glow': 'rgba(70, 130, 180, 0.3)' } },
    { name: 'cobalt-night', colors: { '--theme-gradient-start': '#1E90FF', '--theme-gradient-end': '#232383ff', '--theme-user-message': '#0b3a69ff', '--theme-button-hover': '#00008B', '--theme-border-selected': '#00008B', '--theme-glow': 'rgba(30, 144, 255, 0.3)' } },
    { name: 'void-blue', colors: { '--theme-gradient-start': '#0052D4', '--theme-gradient-end': '#081429', '--theme-user-message': '#002D75', '--theme-button-hover': '#081429', '--theme-border-selected': '#081429', '--theme-glow': 'rgba(0, 82, 212, 0.3)' } },
    { name: 'amethyst-haze', colors: { '--theme-gradient-start': '#9966CC', '--theme-gradient-end': '#8A2BE2', '--theme-user-message': '#6A4F91', '--theme-button-hover': '#8A2BE2', '--theme-border-selected': '#8A2BE2', '--theme-glow': 'rgba(153, 102, 204, 0.3)' } },

    { name: 'purple-depth', colors: { '--theme-gradient-start': '#8A2BE2', '--theme-gradient-end': '#4B0082', '--theme-user-message': '#5C2288', '--theme-button-hover': '#4B0082', '--theme-border-selected': '#4B0082', '--theme-glow': 'rgba(138, 43, 226, 0.3)' } },
    { name: 'violet-eclipse', colors: { '--theme-gradient-start': '#9400D3', '--theme-gradient-end': '#240030', '--theme-user-message': '#5C007A', '--theme-button-hover': '#240030', '--theme-border-selected': '#240030', '--theme-glow': 'rgba(148, 0, 211, 0.3)' } },

    { name: 'crimson-glow', colors: { '--theme-gradient-start': '#DC143C', '--theme-gradient-end': '#A52A2A', '--theme-user-message': '#9B1B34', '--theme-button-hover': '#A52A2A', '--theme-border-selected': '#A52A2A', '--theme-glow': 'rgba(220, 20, 60, 0.3)' } },

    { name: 'ruby-embers', colors: { '--theme-gradient-start': '#B22222', '--theme-gradient-end': '#800000', '--theme-user-message': '#8B0000', '--theme-button-hover': '#800000', '--theme-border-selected': '#800000', '--theme-glow': 'rgba(178, 34, 34, 0.3)' } },

    { name: 'garnet-abyss', colors: { '--theme-gradient-start': '#FF0000', '--theme-gradient-end': '#450000', '--theme-user-message': '#6B0000', '--theme-button-hover': '#450000', '--theme-border-selected': '#450000', '--theme-glow': 'rgba(255, 0, 0, 0.3)' } },
    { name: 'burnt-orange', colors: { '--theme-gradient-start': '#d88339ff', '--theme-gradient-end': '#CD5700', '--theme-user-message': '#B86F20', '--theme-button-hover': '#CD5700', '--theme-border-selected': '#CD5700', '--theme-glow': 'rgba(230, 126, 34, 0.3)' } },
    { name: 'autumn-fire', colors: { '--theme-gradient-start': '#FF8C00', '--theme-gradient-end': '#D2691E', '--theme-user-message': '#CC5800', '--theme-button-hover': '#D2691E', '--theme-border-selected': '#D2691E', '--theme-glow': 'rgba(255, 140, 0, 0.3)' } },
    { name: 'magma-core', colors: { '--theme-gradient-start': '#FF4500', '--theme-gradient-end': '#5E2008', '--theme-user-message': '#9E2A00', '--theme-button-hover': '#5E2008', '--theme-border-selected': '#5E2008', '--theme-glow': 'rgba(255, 69, 0, 0.3)' } },

    { name: 'forest-green', colors: { '--theme-gradient-start': '#2E8B57', '--theme-gradient-end': '#228b4aff', '--theme-user-message': '#105332ff', '--theme-button-hover': '#18994aff', '--theme-border-selected': '#228B22', '--theme-glow': 'rgba(46, 139, 87, 0.3)' } },

    { name: 'emerald-depth', colors: { '--theme-gradient-start': '#096e37ff', '--theme-gradient-end': '#005c36ff', '--theme-user-message': '#006426ff', '--theme-button-hover': '#004d23ff', '--theme-border-selected': '#004d00', '--theme-glow': 'rgba(0, 128, 64, 0.3)' } },

    { name: 'jungle-night', colors: { '--theme-gradient-start': '#1d643dff', '--theme-gradient-end': '#09250fff', '--theme-user-message': '#104018ff', '--theme-button-hover': '#092516ff', '--theme-border-selected': '#092516ff', '--theme-glow': 'rgba(47, 107, 62, 0.3)' } },

{
    name: 'intense-brown',
    colors: {
      '--theme-gradient-start': '#8A4B12',   
      '--theme-gradient-end':   '#B86A1E',   
      '--theme-user-message':   '#6F3A0A',
      '--theme-button-hover':   '#B86A1E',
      '--theme-border-selected':'#B86A1E',
      '--theme-glow':           'rgba(138, 75, 18, 0.35)'
    }
  },

  {
    name: 'very-dark-brown',
    colors: {
      '--theme-gradient-start': '#4A240A',   
      '--theme-gradient-end':   '#2B1406',   
      '--theme-user-message':   '#3A1C08',
      '--theme-button-hover':   '#2B1406',
      '--theme-border-selected':'#2B1406',
      '--theme-glow':           'rgba(74, 36, 10, 0.4)'
    }
  },

  // 3. Ciemny szary
  {
    name: 'dark-gray',
    colors: {
      '--theme-gradient-start': '#3A3A3A',   // ciemny grafit
      '--theme-gradient-end':   '#1F1F1F',   // bardzo ciemny szary
      '--theme-user-message':   '#2B2B2B',
      '--theme-button-hover':   '#1F1F1F',
      '--theme-border-selected':'#1F1F1F',
      '--theme-glow':           'rgba(58, 58, 58, 0.35)'
    }
  }
];


const INVERT_THEME_INDICES = [3, 6, 9, 12, 15, 18, ,20, 21];

    // FUNKCJA SPRAWDZAJĄCA, CZY DANY MOTYW WYMAGA INVERT
    const shouldInvertLogo = (themeIndex) => {
        // themeIndex jest indeksem w tablicy (liczenie od 0), więc dodajemy 1, aby pasowało do listy (3, 6, 9...)
        return INVERT_THEME_INDICES.includes(themeIndex + 1);
    };


    // ZMODYFIKOWANA FUNKCJA
    const applyTheme = (theme, themeIndex) => {
        if (isThemeChanging) return; 
        isThemeChanging = true;

        const root = document.documentElement;
        const topHeader = document.querySelector('.top-header');
        if (!topHeader) {
            isThemeChanging = false;
            return;
        }

        // 1. Ustaw kolory NOWEGO motywu na zmiennych dla pseudo-elementu ::before
        root.style.setProperty('--theme-before-start', theme.colors['--theme-gradient-start']);
        root.style.setProperty('--theme-before-end', theme.colors['--theme-gradient-end']);

        // 2. Dodaj klasę, która uruchomi animację pojawienia się ::before (opacity 0 -> 1)
        topHeader.classList.add('is-changing');

        // 3. Sprawdzenie i natychmiastowe ustawienie stanu invert na logo
        if (shouldInvertLogo(themeIndex)) {
            headerLogo.classList.add('invert-logo');
        } else {
            headerLogo.classList.remove('invert-logo');
        }

        // 4. Po zakończeniu animacji (500ms) wykonaj "czyszczenie"
        setTimeout(() => {
            // 5. Ustaw wszystkie główne zmienne na kolory NOWEGO motywu
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });

            // 6. Usuń klasę - to spowoduje, że ::before znów stanie się przezroczysty
            topHeader.classList.remove('is-changing');

            // 7. Odblokuj możliwość ponownej zmiany motywu
            isThemeChanging = false;
        }, 500); // Czas musi być identyczny jak w CSS transition
    };
    // Funkcja zapisująca nazwę motywu w pamięci lokalnej przeglądarki
    const saveTheme = (themeName) => {
        localStorage.setItem('selectedTheme', themeName);
    };

    // Funkcja wczytująca motyw z pamięci lokalnej przy starcie strony
    const loadTheme = () => {
        const savedThemeName = localStorage.getItem('selectedTheme');
        const themeIndex = themes.findIndex(t => t.name === savedThemeName);
        const theme = themes[themeIndex] || themes[0]; 
        const finalIndex = themeIndex !== -1 ? themeIndex : 0; // Użyj 0 jeśli nie znaleziono
        applyTheme(theme, finalIndex); // Dodaj indeks do wywołania
    };

    // Obsługa wyboru koloru z palety
    themePalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('theme-swatch')) {
            const themeName = e.target.dataset.themeName;
            // ZMIEŃ: Znajdź indeks i obiekt motywu
            const themeIndex = themes.findIndex(t => t.name === themeName);
            const selectedTheme = themes[themeIndex];

            if (selectedTheme) {
                applyTheme(selectedTheme, themeIndex); // Dodaj indeks do wywołania
                saveTheme(themeName);
            }
            themePalette.classList.remove('visible'); 
        }
    });

    // Funkcja tworząca kółka z kolorami w palecie
    const populatePalette = () => {
        themePalette.innerHTML = ''; // Wyczyść paletę przed dodaniem nowych elementów
        themes.forEach(theme => {
            const swatch = document.createElement('div');
            swatch.classList.add('theme-swatch');
            swatch.style.background = `linear-gradient(45deg, ${theme.colors['--theme-gradient-start']}, ${theme.colors['--theme-gradient-end']})`;
            swatch.dataset.themeName = theme.name; // Zapisz nazwę motywu w atrybucie data
            themePalette.appendChild(swatch);
        });
    };

    // Obsługa kliknięcia w ikonę palety, aby pokazać/ukryć okno z kolorami
    themeIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Zapobiega natychmiastowemu zamknięciu palety przez listener na całym dokumencie
        themePalette.classList.toggle('visible');
    });

    // Obsługa wyboru koloru z palety
    themePalette.addEventListener('click', (e) => {
        // Sprawdź, czy kliknięty element to kółko z kolorem
        if (e.target.classList.contains('theme-swatch')) {
            const themeName = e.target.dataset.themeName;
            const selectedTheme = themes.find(t => t.name === themeName);
            if (selectedTheme) {
                applyTheme(selectedTheme);
                saveTheme(themeName);
            }
            themePalette.classList.remove('visible'); // Ukryj paletę po wyborze
        }
    });

    // Zamykanie palety po kliknięciu gdziekolwiek poza nią
    document.addEventListener('click', (e) => {
        // Ukryj paletę, jeśli jest widoczna i kliknięcie NIE nastąpiło na nią lub na ikonę, która ją otwiera
        if (themePalette.classList.contains('visible') && !themePalette.contains(e.target) && !themeIcon.contains(e.target)) {
            themePalette.classList.remove('visible');
        }
    });

    // Inicjalizacja przy załadowaniu strony
    populatePalette();
    loadTheme();
});

