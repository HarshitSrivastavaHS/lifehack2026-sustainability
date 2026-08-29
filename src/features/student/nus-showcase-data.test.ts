import { describe, expect, it } from 'vitest';

import { eligibilityCutoff, hallTierForRank, isShowcaseEligible, showcaseRankForEmail } from './nus-showcase-data';

describe('NUS hall showcase rewards', () => {
  it('assigns wider eligibility to higher placed halls', () => {
    expect(hallTierForRank(1)).toMatchObject({ tier: 'Gold', eligiblePercent: 40 });
    expect(hallTierForRank(2)).toMatchObject({ tier: 'Silver', eligiblePercent: 30 });
    expect(hallTierForRank(3)).toMatchObject({ tier: 'Bronze', eligiblePercent: 20 });
    expect(hallTierForRank(7)).toMatchObject({ tier: 'Starter', eligiblePercent: 10 });
  });

  it('rounds the qualifying group up to a whole student', () => {
    expect(eligibilityCutoff(80, 30)).toBe(24);
    expect(eligibilityCutoff(53, 40)).toBe(22);
    expect(eligibilityCutoff(0, 10)).toBe(0);
  });

  it('only qualifies contributors inside their hall cutoff', () => {
    expect(showcaseRankForEmail('alice.morgan@commongrid.demo')).toBe(12);
    expect(isShowcaseEligible(12, 80, 30)).toBe(true);
    expect(isShowcaseEligible(29, 80, 30)).toBe(false);
  });
});
