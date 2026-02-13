import { createTheme } from "../types";

const tokens = {
  black: {
    c50: "#000000",
    c75: "#030303",
    c80: "#080808",
    c100: "#0d0d0d",
    c125: "#141414",
    c150: "#1a1a1a",
    c200: "#262626",
    c250: "#333333",
  },
  white: "#FFFFFF", 
  semantic: {
    red: {
      c100: "#F46E6E", 
      c200: "#E44F4F",
      c300: "#D74747", 
      c400: "#B43434", 
    },
    green: {
      c100: "#60D26A",
      c200: "#40B44B",
      c300: "#31A33C", 
      c400: "#237A2B", 
    },
    silver: {
      c100: "#DEDEDE", 
      c200: "#B6CAD7", 
      c300: "#8EA3B0", 
      c400: "#617A8A",
    },
    yellow: {
      c100: "#80EAFF", 
      c200: "#43DFFF", 
      c300: "#00D4FF", 
      c400: "#00B6E6", 
    },
    rose: {
      c100: "#80EAFF", 
      c200: "#00B6E6", 
      c300: "#00D4FF", 
      c400: "#43DFFF", 
    },
  },
  blue: {
    c50: "#ccccd6",
    c100: "#a2a2a2",
    c200: "#868686",
    c300: "#646464",
    c400: "#4e4e4e",
    c500: "#383838",
    c600: "#2e2e2e",
    c700: "#272727",
    c800: "#181818",
    c900: "#0f0f0f",
  },
  purple: {
    c50: "#80EAFF",
    c100: "#43DFFF",
    c200: "#00D4FF",
    c300: "#00B6E6",
    c400: "#0099CC",
    c500: "#007CAD",
    c600: "#00668F",
    c700: "#004F6E",
    c800: "#00384D", 
    c900: "#002A3A",
  },
  ash: {
    c50: "#8d8d8d",
    c100: "#6b6b6b",
    c200: "#545454",
    c300: "#3c3c3c",
    c400: "#313131",
    c500: "#2c2c2c",
    c600: "#252525",
    c700: "#1e1e1e",
    c800: "#181818",
    c900: "#111111",
  },
  shade: {
    c25: "#939393",
    c50: "#7c7c7c",
    c100: "#666666",
    c200: "#4f4f4f",
    c300: "#404040",
    c400: "#343434",
    c500: "#282828",
    c600: "#202020",
    c700: "#1a1a1a",
    c800: "#151515",
    c900: "#0e0e0e",
  },
};

