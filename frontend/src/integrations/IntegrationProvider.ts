/**
 * MoodLens - Standard Integration Provider Adapter Interface (Spec Section 82)
 * Decouples the core ML and emotion engine from external third-party service providers.
 */
import { 
  SuggestionCategory, 
  SuggestionContext, 
  SuggestionItem 
} from '../../../shared/schemas/suggestion';
import { 
  UserApprovedAction, 
  ActionResult 
} from '../../../shared/schemas/action';

export interface IntegrationProvider {
  readonly id: string;
  readonly name: string;
  readonly category: SuggestionCategory;

  /**
   * Checks if the provider is currently available on the device/platform.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Performs OAuth or credential authorization if required by the service.
   */
  authorize(): Promise<boolean>;

  /**
   * Evaluates current emotion context to generate contextual suggestions.
   */
  suggest(context: SuggestionContext): Promise<SuggestionItem | null>;

  /**
   * Executes a user-approved action following explicit user confirmation.
   */
  execute(action: UserApprovedAction): Promise<ActionResult>;
}
