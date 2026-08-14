import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './index';

describe('Skeleton', () => {
  it('applies the requested dimensions', () => {
    const { container } = render(<Skeleton height="2rem" width="50%" />);
    const node = container.firstChild as HTMLElement;

    expect(node.style.height).toBe('2rem');
    expect(node.style.width).toBe('50%');
  });

  it('falls back to a full-width single line', () => {
    const { container } = render(<Skeleton />);
    const node = container.firstChild as HTMLElement;

    expect(node.style.height).toBe('1rem');
    expect(node.style.width).toBe('100%');
  });
});
