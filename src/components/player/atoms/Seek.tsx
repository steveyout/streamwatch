import { Icon, Icons } from "@/components/Icon";

export type SeekDirection = "backward" | "forward";

export function Seek(props: { direction: SeekDirection }) {
  return (
    <div
      className={`pointer-events-none flex h-20 w-20 items-center justify-center rounded-full bg-black bg-opacity-50 text-white ${
        props.direction === "backward"
          ? "animate-seek-left"
          : "animate-seek-right"
      }`}
    >
      <Icon
        icon={
          props.direction === "backward"
            ? Icons.SKIP_BACKWARD
            : Icons.SKIP_FORWARD
        }
        className="text-3xl"
      />
    </div>
  );
}
