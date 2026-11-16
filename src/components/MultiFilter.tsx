import { ChevronDown } from "lucide-react";
export function MultiFilter({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <details className="multi-filter">
      <summary>
        {name}
        <span>{value.length || "All"}</span>
        <ChevronDown size={13} />
      </summary>
      <div className="filter-options">
        <strong>{name}</strong>
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="checkbox"
              checked={value.includes(o.value)}
              onChange={() =>
                onChange(
                  value.includes(o.value)
                    ? value.filter((v) => v !== o.value)
                    : [...value, o.value],
                )
              }
            />
            {o.label}
          </label>
        ))}
        <button onClick={() => onChange([])}>Reset {name.toLowerCase()}</button>
      </div>
    </details>
  );
}
