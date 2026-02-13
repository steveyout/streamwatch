import { createTheme } from "../types";

const tokens = {
  black: "hsla(0, 0%, 0%, 1)", // General black color
  white: "hsla(0, 0%, 100%, 1)", // General white color
  semantic: {
    red: {
      c100: "hsla(350, 40%, 65%, 1)", // Error text - cool magenta-red
      c200: "hsla(350, 35%, 55%, 1)", // Video player scraping error - muted cool red
      c300: "hsla(350, 30%, 45%, 1)", // Danger button - deeper cool red
      c400: "hsla(350, 25%, 35%, 1)", // Not currently used - dark cool red
    },
    green: {
      c100: "hsla(170, 30%, 55%, 1)", // Success text - cool teal-green
      c200: "hsla(170, 25%, 45%, 1)", // Video player scraping success - muted teal
      c300: "hsla(170, 20%, 35%, 1)", // Not currently used - deeper cool teal
      c400: "hsla(170, 15%, 25%, 1)", // Not currently used - dark cool teal
    },
    silver: {
      c100: "hsla(210, 20%, 85%, 1)", // Primary button hover - cool blue-gray
      c200: "hsla(210, 15%, 75%, 1)", // Not currently used - muted cool gray
      c300: "hsla(210, 10%, 60%, 1)", // Secondary button text - subtle blue tint
      c400: "hsla(210, 8%, 45%, 1)", // Main text in video player context - cool gray
    },
    yellow: {
      c100: "hsla(190, 60%, 75%, 1)", // Best onboarding highlight - cool cyan
      c200: "hsla(190, 50%, 65%, 1)", // Dropdown highlight hover - muted cyan
      c300: "hsla(190, 40%, 55%, 1)", // Not currently used - deeper cyan
      c400: "hsla(190, 30%, 45%, 1)", // Dropdown highlight - dark cyan
    },
    rose: {
      c100: "hsla(320, 35%, 60%, 1)", // Authentication error text - cool magenta
      c200: "hsla(320, 30%, 50%, 1)", // Danger button hover - muted cool magenta
      c300: "hsla(320, 25%, 40%, 1)", // Danger button - deeper cool magenta
      c400: "hsla(320, 20%, 30%, 1)", // Not currently used - dark cool magenta
    },
  },
  blue: {
    c50: "hsla(210, 100%, 88%, 1)", // soft cool blue
    c100: "hsla(210, 80%, 75%, 1)", // brighter cool blue
    c200: "hsla(210, 70%, 65%, 1)", // theme primary: cool blue
    c300: "hsla(210, 60%, 50%, 1)", // accent B: darker cool blue
    c400: "hsla(210, 50%, 40%, 1)", // light bar
    c500: "hsla(210, 45%, 30%, 1)", // accent B background
    c600: "hsla(210, 42%, 25%, 1)",
    c700: "hsla(210, 40%, 20%, 1)",
    c800: "hsla(210, 35%, 15%, 1)",
    c900: "hsla(210, 30%, 10%, 1)",
  },
  purple: {
    c50: "hsla(170, 40%, 75%, 1)", // soft cool teal for link hover
    c100: "hsla(170, 45%, 60%, 1)", // bright cool teal logo/link
    c200: "hsla(170, 50%, 50%, 1)", // cool teal progress/loader
    c300: "hsla(170, 55%, 45%, 1)", // toggle/onboarding bar - cool teal
    c400: "hsla(170, 60%, 40%, 1)", // card icon - cool teal
    c500: "hsla(170, 65%, 32%, 1)", // accent A background - cool teal
    c600: "hsla(170, 70%, 25%, 1)",
    c700: "hsla(170, 75%, 18%, 1)",
    c800: "hsla(170, 80%, 12%, 1)",
    c900: "hsla(170, 85%, 8%, 1)",
  },
  ash: {
    c50: "hsla(210, 20%, 60%, 1)", // subtle blue-tinted gray
    c100: "hsla(210, 15%, 55%, 1)", // cool blue-gray
    c200: "hsla(210, 10%, 35%, 1)", // sidebar border - blue tint
    c300: "hsla(210, 8%, 28%, 1)", // card divider - blue tint
    c400: "hsla(210, 6%, 22%, 1)", // bg + hover accents - blue tint
    c500: "hsla(210, 45%, 25%, 1)", // accent B background
    c600: "hsla(210, 42%, 20%, 1)",
    c700: "hsla(210, 40%, 16%, 1)",
    c800: "hsla(210, 35%, 10%, 1)",
    c900: "hsla(210, 30%, 7%, 1)", // deepest shade, shadows
  },
  shade: {
    c25: "hsla(210, 80%, 75%, 1)", // blue hover accent
    c50: "hsla(210, 100%, 78%, 1)", // cool blue for main text
    c100: "hsla(210, 80%, 65%, 1)", // placeholder/icon
    c200: "hsla(210, 60%, 50%, 1)", // hover bg
    c300: "hsla(210, 60%, 40%, 1)", // pill background, auth border
    c400: "hsla(210, 50%, 26%, 1)", // light bar
    c500: "hsla(210, 25%, 27%, 1)", // dropdown background - subtle blue tint
    c600: "hsla(210, 20%, 20%, 1)", // modal/dropdown background - washed out blue
    c700: "hsla(210, 15%, 16%, 1)", // alt bg - subtle blue tint
    c800: "hsla(210, 38%, 12%, 1)", // main bg - lighter
    c900: "hsla(210, 35%, 8%, 1)", // hover shadow - lighter
  },
};

