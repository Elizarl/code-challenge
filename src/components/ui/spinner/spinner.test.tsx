import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from './index';

describe('Spinner', () => {
  it('is hidden from assistive tech because it carries no information', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a larger variant on request', () => {
    const { container: small } = render(<Spinner />);
    const { container: large } = render(<Spinner large />);

    const smallClass = (small.firstChild as HTMLElement).className;
    const largeClass = (large.firstChild as HTMLElement).className;

    expect(largeClass).not.toBe(smallClass);
    expect(largeClass.split(' ').length).toBeGreaterThan(smallClass.split(' ').length);
  });
});
