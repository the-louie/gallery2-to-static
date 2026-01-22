/**
 * ViewModeToggle Component Tests
 *
 * Tests for the view mode toggle button group component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, userEvent } from '@/test-utils';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { ViewModeToggle } from './ViewModeToggle';

// Helper to create wrapper with ViewModeProvider
function createWrapper(defaultPreference?: { albums: 'grid' | 'list'; images: 'grid' | 'list' }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ViewModeProvider defaultPreference={defaultPreference || { albums: 'grid', images: 'grid' }}>
        {children}
      </ViewModeProvider>
    );
  };
}

describe('ViewModeToggle', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  it('renders view mode toggle buttons', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('Grid');
    expect(buttons[1]).toHaveTextContent('List');
  });

  it('displays grid icon', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    const svg = gridButton.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('displays list icon', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];
    const svg = listButton.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows grid as active when view mode is grid', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    const listButton = buttons[1];

    expect(gridButton).toHaveClass('view-mode-toggle-button-active');
    expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    expect(listButton).not.toHaveClass('view-mode-toggle-button-active');
    expect(listButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows list as active when view mode is list', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'list', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    const listButton = buttons[1];

    expect(listButton).toHaveClass('view-mode-toggle-button-active');
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
    expect(gridButton).not.toHaveClass('view-mode-toggle-button-active');
    expect(gridButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to grid view when grid button is clicked', async () => {
    const user = userEvent.setup();

    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'list', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];

    expect(gridButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(gridButton);

    expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to list view when list button is clicked', async () => {
    const user = userEvent.setup();

    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];

    expect(listButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(listButton);

    expect(listButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('controls albums view mode when contentType is albums', async () => {
    const user = userEvent.setup();

    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];

    await user.click(listButton);

    // Check localStorage
    const stored = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
    expect(stored.albums).toBe('list');
    expect(stored.images).toBe('grid'); // Should not change
  });

  it('controls images view mode when contentType is images', async () => {
    const user = userEvent.setup();

    render(<ViewModeToggle contentType="images" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];

    await user.click(listButton);

    // Check localStorage
    const stored = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
    expect(stored.images).toBe('list');
    expect(stored.albums).toBe('grid'); // Should not change
  });

  it('responds to keyboard Enter', async () => {
    const user = userEvent.setup();

    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];
    listButton.focus();

    expect(listButton).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard('{Enter}');
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('responds to keyboard Space', async () => {
    const user = userEvent.setup();

    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];
    listButton.focus();

    expect(listButton).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard(' ');
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('has correct aria-label for grid button when active', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    expect(gridButton).toHaveAttribute('aria-label', expect.stringContaining('albums view: grid mode (active)'));
  });

  it('has correct aria-label for list button when active', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'list', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const listButton = buttons[1];
    expect(listButton).toHaveAttribute('aria-label', expect.stringContaining('albums view: list mode (active)'));
  });

  it('has correct aria-label for images contentType', () => {
    render(<ViewModeToggle contentType="images" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    expect(gridButton).toHaveAttribute('aria-label', expect.stringContaining('images'));
  });

  it('applies custom className', () => {
    render(<ViewModeToggle contentType="albums" className="custom-class" />, {
      wrapper: createWrapper(),
    });

    const container = screen.getByRole('group');
    expect(container).toHaveClass('view-mode-toggle');
    expect(container).toHaveClass('custom-class');
  });

  it('has title attributes', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
    });

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('title', 'albums view: grid');
    expect(buttons[1]).toHaveAttribute('title', 'albums view: list');
  });

  it('is focusable', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    expect(buttons[0]).toHaveFocus();
  });

  it('has type="button" attribute', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('icons have aria-hidden attribute', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('has role="group" for container', () => {
    render(<ViewModeToggle contentType="albums" />, {
      wrapper: createWrapper(),
    });

    const container = screen.getByRole('group');
    expect(container).toHaveAttribute('aria-label', 'albums view mode selector');
  });
});
