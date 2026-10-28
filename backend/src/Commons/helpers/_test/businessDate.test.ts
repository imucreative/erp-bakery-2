import { toJakartaBusinessDate } from '../businessDate';

describe('toJakartaBusinessDate', () => {
  it('keeps UTC instants before 17:00 on the same Jakarta date', () => {
    expect(toJakartaBusinessDate(new Date('2026-10-27T16:59:59.999Z'))).toBe('2026-10-27');
  });

  it('moves UTC instants at 17:00 to the next Jakarta date', () => {
    expect(toJakartaBusinessDate(new Date('2026-10-27T17:00:00.000Z'))).toBe('2026-10-28');
  });
});
