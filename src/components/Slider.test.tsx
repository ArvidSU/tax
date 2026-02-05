import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';

const defaultProps = {
  id: 'test-slider',
  name: 'Healthcare',
  description: 'Funds healthcare programs',
  value: 25,
  max: 75,
  color: '#ef4444',
  isExpanded: false,
  hasChildren: false,
  onChange: vi.fn(),
  onClick: vi.fn(),
};

describe('Slider', () => {
  describe('rendering', () => {
    it('should render the slider with correct name', () => {
      render(<Slider {...defaultProps} />);
      
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });

    it('should display the current value as percentage', () => {
      render(<Slider {...defaultProps} value={42} />);
      
      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      render(<Slider {...defaultProps} value={30} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '30');
      expect(slider).toHaveAttribute('aria-valuetext', 'Healthcare: 30%');
      expect(slider).toHaveAttribute('aria-label', 'Healthcare allocation slider');
    });

    it('should have correct expanded state in ARIA', () => {
      const { rerender } = render(<Slider {...defaultProps} isExpanded={false} />);
      
      expect(screen.getByRole('slider')).toHaveAttribute('aria-expanded', 'false');
      
      rerender(<Slider {...defaultProps} isExpanded={true} />);
      
      expect(screen.getByRole('slider')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('description expansion', () => {
    it('should show description when expanded', () => {
      render(<Slider {...defaultProps} isExpanded={true} />);
      
      expect(screen.getByText('Funds healthcare programs')).toBeInTheDocument();
    });

    it('should have aria-describedby when expanded', () => {
      render(<Slider {...defaultProps} isExpanded={true} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-describedby', 'test-slider-description');
    });

    it('should not have aria-describedby when collapsed', () => {
      render(<Slider {...defaultProps} isExpanded={false} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).not.toHaveAttribute('aria-describedby');
    });

    it('should show delete button when category is deletable', () => {
      render(<Slider {...defaultProps} isExpanded={true} canDeleteCategory={true} />);

      expect(
        screen.getByRole('button', { name: 'Delete Healthcare category' })
      ).toBeInTheDocument();
    });

    it('should call onDeleteCategory when delete button is clicked', () => {
      const onDeleteCategory = vi.fn();
      render(
        <Slider
          {...defaultProps}
          isExpanded={true}
          canDeleteCategory={true}
          onDeleteCategory={onDeleteCategory}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Delete Healthcare category' }));
      expect(onDeleteCategory).toHaveBeenCalled();
    });

    it('should show color picker and edit button when editable', () => {
      render(<Slider {...defaultProps} isExpanded={true} canEditCategory={true} />);

      expect(screen.getByLabelText('Pick color for Healthcare')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit Healthcare category' })).toBeInTheDocument();
    });

    it('should edit description and call onUpdateCategory when saved', () => {
      const onUpdateCategory = vi.fn();

      render(
        <Slider
          {...defaultProps}
          isExpanded={true}
          canEditCategory={true}
          onUpdateCategory={onUpdateCategory}
        />
      );

      fireEvent.change(screen.getByLabelText('Pick color for Healthcare'), {
        target: { value: '#123456' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Edit Healthcare category' }));
      fireEvent.change(screen.getByLabelText('Edit Healthcare description'), {
        target: { value: 'Updated description' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Edit Healthcare category' }));

      expect(onUpdateCategory).toHaveBeenCalledWith({
        description: 'Updated description',
        color: '#123456',
      });
    });

    it('should update visible slider color when color picker changes', () => {
      render(<Slider {...defaultProps} isExpanded={true} canEditCategory={true} />);

      fireEvent.change(screen.getByLabelText('Pick color for Healthcare'), {
        target: { value: '#123456' },
      });

      expect(screen.getByRole('slider')).toHaveStyle({ '--slider-color': '#123456' });
    });
  });

  describe('keyboard navigation', () => {
    it('should increase value with ArrowRight', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={25} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      
      expect(onChange).toHaveBeenCalledWith(26);
    });

    it('should increase value with ArrowUp', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={25} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowUp' });
      
      expect(onChange).toHaveBeenCalledWith(26);
    });

    it('should decrease value with ArrowLeft', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={25} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      
      expect(onChange).toHaveBeenCalledWith(24);
    });

    it('should decrease value with ArrowDown', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={25} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowDown' });
      
      expect(onChange).toHaveBeenCalledWith(24);
    });

    it('should step by 10 when holding Shift', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={25} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
      
      expect(onChange).toHaveBeenCalledWith(35);
    });

    it('should go to minimum with Home key', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={50} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'Home' });
      
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('should go to maximum with End key', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={25} max={75} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'End' });
      
      expect(onChange).toHaveBeenCalledWith(75);
    });

    it('should toggle expansion with Enter key', () => {
      const onClick = vi.fn();
      render(<Slider {...defaultProps} onClick={onClick} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'Enter' });
      
      expect(onClick).toHaveBeenCalled();
    });

    it('should toggle expansion with Space key', () => {
      const onClick = vi.fn();
      render(<Slider {...defaultProps} onClick={onClick} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: ' ' });
      
      expect(onClick).toHaveBeenCalled();
    });

    it('should not exceed max value', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={75} max={75} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      
      // Value should not change if already at max
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not go below 0', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={0} onChange={onChange} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      
      // Value should not change if already at 0
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicking on slider bar', () => {
      const onClick = vi.fn();
      render(<Slider {...defaultProps} onClick={onClick} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.click(slider);
      
      expect(onClick).toHaveBeenCalled();
    });

    it('should not call onChange when pointer down on slider bar', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.pointerDown(slider, { clientX: 200, button: 0, pointerType: 'mouse' });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('style calculations', () => {
    it('should set slider color as CSS variable', () => {
      render(<Slider {...defaultProps} color="#3b82f6" />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveStyle({ '--slider-color': '#3b82f6' });
    });

    it('should cap display value at 100%', () => {
      render(<Slider {...defaultProps} value={120} />);
      
      // The fill width should still be based on min(value, 100)
      const fill = document.querySelector('.slider-fill');
      expect(fill).toHaveStyle({ width: '100%' });
    });
  });
});
