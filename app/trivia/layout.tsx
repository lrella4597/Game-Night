import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trivia Free-for-All | Game Night",
  description: "A Jeopardy-style trivia game",
};

export default function TriviaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
