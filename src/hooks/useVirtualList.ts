import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseVirtualListOptions {
  totalCount: number;
  rowHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualList({
  totalCount,
  rowHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualListOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const maxScroll = Math.max(0, totalCount * rowHeight - containerHeight);
    if (scrollTop > maxScroll && scrollRef.current) {
      scrollRef.current.scrollTop = maxScroll;
      setScrollTop(maxScroll);
    }
  }, [totalCount, rowHeight, containerHeight, scrollTop]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const range = useMemo(() => {
    if (totalCount === 0) {
      return { startIndex: 0, endIndex: -1, totalHeight: 0, offsetTop: 0 };
    }
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      totalCount - 1,
      startIndex + visibleCount + overscan * 2,
    );
    return {
      startIndex,
      endIndex,
      totalHeight: totalCount * rowHeight,
      offsetTop: startIndex * rowHeight,
    };
  }, [totalCount, rowHeight, containerHeight, overscan, scrollTop]);

  return { scrollRef, onScroll, ...range };
}
