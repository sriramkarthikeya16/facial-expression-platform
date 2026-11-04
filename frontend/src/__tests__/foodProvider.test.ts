import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FoodProvider, FOOD_PLATFORMS } from '../integrations/FoodProvider';
import { SuggestionContext } from '../../../shared/schemas/suggestion';

describe('FoodProvider Multi-Platform Dynamic Integration', () => {
  const provider = new FoodProvider();

  test('contains configuration for swiggy, zomato, ubereats, and doordash', () => {
    assert.ok(FOOD_PLATFORMS.swiggy);
    assert.ok(FOOD_PLATFORMS.zomato);
    assert.ok(FOOD_PLATFORMS.ubereats);
    assert.ok(FOOD_PLATFORMS.doordash);
    assert.equal(FOOD_PLATFORMS.swiggy.url, 'https://www.swiggy.com');
    assert.equal(FOOD_PLATFORMS.zomato.url, 'https://www.zomato.com');
  });

  test('suggests comfort snack break for angry expression after 3 seconds', async () => {
    const context: SuggestionContext = {
      expression: 'angry',
      confidence: 0.80,
      durationSeconds: 3.5,
      qualityScore: 0.9,
    };

    const item = await provider.suggest(context);
    assert.ok(item !== null);
    assert.equal(item.category, 'food');
    assert.equal(item.requires_confirmation, true);
    assert.ok(item.action_payload?.deepLink);
  });

  test('rejects unconfirmed food delivery action', async () => {
    const result = await provider.execute({
      action_id: 'act_food_test',
      action_token: 'tok_test',
      action_type: 'open_food_app',
      confirmed_by_user: false,
      confirmed_at: Date.now(),
    });

    assert.equal(result.success, false);
    assert.equal(result.result_code, 'USER_CANCELLED');
  });
});
