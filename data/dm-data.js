// dm-data.js — DM Screen static data: theme, colors, conditions reference
/* ═══════════════════════════════════════════
   DM SCREEN DATA
   ═══════════════════════════════════════════ */

/* DM Screen neutral theme — works with existing applyTheme() */
const DM_THEME = {
  name: 'DM Screen',
  accent: '#a0a8b8', accentHover: '#b0b8c8', accentDim: '#707888',
  bg: '#131517', surface: '#1b1d21', surfaceRaised: '#252830',
  border: '#2e3340', text: '#dce0e8', textDim: '#8890a0',
  error: '#c45a5a', success: '#6aaa5a', inputBg: '#171a1e'
};

/* Row border colors for initiative tracker (used in Handoff B+) */
const DM_ROW_COLORS = {
  pcBorder: '#4a6a9a',
  npcBorder: '#9a4a4a'
};

/* CONDITIONS array is already a global var in js/combat.js — no duplication needed.
   DM Screen code references CONDITIONS and getConditionDesc() directly. */
