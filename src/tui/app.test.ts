import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderOptions } from './app.tsx'

describe('renderOptions', () => {
  it('takes over the alternate screen', () => {
    // Without alternateScreen Ink renders into the primary buffer: the shell's
    // prior content stays behind the UI and is still on screen after quitting.
    assert.equal(renderOptions().alternateScreen, true)
  })

  it('leaves the console alone', () => {
    // gh may write to the console; the UI must not swallow or re-render it.
    assert.equal(renderOptions().patchConsole, false)
  })
})
