// Default cover shown until the user uploads an image.
export const PLACEHOLDER_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
    <defs>
      <linearGradient id='g' x1='0' x2='0' y1='1' y2='0'>
        <stop offset='0%' stop-color='#0b0b0b'/>
        <stop offset='100%' stop-color='#2a3a5a'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <circle cx='50%' cy='50%' r='220' fill='#6aa7ff' fill-opacity='0.85'/>
    <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
          font-family='Arial' font-weight='700' font-size='64' fill='white'>Upload Cover</text>
  </svg>`);
