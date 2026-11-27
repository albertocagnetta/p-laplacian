// Edit a label here to update both the menu and the corresponding figure.
// For a video that is not published yet, leave href empty. Paste its URL to enable it.
// Relative URLs are resolved from the poster homepage.
const posterResources = {
  exploreLabel: 'Explore the poster',
  actions: [
    { id: 'flow-ar', figure: 'flow', label: 'Explore the flow in AR',
      href: 'ar/', note: 'Scan the concentration and flux figure.', type: 'ar' },
    { id: 'phase-ar', figure: 'phase', label: 'Explore the phase towers in AR',
      href: 'ar/phase/', note: 'Scan the phase plane or open the 3D preview.', type: 'ar' },
    { id: 'quotient-video', figure: 'quotient', label: 'Watch the video on the ratio Q',
      href: 'https://www.youtube.com/watch?v=RbK1e94p8v0', note: 'YouTube', type: 'video' },
    { id: 'periodic-video', figure: 'periodic', label: 'Watch the reduction from periodic to Neumann',
      href: '', note: 'Video', type: 'video' },
    { id: 'phase-video', figure: 'phase', label: 'Watch the phase-plane construction',
      href: '', note: 'Video', type: 'video' }
  ]
};
