/**
 * Authored content for the Contextualisation Explainer.
 *
 * The explainer is a snap-scroll sequence of authored screens followed
 * by a fixed final screen that restates the Essential Question.
 *
 * Two screen kinds for v1:
 *   - 'text'     plain prose with optional small tag and optional image
 *   - 'question' multiple choice — every option has its own response;
 *                 wrong choices light red, the correct one lights green
 *                 and auto-advances
 *
 * Rich text is stored as HTML strings (set on contentEditable, rendered
 * with dangerouslySetInnerHTML). Trustworthy because the editor is
 * admin-only.
 */

export type ScreenKind = 'text' | 'question';

interface BaseScreen {
  id: string;
  kind: ScreenKind;
}

export interface TextScreen extends BaseScreen {
  kind: 'text';
  /** Small uppercase label above the text (e.g. "Clue A"). Optional. */
  tag: string | null;
  /** Rich text — HTML. */
  contentHtml: string;
  /** Hero image or GIF for the screen. Optional. */
  imageUrl: string | null;
}

export interface QuestionOption {
  id: string;
  /** Small uppercase tag shown above the option's presentation
   *  screen — e.g. "Clue A". Optional. */
  tag: string;
  /** Long-form rich text shown on its OWN screen, before the player
   *  reaches the multiple-choice buttons. */
  presentationHtml: string;
  /** Short button text on the choice screen — plain text only. */
  label: string;
  correct: boolean;
  /** Rich text shown after the player taps this option on the
   *  choice screen (red box if wrong, green if correct). */
  responseHtml: string;
}

export interface QuestionScreen extends BaseScreen {
  kind: 'question';
  /** The question itself — rich text, HTML. */
  questionHtml: string;
  options: QuestionOption[];
}

export type Screen = TextScreen | QuestionScreen;

// ── Factories ─────────────────────────────────────────────────

function id(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `scr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function blankTextScreen(): TextScreen {
  return {
    id: id(),
    kind: 'text',
    tag: null,
    contentHtml: '',
    imageUrl: null,
  };
}

export function blankQuestionScreen(): QuestionScreen {
  return {
    id: id(),
    kind: 'question',
    questionHtml: '',
    options: [
      {
        id: id(),
        tag: 'Clue A',
        presentationHtml: '',
        label: 'Option A',
        correct: false,
        responseHtml: '',
      },
      {
        id: id(),
        tag: 'Clue B',
        presentationHtml: '',
        label: 'Option B',
        correct: true,
        responseHtml: '',
      },
    ],
  };
}

export function blankQuestionOption(): QuestionOption {
  return {
    id: id(),
    tag: '',
    presentationHtml: '',
    label: 'New option',
    correct: false,
    responseHtml: '',
  };
}
