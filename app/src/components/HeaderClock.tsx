import { useEffect, useState } from "react";
import { Text, View } from "react-native";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const align = 60_000 - (Date.now() % 60_000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, align);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <View className="mr-4 flex-row items-center gap-2">
      <Text>{formatDate(now)}</Text>
      <Text>{formatTime(now)}</Text>
    </View>
  );
}
