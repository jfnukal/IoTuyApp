declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
  }

  export interface ResponsiveProps {
    className?: string;
    layouts?: { [key: string]: Layout[] };
    breakpoints?: { [key: string]: number };
    cols?: { [key: string]: number };
    rowHeight?: number;
    onLayoutChange?: (
      layout: Layout[],
      layouts: { [key: string]: Layout[] }
    ) => void;
    isDraggable?: boolean;
    isResizable?: boolean;
    useCSSTransforms?: boolean;
    preventCollision?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    measureBeforeMount?: boolean;
    children?: React.ReactNode;
  }

  export const Responsive: React.ComponentType<ResponsiveProps>;
  export function WidthProvider<T>(
    component: React.ComponentType<T>
  ): React.ComponentType<T>;
}
