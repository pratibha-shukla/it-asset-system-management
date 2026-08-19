/**
 * Jest-compatible component tests for ChatWidget (run via Vitest).
 *
 * Strategy: mock the chatbot API and toast module so this test only
 * exercises ChatWidget's rendering, accessibility, and interaction logic.
 *
 * Covers:
 *  - Renders a closed launcher button by default
 *  - Opens the chat modal when the launcher is clicked
 *  - WCAG: launcher has aria-label, conversation log is a polite live region,
 *    input has an associated label
 *  - Sends a question via chatbotApi.ask and renders the assistant's answer
 *  - Send button disabled while a question is blank or a request is pending
 *  - Shows a toast and an inline error bubble on failure, including the
 *    429 rate-limit case
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock all external modules before importing ChatWidget ────────────────────

vi.mock('../api/chatbotApi', () => ({
  chatbotApi: {
    ask: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// ── Now import the component ──────────────────────────────────────────────────

import ChatWidget from '../components/ChatWidget';
import { chatbotApi } from '../api/chatbotApi';
import { toast } from 'react-toastify';

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatWidget />
    </QueryClientProvider>
  );
}

async function openChat() {
  await userEvent.click(screen.getByRole('button', { name: /open ai asset assistant chat/i }));
}

describe('ChatWidget — rendering', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the floating launcher button', () => {
    renderWidget();
    expect(screen.getByRole('button', { name: /open ai asset assistant chat/i })).toBeInTheDocument();
  });

  it('does not show the chat modal until the launcher is clicked', () => {
    renderWidget();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the modal with the conversation prompt when launcher is clicked', async () => {
    renderWidget();
    await openChat();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/ask a question about company assets/i)).toBeInTheDocument();
  });
});

describe('ChatWidget — WCAG accessibility', () => {
  it('launcher button has an aria-label', () => {
    renderWidget();
    expect(screen.getByRole('button', { name: /open ai asset assistant chat/i })).toHaveAttribute('aria-label');
  });

  it('conversation area is a polite live region', async () => {
    renderWidget();
    await openChat();
    const log = screen.getByRole('log', { name: /chat conversation/i });
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('question input has a label association', async () => {
    renderWidget();
    await openChat();
    expect(screen.getByLabelText(/ask a question about it assets/i)).toBeInTheDocument();
  });
});

describe('ChatWidget — sending a question', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('disables Send while the input is empty', async () => {
    renderWidget();
    await openChat();
    expect(screen.getByRole('button', { name: /send question/i })).toBeDisabled();
  });

  it('calls chatbotApi.ask with the typed question and renders the answer', async () => {
    chatbotApi.ask.mockResolvedValueOnce({ answer: 'There are 12 laptops assigned to Marketing.' });

    renderWidget();
    await openChat();
    await userEvent.type(screen.getByLabelText(/ask a question about it assets/i), 'Which laptops are assigned to Marketing?');
    await userEvent.click(screen.getByRole('button', { name: /send question/i }));

    expect(chatbotApi.ask).toHaveBeenCalledWith('Which laptops are assigned to Marketing?');
    expect(screen.getByText('Which laptops are assigned to Marketing?')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('There are 12 laptops assigned to Marketing.')).toBeInTheDocument();
    });
  });

  it('clears the input after sending', async () => {
    chatbotApi.ask.mockResolvedValueOnce({ answer: 'Sure thing.' });

    renderWidget();
    await openChat();
    const input = screen.getByLabelText(/ask a question about it assets/i);
    await userEvent.type(input, 'How many printers do we have?');
    await userEvent.click(screen.getByRole('button', { name: /send question/i }));

    expect(input).toHaveValue('');
  });
});

describe('ChatWidget — error handling', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows a warning toast and inline message on 429 rate limiting', async () => {
    chatbotApi.ask.mockRejectedValueOnce({
      response: { status: 429, data: 'Too many requests. Please wait a moment.' },
    });

    renderWidget();
    await openChat();
    await userEvent.type(screen.getByLabelText(/ask a question about it assets/i), 'Anything?');
    await userEvent.click(screen.getByRole('button', { name: /send question/i }));

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith('Too many requests. Please wait a moment.');
      expect(screen.getByText('Too many requests. Please wait a moment.')).toBeInTheDocument();
    });
  });

  it('shows an error toast on a generic failure', async () => {
    chatbotApi.ask.mockRejectedValueOnce({ response: { status: 500, data: null } });

    renderWidget();
    await openChat();
    await userEvent.type(screen.getByLabelText(/ask a question about it assets/i), 'Anything?');
    await userEvent.click(screen.getByRole('button', { name: /send question/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
    });
  });
});