export default createTheme({
  name: "cobalt",
  extend: {
    colors: {
      themePreview: {
        primary: tokens.black.c80,
        secondary: tokens.purple.c400,
        ghost: tokens.purple.c100,
      },

      pill: {
        background: tokens.black.c100,
        backgroundHover: tokens.black.c125,
        highlight: tokens.blue.c200,
        activeBackground: tokens.shade.c700,
      },

      global: {
        accentA: tokens.purple.c200,
        accentB: tokens.purple.c300,
      },

      lightBar: {
        light: tokens.purple.c800,
      },

      buttons: {
        toggle: tokens.purple.c300,
        toggleDisabled: tokens.black.c200,
        danger: tokens.semantic.rose.c300,
        dangerHover: tokens.semantic.rose.c200,

        secondary: tokens.black.c100,
        secondaryText: tokens.semantic.silver.c300,
        secondaryHover: tokens.black.c150,
        primary: tokens.white,
        primaryText: tokens.black.c50,
        primaryHover: tokens.semantic.silver.c100,
        purple: tokens.purple.c600,
        purpleHover: tokens.purple.c400,
        cancel: tokens.black.c100,
        cancelHover: tokens.black.c150,
      },

      background: {
        main: tokens.black.c75,
        secondary: tokens.black.c75,
        secondaryHover: tokens.black.c75,
        accentA: tokens.purple.c600,
        accentB: tokens.black.c100,
      },

      modal: {
        background: tokens.shade.c800,
      },

      type: {
        logo: tokens.purple.c100,
        emphasis: tokens.white,
        text: tokens.shade.c50,
        dimmed: tokens.shade.c50,
        divider: tokens.ash.c500,
        secondary: tokens.ash.c100,
        danger: tokens.semantic.red.c100,
        success: tokens.semantic.green.c100,
        link: tokens.purple.c100,
        linkHover: tokens.purple.c50,
      },

      search: {
        background: tokens.black.c100,
        hoverBackground: tokens.shade.c900,
        focused: tokens.black.c125,
        placeholder: tokens.shade.c200,
        icon: tokens.shade.c500,
        text: tokens.white,
      },

      mediaCard: {
        hoverBackground: tokens.shade.c900,
        hoverAccent: tokens.black.c250,
        hoverShadow: tokens.black.c50,
        shadow: tokens.shade.c800,
        barColor: tokens.ash.c200,
        barFillColor: tokens.purple.c100,
        badge: tokens.shade.c700,
        badgeText: tokens.ash.c100,
      },

      largeCard: {
        background: tokens.black.c100,
        icon: tokens.purple.c400,
      },

      dropdown: {
        background: tokens.black.c100,
        altBackground: tokens.black.c80,
        hoverBackground: tokens.black.c150,
        highlight: tokens.semantic.yellow.c400,
        highlightHover: tokens.semantic.yellow.c200,
        text: tokens.shade.c50,
        secondary: tokens.shade.c100,
        border: tokens.shade.c400,
        contentBackground: tokens.black.c50,
      },

      authentication: {
        border: tokens.shade.c300,
        inputBg: tokens.black.c100,
        inputBgHover: tokens.black.c150,
        wordBackground: tokens.shade.c500,
        copyText: tokens.shade.c100,
        copyTextHover: tokens.ash.c50,
        errorText: tokens.semantic.rose.c100,
      },

      settings: {
        sidebar: {
          activeLink: tokens.black.c100,
          badge: tokens.shade.c900,

          type: {
            secondary: tokens.shade.c200,
            inactive: tokens.shade.c50,
            icon: tokens.black.c200,
            iconActivated: tokens.purple.c200,
            activated: tokens.purple.c100,
          },
        },

        card: {
          border: tokens.shade.c700,
          background: tokens.black.c100,
          altBackground: tokens.black.c100,
        },

        saveBar: {
          background: tokens.black.c50,
        },
      },

      utils: {
        divider: tokens.ash.c300,
      },

      onboarding: {
        bar: tokens.shade.c400,
        barFilled: tokens.purple.c300,
        divider: tokens.shade.c200,
        card: tokens.shade.c800,
        cardHover: tokens.shade.c700,
        border: tokens.shade.c600,
        good: tokens.purple.c100,
        best: tokens.semantic.yellow.c100,
        link: tokens.purple.c100,
      },

      errors: {
        card: tokens.black.c75,
        border: tokens.ash.c500,

        type: {
          secondary: tokens.ash.c100,
        },
      },

      about: {
        circle: tokens.black.c100,
        circleText: tokens.ash.c50,
      },

      editBadge: {
        bg: tokens.ash.c500,
        bgHover: tokens.ash.c400,
        text: tokens.ash.c50,
      },

      progress: {
        background: tokens.ash.c50,
        preloaded: tokens.ash.c50,
        filled: tokens.purple.c200,
      },

      video: {
        buttonBackground: tokens.ash.c600,

        autoPlay: {
          background: tokens.ash.c800,
          hover: tokens.ash.c600,
        },

        scraping: {
          card: tokens.black.c50,
          error: tokens.semantic.red.c200,
          success: tokens.semantic.green.c200,
          loading: tokens.purple.c200,
          noresult: tokens.black.c200,
        },

        audio: {
          set: tokens.purple.c200,
        },

        context: {
          background: tokens.black.c50,
          light: tokens.shade.c50,
          border: tokens.ash.c600,
          hoverColor: tokens.ash.c600,
          buttonFocus: tokens.ash.c500,
          flagBg: tokens.ash.c500,
          inputBg: tokens.black.c100,
          buttonOverInputHover: tokens.ash.c500,
          inputPlaceholder: tokens.ash.c200,
          cardBorder: tokens.ash.c700,
          slider: tokens.black.c200,
          sliderFilled: tokens.purple.c200,
          error: tokens.semantic.red.c200,

          buttons: {
            list: tokens.ash.c700,
            active: tokens.ash.c900,
          },

          closeHover: tokens.ash.c800,

          type: {
            main: tokens.semantic.silver.c300,
            secondary: tokens.ash.c200,
            accent: tokens.purple.c200,
          },
        },
      },
    },
  },
});
