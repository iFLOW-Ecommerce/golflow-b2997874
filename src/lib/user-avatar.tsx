import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const AVATAR_STYLE = "bottts-neutral";

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}

interface Props {
  seed?: string | null;
  name?: string | null;
  className?: string;
}

export function UserAvatar({ seed, name, className }: Props) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {seed ? <AvatarImage src={avatarUrl(seed)} alt={name ?? "avatar"} /> : null}
      <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}