export default createTheme({
  name: "frost",
  extend: {
    colors: {
      themePreview: {
        primary: tokens.blue.c200,
        secondary: tokens.shade.c50,
        ghost: tokens.purple.c400,
      },

      // Branding
      pill: {
        background: tokens.shade.c300,
        backgroundHover: tokens.shade.c200,
        highlight: tokens.blue.c200,

        activeBackground: tokens.shade.c300,
      },

      // meta data for the theme itself
      global: {
        accentA: tokens.blue.c200,
        accentB: tokens.blue.c300,
      },

      // light bar
      lightBar: {
        light: tokens.blue.c400,
      },

      // Buttons
      buttons: {
        toggle: tokens.purple.c300,
        toggleDisabled: tokens.ash.c500,
        danger: tokens.semantic.rose.c300,
        dangerHover: tokens.semantic.rose.c200,

        secondary: tokens.ash.c700,
        secondaryText: tokens.semantic.silver.c300,
        secondaryHover: tokens.ash.c700,
        primary: tokens.white,
        primaryText: tokens.black,
        primaryHover: tokens.semantic.silver.c100,
        purple: tokens.purple.c500,
        purpleHover: tokens.purple.c400,
        cancel: tokens.ash.c500,
        cancelHover: tokens.ash.c300,
      },

      // only used for body colors/textures
      background: {
        main: tokens.shade.c900,
        secondary: tokens.shade.c600,
        secondaryHover: tokens.shade.c400,
        accentA: tokens.purple.c500,
        accentB: tokens.blue.c500,
      },

      // Modals
      modal: {
        background: tokens.shade.c800,
      },

      // typography
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

      // search bar
      search: {
        background: tokens.shade.c500,
        hoverBackground: tokens.shade.c600,
        focused: tokens.shade.c400,
        placeholder: tokens.shade.c100,
        icon: tokens.shade.c100,
        text: tokens.white,
      },

      // media cards
      mediaCard: {
        hoverBackground: tokens.purple.c900,
        hoverAccent: tokens.blue.c100,
        hoverShadow: tokens.shade.c900,
        shadow: tokens.purple.c700,
        barColor: tokens.ash.c200,
        barFillColor: tokens.purple.c100,
        badge: tokens.shade.c700,
        badgeText: tokens.ash.c100,
      },

      // Large card
      largeCard: {
        background: tokens.shade.c600,
        icon: tokens.purple.c400,
      },

      // Dropdown
      dropdown: {
        background: tokens.shade.c600,
        altBackground: tokens.shade.c700,
        hoverBackground: tokens.shade.c500,
        highlight: tokens.semantic.yellow.c400,
        highlightHover: tokens.semantic.yellow.c200,
        text: tokens.shade.c50,
        secondary: tokens.shade.c100,
        border: tokens.shade.c400,
        contentBackground: tokens.shade.c500,
      },

      // Passphrase
      authentication: {
        border: tokens.shade.c300,
        inputBg: tokens.shade.c600,
        inputBgHover: tokens.shade.c500,
        wordBackground: tokens.shade.c500,
        copyText: tokens.shade.c100,
        copyTextHover: tokens.ash.c50,
        errorText: tokens.semantic.rose.c100,
      },

      // Settings page
      settings: {
        sidebar: {
          activeLink: tokens.shade.c600,
          badge: tokens.shade.c900,

          type: {
            secondary: tokens.shade.c200,
            inactive: tokens.shade.c50,
            icon: tokens.shade.c50,
            iconActivated: tokens.purple.c200,
            activated: tokens.purple.c50,
          },
        },

        card: {
          border: tokens.shade.c400,
          background: tokens.shade.c400,
          altBackground: tokens.shade.c400,
        },

        saveBar: {
          background: tokens.shade.c800,
        },
      },

      // Utilities
      utils: {
        divider: tokens.ash.c300,
      },

      // Onboarding
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

      // Error page
      errors: {
        card: tokens.shade.c800,
        border: tokens.ash.c500,

        type: {
          secondary: tokens.ash.c100,
        },
      },

      // About page
      about: {
        circle: tokens.ash.c500,
        circleText: tokens.ash.c50,
      },

      // About page
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

      // video player
      video: {
        buttonBackground: tokens.ash.c200,

        autoPlay: {
          background: tokens.ash.c700,
          hover: tokens.ash.c500,
        },

        scraping: {
          card: tokens.shade.c700,
          error: tokens.semantic.red.c200,
          success: tokens.semantic.green.c200,
          loading: tokens.purple.c200,
          noresult: tokens.ash.c100,
        },

        audio: {
          set: tokens.purple.c200,
        },

        context: {
          background: tokens.ash.c900,
          light: tokens.shade.c50,
          border: tokens.ash.c600,
          hoverColor: tokens.ash.c600,
          buttonFocus: tokens.ash.c500,
          flagBg: tokens.ash.c500,
          inputBg: tokens.ash.c600,
          buttonOverInputHover: tokens.ash.c500,
          inputPlaceholder: tokens.ash.c200,
          cardBorder: tokens.ash.c700,
          slider: tokens.ash.c50,
          sliderFilled: tokens.purple.c200,
          error: tokens.semantic.red.c200,

          buttons: {
            list: tokens.ash.c700,
            active: tokens.ash.c900,
          },

          closeHover: tokens.ash.c800,

          type: {
            main: tokens.semantic.silver.c400,
            secondary: tokens.ash.c200,
            accent: tokens.purple.c200,
          },
        },
      },
    },
  },
});
