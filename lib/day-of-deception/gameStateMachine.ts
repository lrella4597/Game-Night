import type { DayPhase } from "./types";

const VALID_TRANSITIONS: Record<DayPhase, DayPhase[]> = {
  lobby: ["roles_revealed"],
  roles_revealed: ["freeplay"],
  freeplay: ["event_active", "roundtable"],
  event_active: ["freeplay"],
  roundtable: ["voting"],
  voting: ["reveal"],
  reveal: ["end"],
  end: [],
};

export function canTransition(from: DayPhase, to: DayPhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(phase: DayPhase): DayPhase[] {
  return VALID_TRANSITIONS[phase] ?? [];
}
