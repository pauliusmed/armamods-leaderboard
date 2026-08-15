// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router-dom';
import { useUrlListState, parseEnum, parsePositiveInt, parseSortDir } from './useUrlListState';

function Harness({ initialPage = 1 }: { initialPage?: number }) {
  const [page, setPage] = useUrlListState<number>({
    param: 'page',
    fallback: 1,
    parse: (raw) => parsePositiveInt(raw, 1),
    serialize: (v) => (v <= 1 ? null : String(v)),
    mode: 'push',
  });
  const [searchParams] = useSearchParams();
  return (
    <div>
      <span data-testid="page">{page}</span>
      <span data-testid="url">{searchParams.toString()}</span>
      <button type="button" onClick={() => setPage(5)}>
        go5
      </button>
      <button type="button" onClick={() => setPage((cur) => cur + 1)}>
        inc
      </button>
      <button type="button" onClick={() => setPage(initialPage)}>
        reset
      </button>
    </div>
  );
}

function renderHarness(initialEntry: string) {
  const router = createMemoryRouter(
    [{ path: '*', element: <Harness /> }],
    { initialEntries: [initialEntry] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

function SearchHarness() {
  const [q, setQ] = useUrlListState<string>({
    param: 'q',
    fallback: '',
    parse: (raw) => raw ?? '',
    serialize: (v) => v.trim() || null,
    delayMs: 300,
  });
  const [searchParams] = useSearchParams();
  return (
    <div>
      <input aria-label="search" value={q} onChange={(e) => setQ(e.target.value)} />
      <span data-testid="url">{searchParams.toString()}</span>
    </div>
  );
}

function renderSearchHarness(initialEntry = '/') {
  const router = createMemoryRouter(
    [{ path: '*', element: <SearchHarness /> }],
    { initialEntries: [initialEntry] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('useUrlListState', () => {
  it('initializes state from URL params', () => {
    renderHarness('/?page=3');
    expect(screen.getByTestId('page').textContent).toBe('3');
  });

  it('falls back to default when param is absent or invalid', () => {
    renderHarness('/');
    expect(screen.getByTestId('page').textContent).toBe('1');
    cleanup();
    renderHarness('/?page=abc');
    expect(screen.getByTestId('page').textContent).toBe('1');
    cleanup();
    renderHarness('/?page=-2');
    expect(screen.getByTestId('page').textContent).toBe('1');
  });

  it('writes the param to the URL when the state changes', async () => {
    renderHarness('/');
    await userEvent.click(screen.getByText('go5'));
    expect(screen.getByTestId('page').textContent).toBe('5');
    expect(screen.getByTestId('url').textContent).toContain('page=5');
  });

  it('removes the param from the URL when the state returns to fallback', async () => {
    renderHarness('/?page=3');
    await userEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('page').textContent).toBe('1');
    expect(screen.getByTestId('url').textContent).not.toContain('page');
  });

  it('supports updater functions resolving against the current URL value', async () => {
    renderHarness('/?page=3');
    await userEvent.click(screen.getByText('inc'));
    expect(screen.getByTestId('page').textContent).toBe('4');
    expect(screen.getByTestId('url').textContent).toContain('page=4');
  });

  it('syncs state when the URL changes externally (back/forward)', () => {
    const router = renderHarness('/?page=3');
    act(() => {
      router.navigate('/?page=7');
    });
    expect(screen.getByTestId('page').textContent).toBe('7');
  });
});

describe('useUrlListState debounced search input', () => {
  it('keeps every keystroke in the input while the URL write is debounced', () => {
    vi.useFakeTimers();
    renderSearchHarness('/');
    const input = screen.getByLabelText('search');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input).toHaveValue('abc');
    expect(screen.getByTestId('url').textContent).not.toContain('q=');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('url').textContent).toContain('q=abc');
  });

  it('does not reset the input to the stale URL value on re-render while typing', () => {
    vi.useFakeTimers();
    renderSearchHarness('/?q=old');
    const input = screen.getByLabelText('search');
    fireEvent.change(input, { target: { value: 'oldx' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(input).toHaveValue('oldx');
  });

  it('lets external URL changes win over a pending debounced write', () => {
    vi.useFakeTimers();
    const router = renderSearchHarness('/');
    const input = screen.getByLabelText('search');
    fireEvent.change(input, { target: { value: 'abc' } });
    act(() => {
      router.navigate('/?q=restored');
    });
    expect(input).toHaveValue('restored');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('url').textContent).toContain('q=restored');
    expect(screen.getByTestId('url').textContent).not.toContain('q=abc');
  });
});

describe('useUrlListState parse helpers', () => {
  it('parseEnum validates against allowed values', () => {
    const parse = parseEnum(['all', 'high', 'medium', 'low'] as const);
    expect(parse('high', 'all')).toBe('high');
    expect(parse('evil', 'all')).toBe('all');
    expect(parse(null, 'all')).toBe('all');
  });

  it('parseSortDir accepts only asc/desc', () => {
    expect(parseSortDir('desc', 'asc')).toBe('desc');
    expect(parseSortDir('bogus', 'asc')).toBe('asc');
  });
});
