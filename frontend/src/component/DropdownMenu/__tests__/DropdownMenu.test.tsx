import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DropdownMenu } from '../DropdownMenu'

// Oracle tests for the shared DropdownMenu component.
// Cover the post-refactor Option B contract (DOM-order roving focus,
// multi-ref useClickOutside hook). All active, no residual `it.skip`.

function Sample({ ariaLabel = 'Test menu' }: { ariaLabel?: string } = {}) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <button type="button">Open</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content ariaLabel={ariaLabel}>
        <DropdownMenu.Item>
          <button type="button">Item A</button>
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <button type="button">Item B</button>
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <button type="button">Item C</button>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

async function flushFocus() {
  // Content's useEffect schedules a requestAnimationFrame before focusing.
  // act() lets the RAF + microtasks flush.
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  })
}

describe('DropdownMenu — comportement actuel', () => {
  afterEach(() => cleanup())

  it('aria-haspopup / aria-expanded / aria-controls sont posés sur le trigger', () => {
    render(<Sample />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')
  })

  it('click trigger → menu ouvert, aria-expanded passe à true, role=menu accessible', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu', { name: 'Test menu' })).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
  })

  it('focus initial posé sur le 1er item après ouverture', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item A' }))
  })

  it('ArrowDown depuis item[0] → item[1] focus', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item B' }))
  })

  it('ArrowUp depuis item[0] wrap vers item[N-1]', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item C' }))
  })

  it('Home → item[0] ; End → item[N-1]', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    await user.keyboard('{End}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item C' }))

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item A' }))
  })

  it('Escape ferme le menu et rend le focus au trigger', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await flushFocus()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('click outside ferme le menu', async () => {
    const user = userEvent.setup()
    const outsideClick = vi.fn()
    render(
      <div>
        <Sample />
        <button type="button" onClick={outsideClick}>
          Outside
        </button>
      </div>
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Outside' }))

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
    // Tap-block: capture-phase intercept swallows the click so the underlying
    // button's onClick never fires — no surprise navigation on mobile.
    expect(outsideClick).not.toHaveBeenCalled()
  })

  // D1 — a menu portaled into a <dialog open> must attach to the dialog (top
  // layer), not document.body. triggerRef is read outside render
  // (useLayoutEffect), target frozen at open time so a concurrent dialog close
  // doesn't teleport the menu and lose focus.
  it('D1 — menu portalisé dans <dialog open> rejoint le dialog, pas document.body', async () => {
    const user = userEvent.setup()
    render(
      <dialog open data-testid="host-dialog">
        <Sample />
      </dialog>
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))

    const menu = screen.getByRole('menu', { name: 'Test menu' })
    const dialog = screen.getByTestId('host-dialog')
    expect(dialog.contains(menu)).toBe(true)
    expect(menu.closest('dialog')).toBe(dialog)
  })

  it("sélection d'un item appelle onSelect puis ferme le menu", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content ariaLabel="Test">
          <DropdownMenu.Item onSelect={onSelect}>
            <button type="button">Pick</button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('menuitem', { name: 'Pick' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })
})

describe('DropdownMenu — contrats post-fix (D-findings shipped)', () => {
  afterEach(() => cleanup())

  // D9 — ArrowDown on the trigger must open the menu and focus item[0].
  // ARIA APG Menu Button pattern.
  it('D9 — ArrowDown sur trigger ouvre menu + focus item[0]', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    await flushFocus()

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item A' }))
  })

  it('D9 — ArrowUp sur trigger ouvre menu + focus dernier item', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    trigger.focus()
    await user.keyboard('{ArrowUp}')
    await flushFocus()

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item C' }))
  })

  // D10 — aria-orientation="vertical" on role="menu".
  it('D10 — role=menu porte aria-orientation="vertical"', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('menu')).toHaveAttribute('aria-orientation', 'vertical')
  })

  // D4 — items have tabIndex=-1 (roving tabIndex pattern).
  it('D4 — chaque menuitem porte tabIndex=-1', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    screen.getAllByRole('menuitem').forEach((item) => {
      expect(item).toHaveAttribute('tabindex', '-1')
    })
  })

  // D2 — kb nav survives a parent re-render. With DOM-order roving, the source
  // of truth is the current DOM (querySelectorAll), not an itemsRef mutated by
  // registration callbacks — no more wipe risk between re-renders.
  it('D2 — kb nav reste fonctionnelle après re-render parent', async () => {
    function Wrapper({ tick }: { tick: number }) {
      return (
        <div data-tick={tick}>
          <Sample />
        </div>
      )
    }
    const user = userEvent.setup()
    const { rerender } = render(<Wrapper tick={0} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    rerender(<Wrapper tick={1} />)

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Item B' }))
  })

  // Tab closes the menu and returns focus to the trigger.
  it('Tab ferme le menu et rend le focus au trigger', async () => {
    const user = userEvent.setup()
    render(<Sample />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await flushFocus()

    await user.keyboard('{Tab}')

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
    expect(document.activeElement).toBe(trigger)
  })

  // DOM-order roving — items inside a Fragment aren't "hidden" by a component
  // wrapper. Children.toArray + a `child.type === DropdownMenuItem` check would
  // have skipped them; querySelectorAll sees them because the role is set by
  // cloneElement on the final element.
  it('items dans Fragment — kb nav traverse correctement', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content ariaLabel="Fragment menu">
          {/* biome-ignore lint/complexity/noUselessFragments: this test asserts the Fragment-wrapped Items path */}
          <>
            <DropdownMenu.Item>
              <button type="button">Frag A</button>
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <button type="button">Frag B</button>
            </DropdownMenu.Item>
          </>
        </DropdownMenu.Content>
      </DropdownMenu>
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Frag A' }))

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Frag B' }))
  })

  // Conditional remount — an item removed then re-added between two opens must
  // be accounted for. The live DOM read carries no stale state.
  it("items conditionnels — kb nav reflète l'ordre DOM courant après remount", async () => {
    function Conditional({ extra }: { extra: boolean }) {
      return (
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content ariaLabel="Conditional">
            <DropdownMenu.Item>
              <button type="button">Always</button>
            </DropdownMenu.Item>
            {extra && (
              <DropdownMenu.Item>
                <button type="button">Extra</button>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item>
              <button type="button">Tail</button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      )
    }

    const user = userEvent.setup()
    const { rerender } = render(<Conditional extra={false} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await flushFocus()

    // Without 'Extra': Always → Tail.
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tail' }))

    // Remount with 'Extra' present (without closing the menu).
    rerender(<Conditional extra={true} />)

    // Focus stayed on Tail (last known item). End → still last.
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tail' }))

    // Home → first item (Always), ArrowDown → Extra (new, at position 2).
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Always' }))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Extra' }))
  })
})
