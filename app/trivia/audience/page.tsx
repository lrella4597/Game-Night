import type { Metadata } from "next";
import AudienceDisplay from "./AudienceDisplay";

export const metadata: Metadata = {
  title: "Audience View | Trivia Free-for-All",
  description: "A clean shared-screen view for Trivia Free-for-All.",
};

export default function TriviaAudiencePage() {
  return <AudienceDisplay />;
}
