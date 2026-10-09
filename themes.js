/**
 * Type Loom — Visual Themes & Color Palettes
 */

const LOOM_THEMES = {
  'atelier': {
    name: 'Atelier Silk',
    bg: '#181614',
    bgPattern: 'linen',
    textMain: '#f7efe1',
    threadColors: ['#e6533c', '#e5b367', '#348e7b', '#d97b43', '#8b5cf6'],
    bridgeColor: '#e5b367',
    pinFill: '#e5b367',
    pinStroke: '#8c6832',
    hasDropShadow: true,
    glow: false
  },
  'neon': {
    name: 'Neon Cyber-Loom',
    bg: '#090a0f',
    bgPattern: 'grid',
    textMain: '#ffffff',
    threadColors: ['#00f5d4', '#7b2cbf', '#f72585', '#4cc9f0', '#fee440'],
    bridgeColor: '#00f5d4',
    pinFill: '#00f5d4',
    pinStroke: '#ffffff',
    hasDropShadow: false,
    glow: true
  },
  'bauhaus': {
    name: 'Bauhaus Loom',
    bg: '#ede7dc',
    bgPattern: 'paper',
    textMain: '#1e1e24',
    threadColors: ['#d62828', '#003049', '#f77f00', '#2b2d42', '#fcbf49'],
    bridgeColor: '#003049',
    pinFill: '#1e1e24',
    pinStroke: '#d62828',
    hasDropShadow: true,
    glow: false
  },
  'celestial': {
    name: 'Celestial Gold',
    bg: '#0c111d',
    bgPattern: 'stars',
    textMain: '#f0f4fc',
    threadColors: ['#ffd166', '#f4a261', '#e9c46a', '#a8dadc', '#ffffff'],
    bridgeColor: '#ffd166',
    pinFill: '#ffd166',
    pinStroke: '#ffffff',
    hasDropShadow: true,
    glow: true
  },
  'rose': {
    name: 'Rose Garden',
    bg: '#141416',
    bgPattern: 'linen',
    textMain: '#fff1f2',
    threadColors: ['#f43f5e', '#fb7185', '#fda4af', '#10b981', '#fbbf24'],
    bridgeColor: '#f43f5e',
    pinFill: '#f43f5e',
    pinStroke: '#881337',
    hasDropShadow: true,
    glow: false
  }
};

window.LOOM_THEMES = LOOM_THEMES;
