import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";

import { formatAge } from "@/utils/formatters";

const TICK_MS = 60 * 1000;

// "Updated 12 min ago", kept current while the screen is open. The timer
// lives here so only this label re-renders each minute, not the whole list.
export function UpdatedLabel({
  updatedAt,
  style,
}: {
  updatedAt: number;
  style?: TextProps["style"];
}) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return <Text style={style}>Updated {formatAge(updatedAt, now)}</Text>;
}
