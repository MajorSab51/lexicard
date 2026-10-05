interface TagListProps {
  tags: readonly string[];
  className?: string;
}

export function TagList({ tags, className = '' }: TagListProps) {
  if (tags.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
