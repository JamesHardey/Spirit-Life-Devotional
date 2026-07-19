"use client";

import { useEffect, useState } from "react";
import type { Devotional } from "@/lib/types";
import { isRead } from "@/lib/streak";
import { DevotionalCard } from "./DevotionalCard";

// Client wrapper so the "Read" badge reflects on-device state.
export function TodayDevotionalCard({ devotional }: { devotional: Devotional | null }) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    if (devotional) setRead(isRead(devotional.date));
  }, [devotional]);

  return <DevotionalCard devotional={devotional} isRead={read} />;
}
