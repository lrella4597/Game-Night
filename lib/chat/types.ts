// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Chat Board Builder Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CategoryOrigin = "classic" | "chat_draft";

export interface DraftCategory {
  id: string;
  name: string;
  promptTemplate: string;
  difficultyGuidance: string;
  answerFormatGuidance: string;
  examples: string;
  origin: CategoryOrigin;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BoardTemplate {
  id: string;
  name: string;
  theme: string;
  difficulty_1_to_10: number;
  categories: {
    categoryId: string;
    name: string;
    promptTemplate: string;
    difficultyGuidance: string;
    answerFormatGuidance: string;
    examples: string;
    origin: CategoryOrigin;
  }[];
  createdAt: number;
  updatedAt: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Chat Action Protocol (LLM → App)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ChatActionType =
  | "propose_categories"
  | "create_draft_categories"
  | "create_board_template"
  | "update_board_template"
  | "promote_category_to_classic"
  | "ask_clarification";

export interface ProposeCategories {
  type: "propose_categories";
  categories: {
    name: string;
    description: string;
    difficulty_1_to_10: number;
  }[];
}

export interface CreateDraftCategories {
  type: "create_draft_categories";
  categories: {
    name: string;
    promptTemplate: string;
    difficultyGuidance: string;
    answerFormatGuidance: string;
    examples: string;
    tags?: string[];
  }[];
}

export interface CreateBoardTemplate {
  type: "create_board_template";
  boardName: string;
  theme: string;
  difficulty_1_to_10: number;
  categoryIds: string[]; // References to draft categories just created
}

export interface UpdateBoardTemplate {
  type: "update_board_template";
  boardId: string;
  updates: Partial<BoardTemplate>;
}

export interface PromoteCategoryToClassic {
  type: "promote_category_to_classic";
  draftCategoryId: string;
}

export interface AskClarification {
  type: "ask_clarification";
  question: string;
  options?: string[];
}

export type ChatAction =
  | ProposeCategories
  | CreateDraftCategories
  | CreateBoardTemplate
  | UpdateBoardTemplate
  | PromoteCategoryToClassic
  | AskClarification;

export interface ChatResponse {
  assistant_message: string; // Human-readable message for user
  actions: ChatAction[]; // Machine-executable actions
  metadata?: {
    difficulty_1_to_10?: number;
    theme?: string;
    categoryCount?: number;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Chat Message Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: ChatAction[];
}

export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Customize Today Types (Day of Deception)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MissionPackItem {
  id: string;
  text: string;
  category: "social" | "conversational" | "sneaky";
  riskLevel: "low" | "medium" | "high";
  tags: string[];
  locked?: boolean;
}

export interface EventPackItem {
  id: string;
  name: string;
  instructions: string;
  durationMinutes: number;
  deceiverSecretMission?: string;
  tags: string[];
  locked?: boolean;
}

export interface ContextSummary {
  theme: string;
  setting: string;
  playerCount?: number;
  additionalNotes?: string;
  conversationHistory: string;
}

export interface CustomizeTodayResponse {
  assistant_message: string;
  mission_pack: MissionPackItem[];
  event_pack: EventPackItem[];
  context_summary: ContextSummary;
}
