import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/hooks/api/use-admin-users";

interface TeacherInputProps {
  value: any;
  onChange: (value: any) => void;
  onBlur?: (e: any) => void;
  name?: string;
  ref?: any;
}

export function TeacherInput({ value, onChange, onBlur, name, ref }: TeacherInputProps) {
  const [focused, setFocused] = useState(false);
  const { data } = useUsers({ role: "teacher", limit: 100 });
  const teachers = data?.users || [];

  const stringValue = value || "";
  const tokens = stringValue.split(",").map((t: string) => t.trim());
  const currentToken = tokens[tokens.length - 1] || "";

  const suggestions = teachers.filter((t: any) => {
    const code = t.teacherProfile?.code || "";
    const teacherName = t.name || "";
    return (
      (code.toLowerCase().includes(currentToken.toLowerCase()) ||
        teacherName.toLowerCase().includes(currentToken.toLowerCase())) &&
      !tokens.slice(0, -1).includes(code)
    );
  });

  const handleSelect = (teacher: any) => {
    const code = teacher.teacherProfile?.code || teacher.id;
    const newTokens = [...tokens.slice(0, -1), code];
    onChange(newTokens.join(", ") + ", ");
  };

  return (
    <div className="relative">
      <Input
        name={name}
        ref={ref}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setTimeout(() => setFocused(false), 200);
          if (onBlur) onBlur(e);
        }}
        placeholder="T01, T02"
        autoComplete="new-password"
        spellCheck="false"
      />
      {focused && currentToken && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto text-sm">
          {suggestions.map((t: any) => (
            <div
              key={t.id}
              className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(t);
              }}
            >
              <span className="font-semibold">{t.teacherProfile?.code}</span>
              <span className="text-muted-foreground text-xs">{t.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
