interface PlayerAvatarProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

export default function PlayerAvatar({
  name,
  color,
  size = "md",
  showName = true,
}: PlayerAvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shadow-md`}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      {showName && (
        <span className="text-white font-medium truncate max-w-[120px]">
          {name}
        </span>
      )}
    </div>
  );
}
