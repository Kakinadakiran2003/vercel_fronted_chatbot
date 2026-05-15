import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserSidebar } from './UserSidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const mockSessions = [
  { id: '1', title: 'Chat 1', timestamp: new Date().toISOString() },
  { id: '2', title: 'Chat 2', timestamp: new Date().toISOString() },
];

describe('UserSidebar', () => {
  it('renders session titles', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UserSidebar
          sessionId="1"
          sessions={mockSessions}
          onNewChat={vi.fn()}
          onSelectSession={vi.fn()}
          onDeleteSession={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Chat 2')).toBeInTheDocument();
  });

  it('calls onNewChat when New Chat button is clicked', () => {
    const onNewChat = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <UserSidebar
          sessionId="1"
          sessions={mockSessions}
          onNewChat={onNewChat}
          onSelectSession={vi.fn()}
          onDeleteSession={vi.fn()}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('New Chat'));
    expect(onNewChat).toHaveBeenCalled();
  });

  it('shows login modal when Admin Control is clicked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UserSidebar
          sessionId="1"
          sessions={mockSessions}
          onNewChat={vi.fn()}
          onSelectSession={vi.fn()}
          onDeleteSession={vi.fn()}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Admin Control'));
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
  });
});
