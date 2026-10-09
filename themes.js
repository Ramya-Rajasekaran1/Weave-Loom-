/**
 * Type Loom — Color Themes & Figma Brand Palettes
 */

const LOOM_THEMES = {
  'figma': {
    id: 'figma',
    name: 'Figma Spectrum',
    bg: '#0c0d12',
    artboardBg: '#111218',
    textColor: '#ffffff',
    threadColors: ['#F24E1E', '#FF7262', '#A259FF', '#1ABCFE', '#0ACF83'],
    bridgeColor: '#1ABCFE',
    pinFill: '#F24E1E',
    pinStroke: '#ffffff',
    previewDots: ['#F24E1E', '#A259FF', '#0ACF83'],
    glow: true
  },
  'tokyo': {
    id: 'tokyo',
    name: 'Electric Tokyo',
    bg: '#070913',
    artboardBg: '#0b0e1e',
    textColor: '#ffffff',
    threadColors: ['#00F5D4', '#7B2CBF', '#F72585', '#4CC9F0', '#FFE600'],
    bridgeColor: '#00F5D4',
    pinFill: '#00F5D4',
    pinStroke: '#ffffff',
    previewDots: ['#00F5D4', '#F72585', '#FFE600'],
    glow: true
  },
  'sunset': {
    id: 'sunset',
    name: 'Sunset Radiant',
    bg: '#120a14',
    artboardBg: '#1a0e1e',
    textColor: '#fff5ea',
    threadColors: ['#FF007A', '#FF5400', '#FFBD00', '#7209B7', '#4361EE'],
    bridgeColor: '#FF5400',
    pinFill: '#FFBD00',
    pinStroke: '#ffffff',
    previewDots: ['#FF007A', '#FF5400', '#FFBD00'],
    glow: true
  },
  'botanical': {
    id: 'botanical',
    name: 'Neo Botanical',
    bg: '#04100c',
    artboardBg: '#081a14',
    textColor: '#ecfdf5',
    threadColors: ['#00DF89', '#2EC4B6', '#FFBF69', '#10B981', '#CBF3F0'],
    bridgeColor: '#00DF89',
    pinFill: '#00DF89',
    pinStroke: '#047857',
    previewDots: ['#00DF89', '#2EC4B6', '#FFBF69'],
    glow: false
  },
  'cyber': {
    id: 'cyber',
    name: 'Deep Cyber',
    bg: '#050c1a',
    artboardBg: '#09152b',
    textColor: '#f0f4fc',
    threadColors: ['#80FFDB', '#72EFDD', '#48CAE4', '#5E60CE', '#6930C3'],
    bridgeColor: '#72EFDD',
    pinFill: '#80FFDB',
    pinStroke: '#ffffff',
    previewDots: ['#80FFDB', '#48CAE4', '#5E60CE'],
    glow: true
  },
  'monochrome': {
    id: 'monochrome',
    name: 'Monochrome Luxe',
    bg: '#0a0a0a',
    artboardBg: '#141414',
    textColor: '#f5f5f5',
    threadColors: ['#FFFFFF', '#D1D5DB', '#9CA3AF', '#E5E7EB', '#6B7280'],
    bridgeColor: '#FFFFFF',
    pinFill: '#FFFFFF',
    pinStroke: '#4B5563',
    previewDots: ['#FFFFFF', '#9CA3AF', '#4B5563'],
    glow: true
  }
};

window.LOOM_THEMES = LOOM_THEMES;
