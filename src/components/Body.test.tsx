import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Body } from './Body';

const mockCategories = [
  { _id: 'cat-1', name: 'Healthcare', description: 'Health programs', color: '#ef4444', order: 0, depth: 0, hasChildren: true },
  { _id: 'cat-2', name: 'Education', description: 'Education programs', color: '#3b82f6', order: 1, depth: 0, hasChildren: true },
  { _id: 'cat-3', name: 'Defense', description: 'Military spending', color: '#6b7280', order: 2, depth: 0, hasChildren: false },
  // Child categories
  { _id: 'cat-4', name: 'Medicare', description: 'Medicare programs', color: '#ef4444', order: 0, depth: 1, hasChildren: false, parentId: 'cat-1' },
  { _id: 'cat-5', name: 'Medicaid', description: 'Medicaid programs', color: '#dc2626', order: 1, depth: 1, hasChildren: false, parentId: 'cat-1' },
];

const defaultProps = {
  categories: mockCategories,
  allocations: new Map<string, number>(),
  currentParentId: null,
  breadcrumbPath: [],
  onAllocationChange: vi.fn(),
  onNavigate: vi.fn(),
  onCreateCategory: vi.fn(),
  onDeleteCategory: vi.fn(),
  onUpdateCategory: vi.fn(),
  canDeleteCategory: vi.fn(() => false),
  canEditCategory: vi.fn(() => false),
  canCreateCategories: true,
  unit: 'USD',
  symbol: '$',
  symbolPosition: 'prefix' as const,
  allocationTotal: 100,
};

describe('Body', () => {
  describe('rendering', () => {
    it('should render root categories when at root level', () => {
      render(<Body {...defaultProps} currentParentId={null} />);
      
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
      expect(screen.getByText('Education')).toBeInTheDocument();
      expect(screen.getByText('Defense')).toBeInTheDocument();
    });

    it('should render child categories when navigated to a parent', () => {
      render(<Body {...defaultProps} currentParentId="cat-1" />);
      
      expect(screen.getByText('Medicare')).toBeInTheDocument();
      expect(screen.getByText('Medicaid')).toBeInTheDocument();
      // Root categories should not be visible
      expect(screen.queryByText('Education')).not.toBeInTheDocument();
    });

    it('should show message when no categories at level', () => {
      render(<Body {...defaultProps} currentParentId="cat-3" />);
      
      expect(screen.getByText('No sub-categories available')).toBeInTheDocument();
    });
  });

  describe('allocation display', () => {
    it('should show 0% in allocation summary when no allocations set', () => {
      render(<Body {...defaultProps} />);
      
      const summary = document.querySelector('.allocation-percentage');
      expect(summary).toHaveTextContent('0%');
    });

    it('should calculate total allocation for current level', () => {
      const allocations = new Map<string, number>([
        ['cat-1', 30],
        ['cat-2', 50],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should show warning status when near 100%', () => {
      const allocations = new Map<string, number>([
        ['cat-1', 60],
        ['cat-2', 35],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      const summary = document.querySelector('.allocation-summary');
      expect(summary).toHaveClass('warning');
    });

    it('should show full status when at 100%', () => {
      const allocations = new Map<string, number>([
        ['cat-1', 50],
        ['cat-2', 30],
        ['cat-3', 20],
      ]);
      render(<Body {...defaultProps} allocations={allocations} />);
      
      const summary = document.querySelector('.allocation-summary');
      expect(summary).toHaveClass('full');
    });

    it('should base child absolute units on the current level total', () => {
      const allocations = new Map<string, number>([
        ['cat-4', 50],
      ]);
      const breadcrumbPath = [{ id: 'cat-1', name: 'Healthcare' }];

      render(
        <Body
          {...defaultProps}
          allocations={allocations}
          currentParentId="cat-1"
          breadcrumbPath={breadcrumbPath}
          allocationTotal={100}
        />
      );

      expect(screen.getByText('$50')).toBeInTheDocument();
      expect(screen.getByText('USD • $50 / $100')).toBeInTheDocument();
    });
  });

  describe('breadcrumb', () => {
    it('should show Home in breadcrumb at root level', () => {
      render(<Body {...defaultProps} currentParentId={null} breadcrumbPath={[]} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should show path in breadcrumb when navigated', () => {
      const breadcrumbPath = [
        { id: 'cat-1', name: 'Healthcare' },
      ];
      render(<Body {...defaultProps} currentParentId="cat-1" breadcrumbPath={breadcrumbPath} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });
  });

  describe('level info', () => {
    it('should show correct level number and category count', () => {
      render(<Body {...defaultProps} currentParentId={null} />);
      
      expect(screen.getByText(/Level 1/)).toBeInTheDocument();
      expect(screen.getByText(/3 categories/)).toBeInTheDocument();
    });

    it('should show Level 2 when navigated to children', () => {
      const breadcrumbPath = [{ id: 'cat-1', name: 'Healthcare' }];
      render(<Body {...defaultProps} currentParentId="cat-1" breadcrumbPath={breadcrumbPath} />);
      
      expect(screen.getByText(/Level 2/)).toBeInTheDocument();
    });
  });
});
