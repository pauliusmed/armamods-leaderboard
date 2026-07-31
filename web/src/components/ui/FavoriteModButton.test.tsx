// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteModButton } from './FavoriteModButton';

describe('FavoriteModButton', () => {
  it('renders as "add" when inactive', () => {
    render(<FavoriteModButton active={false} modName="RHS" onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Add RHS to favorites' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.textContent).toBe('☆');
  });

  it('renders as "remove" when active', () => {
    render(<FavoriteModButton active modName="RHS" onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Remove RHS from favorites' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.textContent).toBe('★');
  });

  it('calls onToggle on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FavoriteModButton active={false} modName="RHS" onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: 'Add RHS to favorites' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('respects a 44px touch target on mobile', () => {
    render(<FavoriteModButton active={false} modName="RHS" onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Add RHS to favorites' });
    expect(button.className).toContain('min-h-11 min-w-11');
  });
});
