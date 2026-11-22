import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useListPosition, useTrackedForm, WorkspaceMemory } from './workspaceExperience';
import type { ReactNode } from 'react';

describe('pending form changes', () => {
  it('distinguishes loaded or saved values from edits, including functional updates', () => {
    const { result } = renderHook(() => useTrackedForm({ name: '' }));
    act(() => result.current[1]({ name: 'Loaded customer' }));
    expect(result.current[3]).toBe(false);
    act(() => result.current[2]((value) => ({ ...value, name: 'Changed customer' })));
    expect(result.current[3]).toBe(true);
    act(() => result.current[2]({ name: 'Loaded customer' }));
    expect(result.current[3]).toBe(false);
    act(() => result.current[2]({ name: 'Saved customer' }));
    act(() => result.current[1]((value) => value));
    expect(result.current[3]).toBe(false);
    expect(result.current[0].name).toBe('Saved customer');
  });

  it('restores the list position, including the top, after leaving its detail', () => {
    const memory = new Map<string, unknown>([['list.scroll', 0]]);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(500);
    const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceMemory.Provider value={memory}>{children}</WorkspaceMemory.Provider>;
    const { rerender, unmount } = renderHook(({ visible }) => useListPosition('list.scroll', visible), { initialProps: { visible: true }, wrapper });
    expect(scroll).toHaveBeenCalledWith(0, 0);
    scrollY.mockReturnValue(250);
    act(() => window.dispatchEvent(new Event('scroll')));
    rerender({ visible: false });
    scrollY.mockReturnValue(800);
    rerender({ visible: true });
    expect(scroll).toHaveBeenLastCalledWith(0, 250);
    unmount();
    vi.restoreAllMocks();
  });
});
