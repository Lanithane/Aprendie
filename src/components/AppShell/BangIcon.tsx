import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon'

// The ¡! wordmark motif from the favicon, drawn with currentColor so it
// inherits the surrounding nav text/active colour like any MUI icon.
export default function BangIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox='8 8 48 48' {...props}>
      {/* ¡ (opening): the bang glyph rotated 180° */}
      <g transform='translate(43.12 54.44) scale(-0.66)'>
        <path d='M28.5 8 L35.5 8 Q39 8 38.6 11.5 L37 39 Q36.7 42 33.8 42 L30.2 42 Q27.3 42 27 39 L25.4 11.5 Q25 8 28.5 8 Z' />
        <rect x='25.5' y='47' width='13' height='13' rx='3.5' />
      </g>
      {/* ! (closing) */}
      <g transform='translate(20.88 9.56) scale(0.66)'>
        <path d='M28.5 8 L35.5 8 Q39 8 38.6 11.5 L37 39 Q36.7 42 33.8 42 L30.2 42 Q27.3 42 27 39 L25.4 11.5 Q25 8 28.5 8 Z' />
        <rect x='25.5' y='47' width='13' height='13' rx='3.5' />
      </g>
    </SvgIcon>
  )
}
