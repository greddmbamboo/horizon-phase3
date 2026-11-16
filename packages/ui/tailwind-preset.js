/**
 * Shared Tailwind preset for both apps (mirrors hofund-intel/packages/ui/tailwind-preset.js).
 * Colours are CSS variables so each app themes itself: the client portal sets the
 * tenant accent (violet for Spacely), the operator app sets Hofund Baltic + Gold.
 * Values come from the Figma file "Horizon — Phase 3 Mocks" (Hofund brand colors + Horizon / Color).
 */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
module.exports = {
  theme: {
    extend: {
      colors: {
        page: v('surface-page'),
        sunk: v('surface-sunk'),
        highlight: v('surface-highlight'),
        line: v('border-default'),
        'line-strong': v('border-strong'),
        ink: v('text-primary'),
        muted: v('text-muted'),
        link: v('text-link'),
        accent: v('accent'),
        'accent-fg': v('accent-fg'),
        'action-bg': v('action-primary-bg'),
        'action-fg': v('action-primary-fg'),
        'disabled-bg': v('action-disabled-bg'),
        'disabled-fg': v('action-disabled-fg'),
        rail: v('rail-bg'),
        'rail-edge': v('rail-edge'),
        'rail-ink': v('rail-text'),
        'rail-muted': v('rail-text-muted'),
        'rail-active': v('rail-active-bg'),
        'rail-marker': v('rail-active-marker'),
        status: {
          needs: '#F4A552', progress: '#6FD4DA', done: '#00AA8B', failed: '#DB0F00', inactive: '#909090', updated: '#FCC12B',
        },
        carrot: { 300: '#F7B269', 400: '#F4A552' },
        parchment: { 400: '#FAF8F4', 600: '#EEEAE1' },
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'serif'],
      },
      borderRadius: { card: '8px' },
      boxShadow: { modal: '0 12px 32px rgba(0,0,0,.18)' },
    },
  },
};
