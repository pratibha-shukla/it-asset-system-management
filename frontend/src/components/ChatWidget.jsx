import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { chatbotApi } from '../api/chatbotApi';
import './ChatWidget.css';

let nextId = 1;

export default function ChatWidget() {
  const [show, setShow] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the conversation scrolled to the latest message
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, show]);

  const askMutation = useMutation({
    mutationFn: (question) => chatbotApi.ask(question),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'assistant', text: data?.answer || "I don't have an answer for that." },
      ]);
    },
    onError: (error) => {
      const raw = typeof error.response?.data === 'string' ? error.response.data : null;
      if (error.response?.status === 429) {
        toast.warning(raw || 'Too many requests. Please wait a moment.');
      } else {
        toast.error(raw || 'Something went wrong. Please try again.');
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'assistant', text: raw || "Sorry, I couldn't process that. Please try again.", isError: true },
      ]);
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || askMutation.isPending) return;
    setMessages((prev) => [...prev, { id: nextId++, role: 'user', text: question }]);
    setInput('');
    askMutation.mutate(question);
  };

  // RAG-powered suggested questions — grounded in real ITAM use cases
  const suggestions = [
    'Which assets are available right now?',
    'Show me all compliance risks',
    'How many laptops are assigned?',
    'Which assets need maintenance?',
  ];

  const handleSuggestion = (text) => {
    setMessages((prev) => [...prev, { id: nextId++, role: 'user', text }]);
    askMutation.mutate(text);
  };

  return (
    <>
      {/* Floating launcher — fixed overlay, same positioning pattern as NotificationBanner.
          Bottom-LEFT on purpose: React Query Devtools' toggle (dev-mode only, see
          main.jsx) occupies the bottom-right corner and would otherwise sit on top
          of this button and hide it. */}
      <button
        type="button"
        onClick={() => setShow(true)}
        aria-label="Open AI asset assistant chat"
        className="chat-launcher"
      >
        <span aria-hidden="true">🤖</span>
      </button>

      <Modal
        show={show}
        onHide={() => setShow(false)}
        onEntered={() => inputRef.current?.focus()}
        centered
        size="lg"
        aria-labelledby="chat-widget-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="chat-widget-title">
            <span aria-hidden="true">🤖 </span>Ask about IT Assets
            <small className="text-muted ms-2 chat-badge">
              RAG · Live Data · MCP
            </small>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Suggested questions — shown only on fresh chat (no messages yet) */}
          {messages.length === 0 && (
            <div className="mb-3">
              <p className="text-muted small mb-2">Try asking:</p>
              <div className="d-flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn btn-outline-secondary btn-sm chat-suggestion"
                    onClick={() => handleSuggestion(s)}
                    disabled={askMutation.isPending}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <hr />
            </div>
          )}

          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Chat conversation"
            className="chat-messages"
          >
            {messages.length === 0 && (
              <p className="text-muted mb-0">
                Ask a question about company assets — e.g. "Which laptops are assigned to Marketing?"
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-msg ${
                  m.role === 'user'
                    ? 'chat-msg--user'
                    : m.isError
                    ? 'chat-msg--error'
                    : 'chat-msg--bot'
                }`}
              >
                {m.text}
              </div>
            ))}
            {askMutation.isPending && (
              <div className="chat-msg--pending">
                <Spinner animation="border" size="sm" aria-hidden="true" />
                <span className="sr-only">Assistant is thinking…</span>
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Form onSubmit={handleSend} className="d-flex w-100 gap-2">
            <Form.Label htmlFor="chat-widget-input" className="sr-only">Ask a question about IT assets</Form.Label>
            <Form.Control
              id="chat-widget-input"
              ref={inputRef}
              placeholder="Ask about an asset…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={askMutation.isPending}
              autoComplete="off"
            />
            <Button type="submit" variant="primary" disabled={!input.trim() || askMutation.isPending} aria-label="Send question">
              {askMutation.isPending ? <Spinner size="sm" animation="border" aria-hidden="true" /> : 'Send'}
            </Button>
          </Form>
        </Modal.Footer>
      </Modal>
    </>
  );
}
