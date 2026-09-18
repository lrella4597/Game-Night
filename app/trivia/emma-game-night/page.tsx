import type { Metadata } from "next";
import EmmaGameNightBoard from "./EmmaGameNightBoard";

export const metadata: Metadata = {
  title: "Emma's Game Night | Trivia Free-for-All",
  description: "A six-category game-night trivia board for Luke and Emma.",
};

export default function EmmaGameNightPage() {
  return <EmmaGameNightBoard />;
}
