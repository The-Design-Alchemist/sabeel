/** The ornamental diamond divider used between Arabic / transliteration / translation. */
export function Divider() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <svg width="112" height="13" viewBox="0 0 112 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0 6.36389H42M69.3137 6.36389H111.314M55.6569 0.707031L61.3137 6.36389L55.6569 12.0207L50 6.36389L55.6569 0.707031Z"
          stroke="#E1E5E6"
        />
      </svg>
    </div>
  )
}
