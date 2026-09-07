import { describe, expect, it } from 'vitest';
import { appPath } from './appPath';

describe('appPath', () => {
  it('prefixes a bare officer link from the server', () => {
    expect(appPath('/complaint/12')).toBe('/app/complaint/12');
  });

  it('leaves an already-prefixed link alone', () => {
    expect(appPath('/app/complaint/12')).toBe('/app/complaint/12');
  });
});
