import { Component, type ReactNode } from "react";
import { ErrorState } from "@/components/shared";

/** Keeps a page crash inside the page, with a way back, instead of blanking the whole app. */
export class RouteBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorState title="This page could not load" body={this.state.error.message} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}
