import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GolfGame from "./GolfGame";
import { isValidDate, todayEastern } from "./lib/course";
import { parseToPar } from "./lib/shot";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const d = params.get("d");
const date = isValidDate(d) ? d : todayEastern();
const beat = parseToPar(params.get("beat"));
const by = (params.get("by") || "").slice(0, 40).trim();
const challenge = beat != null ? { toPar: beat, by: by || "A friend" } : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GolfGame date={date} challenge={challenge} />
  </StrictMode>,
);
