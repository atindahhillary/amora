// A kanga frame: patterned border, plain field, and a Swahili saying (the jina)
// along the bottom, the way kangas carry messages between people.
export function Kanga({
  children,
  jina,
  translation,
  className = "",
}: {
  children: React.ReactNode;
  jina?: string;
  translation?: string;
  className?: string;
}) {
  return (
    <div className={`kanga ${className}`}>
      <div className="kanga-field">
        {children}
        {jina && (
          <figure className="mt-5 border-t border-gold/40 pt-3 text-center">
            <blockquote lang="sw" className="font-serif text-lg font-semibold tracking-wide text-wine-dark uppercase">
              {jina}
            </blockquote>
            {translation && <figcaption className="mt-0.5 text-xs text-muted italic">{translation}</figcaption>}
          </figure>
        )}
      </div>
    </div>
  );
}
