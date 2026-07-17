"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of the children if they throw. */
  fallback?: ReactNode;
  /** Optional label for the console warning. */
  label?: string;
}

interface State {
  failed: boolean;
}

/**
 * Generic error boundary. Used to make optional 3D content (e.g. a heavy glTF
 * scenery model) non-fatal: if loading or rendering throws, we quietly swap in
 * a fallback and the game keeps running.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`[${this.props.label ?? "ErrorBoundary"}]`, error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
