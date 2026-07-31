// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';

function renderNav(game?: string, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav game={game} />
    </MemoryRouter>
  );
}

describe('BottomNav', () => {
  it('renders the five primary tabs', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Mods' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Servers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scenarios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
  });

  it('links to the reforger paths by default', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Servers' })).toHaveAttribute('href', '/servers');
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveAttribute('href', '/trending');
  });

  it('prefixes links with /arma3 when game is arma3', () => {
    renderNav('arma3');
    expect(screen.getByRole('link', { name: 'Servers' })).toHaveAttribute('href', '/arma3/servers');
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveAttribute('href', '/arma3/trending');
  });

  it('marks the active tab with the orange indicator', () => {
    renderNav(undefined, '/servers');
    const servers = screen.getByRole('link', { name: 'Servers' });
    const mods = screen.getByRole('link', { name: 'Mods' });
    expect(servers.querySelector('.bg-tactical-orange')).not.toBeNull();
    expect(mods.querySelector('.bg-tactical-orange')).toBeNull();
  });

  it('expands and closes the tools sheet', async () => {
    const user = userEvent.setup();
    renderNav();

    expect(screen.queryByRole('link', { name: 'Config Audit' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tools' }));
    expect(screen.getByRole('link', { name: 'Config Audit' })).toHaveAttribute('href', '/audit');
    expect(screen.getByRole('link', { name: 'Planner' })).toHaveAttribute('href', '/storage-planner');

    await user.click(screen.getByRole('button', { name: 'Tools' }));
    expect(screen.queryByRole('link', { name: 'Config Audit' })).not.toBeInTheDocument();
  });
});
