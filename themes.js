/**
 * Type Loom — Visual Themes & Color Palettes
 * Inspired by Type Garden's distinct color profiles.
 */

const LOOM_THEMES = {
  'atelier': {
    id: 'atelier',
    name: 'Atelier Silk',
    bg: '#0f0e0d',
    textColor: '#f5eee6',
    threadColors: ['#e6533c', '#e5b367', '#348e7b', '#d97b43', '#8b5cf6'],
    bridgeColor: '#e5b367',
    pinFill: '#e5b367',
    pinStroke: '#8c6832',
    hasDropShadow: true,
    glow: false,
    previewGradient: 'linear-gradient(135deg, #e6533c 0%, #e5b367 50%, #348e7b 100%)'
  },
  'rose': {
    id: 'rose',
    name: 'Rose & Moss',
    bg: '#000000',
    textColor: '#fff1f2',
    threadColors: ['#ff1400', '#ffb4a8', '#3257ff', '#ff3b30', '#34c759'],
    bridgeColor: '#3257ff',
    pinFill: '#ff1400',
    pinStroke: '#ffb4a8',
    hasDropShadow: true,
    glow: false,
    previewGradient: 'linear-gradient(135deg, #ff1400 0%, #ffb4a8 50%, #3257ff 100%)'
  },
  'neon': {
    id: 'neon',
    name: 'Cyber Neon',
    bg: '#05070e',
    textColor: '#ffffff',
    threadColors: ['#00f5d4', '#7b2cbf', '#f72585', '#4cc9f0', '#fee440'],
    bridgeColor: '#00f5d4',
    pinFill: '#00f5d4',
    pinStroke: '#ffffff',
    hasDropShadow: false,
    glow: true,
    previewGradient: 'linear-gradient(135deg, #00f5d4 0%, #f72585 50%, #7b2cbf 100%)'
  },
  'celestial': {
    id: 'celestial',
    name: 'Celestial Gold',
    bg: '#080c14',
    textColor: '#f0f4fc',
    threadColors: ['#ffd166', '#f4a261', '#e9c46a', '#a8dadc', '#ffffff'],
    bridgeColor: '#ffd166',
    pinFill: '#ffd166',
    pinStroke: '#ffffff',
    hasDropShadow: true,
    glow: true,
    previewGradient: 'linear-gradient(135deg, #ffd166 0%, #f4a261 50%, #a8dadc 100%)'
  },
  'emerald': {
    id: 'emerald',
    name: 'Botanical Emerald',
    bg: '#06100c',
    textColor: '#ecfdf5',
    threadColors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#059669'],
    bridgeColor: '#10b981',
    pinFill: '#10b981',
    pinStroke: '#047857',
    hasDropShadow: true,
    glow: false,
    previewGradient: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #f59e0b 100%)'
  },
  'bauhaus': {
    id: 'bauhaus',
    name: 'Bauhaus Canvas',
    bg: '#141414',
    textColor: '#ede7dc',
    threadColors: ['#d62828', '#003049', '#f77f00', '#fcbf49', '#eae2b7'],
    bridgeColor: '#003049',
    pinFill: '#f77f00',
    pinStroke: '#d62828',
    hasDropShadow: true,
    glow: false,
    previewGradient: 'linear-gradient(135deg, #d62828 0%, #003049 50%, #fcbf49 100%)'
  },
  'monolith': {
    id: 'monolith',
    name: 'Obsidian & Platinum',
    bg: '#0a0a0a',
    textColor: '#f5f5f5',
    threadColors: ['#ffffff', '#a3a3a3', '#737373', '#d4d4d4', '#e5e5e5'],
    bridgeColor: '#ffffff',
    pinFill: '#ffffff',
    pinStroke: '#525252',
    hasDropShadow: true,
    glow: true,
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #737373 100%)'
  }
};

window.LOOM_THEMES = LOOM_THEMES;
