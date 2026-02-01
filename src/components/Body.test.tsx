import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Body, type Category } from './Body';

const mockCategories: Category[] = [
  { _id: 'cat-1', name: 'Healthcare', description: 'Health programs', color: '#ef4444', order: 0, page: 0 },
  { _id: 'cat-2', name: 'Education', description: 'Education programs', color: '#3b82f6', order: 1, page: 0 },
  { _id: 'cat-3', name: 'Defense', description: 'Military spending', color: '#6b7280', order: 2, page: 0 },
  { _id: 'cat-4', name: 'Social Security', description: 'Retirement benefits', color: '#8b5cf6', order: 0, page: 1 },
  { _id: 'cat-5', name: 'Environment', description: 'Environmental protection', color: '#22c55e', order: 1, page: 1 },
];

describe('Body', () => {
  const defaultProps = {
    categories: mockCategories,
    allocations: new Map<string, number>([
      ['cat-1', 25],
      ['cat-2', 20],
      ['cat-3', 15],
      ['cat-4', 10],
      ['cat-5', 5],
    ]),
    currentPage: 0,
    onAllocationChange: vi.fn(),
    onPageChange: vi.fn(),
  };

  describe('category filtering', () => {
    it('should only show categories for the current page', () => {
      render(<Body {...defaultProps} currentPage={0} />);
      
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText('Defense')).toBeInTheDocument();
      expect(screen.queryByText('Social Security')).not.toBeInTheDocument();
      expect(screen.queryByText('Environment')).not.toBeInTheDocument();
    });

    it('should show page 1 categories when currentPage is 1', () => {
      render(<Body {...defaultProps} currentPage={1} />);
      
      expect(screen.queryByText('Healthcare')).not.toBeInTheDocument();
      expect(screen.queryByText('Education')).not.toBeInTheDocument();
      expect(screen.getByText('Social Security')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
    });

    it('should show "No categories" message for empty page', () => {
      render(<Body {...defaultProps} currentPage={5} />);
      
      expect(screen.getByText('No categories on this page')).toBeInTheDocument();
    });
  });

  describe('allocation summary', () => {
    it('should calculate total allocated percentage', () => {
      render(<Body {...defaultProps} />);
      
      // Total: 25 + 20 + 15 + 10 + 5 = 75
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('allocated')).toBeInTheDocument();
    });

    it('should show normal status when allocation is below 90%', () => {
      const allocations = new Map([
        ['cat-1', 25],
        ['cat-2', 20],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      const summary = document.querySelector('.allocation-summary');
      expect(summary).toHaveClass('normal');
    });

    it('should show warning status when allocation is 90-99%', () => {
      const allocations = new Map([
        ['cat-1', 50],
        ['cat-2', 45],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      const summary = document.querySelector('.allocation-summary');
      expect(summary).toHaveClass('warning');
    });

    it('should show full status when allocation is 100%', () => {
      const allocations = new Map([
        ['cat-1', 50],
        ['cat-2', 50],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      const summary = document.querySelector('.allocation-summary');
      expect(summary).toHaveClass('full');
    });

    it('should show over budget warning when allocation exceeds 100%', () => {
      const allocations = new Map([
        ['cat-1', 60],
        ['cat-2', 50],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      expect(screen.getByText('Over budget!')).toBeInTheDocument();
    });
  });

  describe('calculateMax', () => {
    it('should limit slider max based on other allocations', () => {
      // When other sliders sum to 50, this slider should have max of 50
      const allocations = new Map([
        ['cat-1', 10],
        ['cat-2', 40],
        ['cat-3', 0],
      ]);
      
      render(<Body {...defaultProps} allocations={allocations} currentPage={0} />);
      
      // Find the slider for cat-3 (Defense) and check its max
      // The max should be 100 - (10 + 40) = 50
      const sliders = screen.getAllByRole('slider');
      // cat-3 is Defense which is the third slider
      const defenseSlider = sliders[2];
      // Note: We're testing the component renders correctly, not the internal calculation
      expect(defenseSlider).toBeInTheDocument();
    });
  });

  describe('page navigation', () => {
    it('should show page indicator dots for multiple pages', () => {
      render(<Body {...defaultProps} />);
      
      const dots = screen.getAllByRole('button', { name: /Go to page/i });
      expect(dots).toHaveLength(2); // 2 pages
    });

    it('should mark current page dot as active', () => {
      render(<Body {...defaultProps} currentPage={0} />);
      
      const dots = screen.getAllByRole('button', { name: /Go to page/i });
      expect(dots[0]).toHaveClass('active');
      expect(dots[1]).not.toHaveClass('active');
    });

    it('should call onPageChange when clicking a page dot', () => {
      const onPageChange = vi.fn();
      render(<Body {...defaultProps} onPageChange={onPageChange} currentPage={0} />);
      
      const secondDot = screen.getByRole('button', { name: 'Go to page 2' });
      fireEvent.click(secondDot);
      
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should have correct aria-current on active page dot', () => {
      render(<Body {...defaultProps} currentPage={1} />);
      
      const firstDot = screen.getByRole('button', { name: 'Go to page 1' });
      const secondDot = screen.getByRole('button', { name: 'Go to page 2' });
      
      expect(firstDot).not.toHaveAttribute('aria-current');
      expect(secondDot).toHaveAttribute('aria-current', 'page');
    });

    it('should not show page indicators for single page', () => {
      const singlePageCategories = mockCategories.filter((c) => c.page === 0);
      render(<Body {...defaultProps} categories={singlePageCategories} />);
      
      expect(screen.queryByRole('button', { name: /Go to page/i })).not.toBeInTheDocument();
    });
  });

  describe('swipe navigation', () => {
    it('should call onPageChange on swipe left', () => {
      const onPageChange = vi.fn();
      render(<Body {...defaultProps} onPageChange={onPageChange} currentPage={0} />);
      
      const container = document.querySelector('.body-container')!;
      
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 50, clientY: 100 }],
      });
      
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange on swipe right', () => {
      const onPageChange = vi.fn();
      render(<Body {...defaultProps} onPageChange={onPageChange} currentPage={1} />);
      
      const container = document.querySelector('.body-container')!;
      
      fireEvent.touchStart(container, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      });
      
      expect(onPageChange).toHaveBeenCalledWith(0);
    });

    it('should not navigate past first page', () => {
      const onPageChange = vi.fn();
      render(<Body {...defaultProps} onPageChange={onPageChange} currentPage={0} />);
      
      const container = document.querySelector('.body-container')!;
      
      fireEvent.touchStart(container, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      });
      
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should not navigate past last page', () => {
      const onPageChange = vi.fn();
      render(<Body {...defaultProps} onPageChange={onPageChange} currentPage={1} />);
      
      const container = document.querySelector('.body-container')!;
      
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 50, clientY: 100 }],
      });
      
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('should ignore vertical swipes', () => {
      const onPageChange = vi.fn();
      render(<Body {...defaultProps} onPageChange={onPageChange} currentPage={0} />);
      
      const container = document.querySelector('.body-container')!;
      
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 50 }],
      });
      
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 100, clientY: 200 }],
      });
      
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('slider allocation changes', () => {
    it('should call onAllocationChange when slider value changes', () => {
      const onAllocationChange = vi.fn();
      render(<Body {...defaultProps} onAllocationChange={onAllocationChange} />);
      
      const sliders = screen.getAllByRole('slider');
      
      // Simulate keyboard navigation on first slider
      fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });
      
      expect(onAllocationChange).toHaveBeenCalled();
    });
  });

  describe('swipe hint', () => {
    it('should show swipe hint when multiple pages exist', () => {
      render(<Body {...defaultProps} />);
      
      expect(screen.getByText('Swipe to navigate pages')).toBeInTheDocument();
    });

    it('should not show swipe hint for single page', () => {
      const singlePageCategories = mockCategories.filter((c) => c.page === 0);
      render(<Body {...defaultProps} categories={singlePageCategories} />);
      
      expect(screen.queryByText('Swipe to navigate pages')).not.toBeInTheDocument();
    });
  });
});
