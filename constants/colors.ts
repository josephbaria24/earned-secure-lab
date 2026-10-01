/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#183B50', tint: '#214C3A', background: '#F7F3EC', foreground: '#183B50',
    card: '#FFFCF7', cardForeground: '#183B50', primary: '#214C3A', primaryForeground: '#FFFFFF',
    secondary: '#E7EEE5', secondaryForeground: '#214C3A', muted: '#EFE8DE', mutedForeground: '#797D7A',
    accent: '#D8A184', accentForeground: '#183B50', border: '#DED8CE', input: '#FFFFFF',
    destructive: '#A95F58', blue: '#668B9C', sage: '#97A994', peach: '#D8A184',
  },
  radius: 22,
};

export default colors;
