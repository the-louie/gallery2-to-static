import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '404 - Page Not Found',
    );
  });

  it('displays error message', () => {
    render(<NotFoundPage />);
    expect(
      screen.getByText('The page you are looking for does not exist.'),
    ).toBeInTheDocument();
  });

  it('displays link to home page', () => {
    render(<NotFoundPage />);
    const homeLink = screen.getByRole('link', { name: /go to home page/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('has proper ARIA role', () => {
    const { container } = render(<NotFoundPage />);
    const pageDiv = container.querySelector('.not-found-page');
    expect(pageDiv).toHaveAttribute('role', 'alert');
  });
});
