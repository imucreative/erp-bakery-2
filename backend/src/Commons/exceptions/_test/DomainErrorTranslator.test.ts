import DomainErrorTranslator from '../DomainErrorTranslator';
import { InvariantError } from '../InvariantError';
import { AuthenticationError } from '../AuthenticationError';
import { AuthorizationError } from '../AuthorizationError';
import { NotFoundError } from '../NotFoundError';
import { ConflictError } from '../ConflictError';

describe('DomainErrorTranslator', () => {
  describe('translate', () => {
    it('should return original error if no translation found', () => {
      const error = new Error('UNKNOWN_ERROR_CODE');
      const result = DomainErrorTranslator.translate(error);

      expect(result).toBe(error);
    });

    it('should translate REGISTER_COMPANY errors to InvariantError', () => {
      const cases = [
        'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY',
        'REGISTER_COMPANY.NOT_MEET_DATA_TYPE_SPECIFICATION',
        'REGISTER_COMPANY.NAME_LIMIT_CHAR',
        'REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate REGISTER_USER errors to InvariantError', () => {
      const cases = [
        'REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY',
        'REGISTER_USER.NOT_MEET_DATA_TYPE_SPECIFICATION',
        'REGISTER_USER.EMAIL_LIMIT_CHAR',
        'REGISTER_USER.INVALID_EMAIL_FORMAT',
        'REGISTER_USER.NAME_LIMIT_CHAR',
        'REGISTER_USER.PASSWORD_MIN_LENGTH',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate USER_LOGIN errors to InvariantError', () => {
      const cases = [
        'USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY',
        'USER_LOGIN.NOT_MEET_DATA_TYPE_SPECIFICATION',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate REFRESH_AUTHENTICATION errors to InvariantError', () => {
      const cases = [
        'REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN',
        'REFRESH_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate AUTHENTICATION errors to AuthenticationError', () => {
      const cases = [
        'AUTHENTICATION.CREDENTIALS_NOT_VALID',
        'AUTHENTICATION.TOKEN_NOT_VALID',
        'AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(AuthenticationError);
      });
    });

    it('should translate AUTHORIZATION.ACCESS_DENIED to AuthorizationError', () => {
      const result = DomainErrorTranslator.translate(
        new Error('AUTHORIZATION.ACCESS_DENIED'),
      );
      expect(result).toBeInstanceOf(AuthorizationError);
    });

    it('should translate NOT_FOUND errors to NotFoundError', () => {
      const cases = ['USER.NOT_FOUND', 'COMPANY.NOT_FOUND', 'ROLE.NOT_FOUND', 'OUTLET.NOT_FOUND'];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(NotFoundError);
      });
    });

    it('should translate conflict errors to ConflictError', () => {
      const cases = ['USER.EMAIL_ALREADY_USED', 'COMPANY.SLUG_ALREADY_USED'];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(ConflictError);
      });
    });

    it('should translate inventory validation errors to InvariantError', () => {
      const cases = [
        'INVENTORY.INVALID_MOVEMENT_TYPE',
        'INVENTORY.INVALID_BATCH_STATUS',
        'INVENTORY.INSUFFICIENT_STOCK',
        'INVENTORY_BATCH.NOT_CONTAIN_NEEDED_PROPERTY',
        'FEFO.NOT_CONTAIN_NEEDED_PROPERTY',
        'FEFO.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION',
        'FEFO.QTY_MUST_BE_POSITIVE',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate INVENTORY_BATCH.NOT_FOUND to NotFoundError', () => {
      const result = DomainErrorTranslator.translate(new Error('INVENTORY_BATCH.NOT_FOUND'));
      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should translate INVENTORY.DUPLICATE_MOVEMENT_SOURCE to ConflictError', () => {
      const result = DomainErrorTranslator.translate(
        new Error('INVENTORY.DUPLICATE_MOVEMENT_SOURCE'),
      );
      expect(result).toBeInstanceOf(ConflictError);
    });

    it('should translate stock adjustment validation errors to InvariantError', () => {
      const cases = [
        'CREATE_STOCK_ADJUSTMENT.NOT_CONTAIN_NEEDED_PROPERTY',
        'CREATE_STOCK_ADJUSTMENT.ITEMS_REQUIRED',
        'CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_DIRECTION',
        'CREATE_STOCK_ADJUSTMENT.ITEM_QTY_MUST_BE_POSITIVE',
        'CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_REASON',
        'CREATE_STOCK_ADJUSTMENT.BATCH_OUTLET_MISMATCH',
        'CREATE_STOCK_ADJUSTMENT.BATCH_PRODUCT_MISMATCH',
        'STOCK_ADJUSTMENT.ONLY_DRAFT_EDITABLE',
        'STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION',
        'STOCK_ADJUSTMENT.INVALID_STATUS',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate STOCK_ADJUSTMENT.NOT_FOUND to NotFoundError', () => {
      const result = DomainErrorTranslator.translate(new Error('STOCK_ADJUSTMENT.NOT_FOUND'));
      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should translate stock transfer validation errors to InvariantError', () => {
      const cases = [
        'CREATE_STOCK_TRANSFER.NOT_CONTAIN_NEEDED_PROPERTY',
        'CREATE_STOCK_TRANSFER.SAME_OUTLET',
        'CREATE_STOCK_TRANSFER.ITEMS_REQUIRED',
        'CREATE_STOCK_TRANSFER.ITEM_QTY_MUST_BE_POSITIVE',
        'CREATE_STOCK_TRANSFER.BATCH_OUTLET_MISMATCH',
        'CREATE_STOCK_TRANSFER.BATCH_PRODUCT_MISMATCH',
        'STOCK_TRANSFER.ONLY_DRAFT_EDITABLE',
        'STOCK_TRANSFER.INVALID_STATUS_TRANSITION',
        'STOCK_TRANSFER.INVALID_STATUS',
      ];

      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate STOCK_TRANSFER.NOT_FOUND to NotFoundError', () => {
      const result = DomainErrorTranslator.translate(new Error('STOCK_TRANSFER.NOT_FOUND'));
      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should translate stock opname validation errors to InvariantError', () => {
      const cases = [
        'CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY',
        'RECORD_COUNT.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION',
        'RECORD_COUNT.QTY_MUST_BE_NON_NEGATIVE',
        'STOCK_OPNAME.INVALID_STATUS_TRANSITION',
        'STOCK_OPNAME.INVALID_STATUS',
        'STOCK_OPNAME.NOT_COUNTING',
      ];
      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate STOCK_OPNAME.NOT_FOUND / ITEM_NOT_FOUND to NotFoundError', () => {
      expect(
        DomainErrorTranslator.translate(new Error('STOCK_OPNAME.NOT_FOUND')),
      ).toBeInstanceOf(NotFoundError);
      expect(
        DomainErrorTranslator.translate(new Error('STOCK_OPNAME.ITEM_NOT_FOUND')),
      ).toBeInstanceOf(NotFoundError);
    });

    it('should translate STOCK_OPNAME.OUTLET_LOCKED to ConflictError', () => {
      const result = DomainErrorTranslator.translate(new Error('STOCK_OPNAME.OUTLET_LOCKED'));
      expect(result).toBeInstanceOf(ConflictError);
    });

    it('should translate recipe validation errors to InvariantError', () => {
      const cases = [
        'CREATE_RECIPE.NOT_CONTAIN_NEEDED_PROPERTY',
        'CREATE_RECIPE.YIELD_MUST_BE_POSITIVE',
        'CREATE_RECIPE.ITEMS_REQUIRED',
        'CREATE_RECIPE.ITEM_LOSS_OUT_OF_RANGE',
        'CREATE_RECIPE.INGREDIENT_IS_FINISHED_PRODUCT',
        'CREATE_RECIPE.DUPLICATE_INGREDIENT',
        'RECIPE.ONLY_DRAFT_EDITABLE',
        'RECIPE.INVALID_STATUS_TRANSITION',
        'RECIPE.INVALID_STATUS',
      ];
      cases.forEach((code) => {
        const result = DomainErrorTranslator.translate(new Error(code));
        expect(result).toBeInstanceOf(InvariantError);
      });
    });

    it('should translate RECIPE.NOT_FOUND / NO_ACTIVE_RECIPE to NotFoundError', () => {
      expect(DomainErrorTranslator.translate(new Error('RECIPE.NOT_FOUND'))).toBeInstanceOf(
        NotFoundError,
      );
      expect(
        DomainErrorTranslator.translate(new Error('RECIPE.NO_ACTIVE_RECIPE')),
      ).toBeInstanceOf(NotFoundError);
    });

    it('should translate RECIPE.ACTIVE_ALREADY_EXISTS to ConflictError', () => {
      const result = DomainErrorTranslator.translate(new Error('RECIPE.ACTIVE_ALREADY_EXISTS'));
      expect(result).toBeInstanceOf(ConflictError);
    });

    it('should translate SALES_ORDER.STOCK_EXPIRED to InvariantError with a production hint', () => {
      const result = DomainErrorTranslator.translate(new Error('SALES_ORDER.STOCK_EXPIRED'));

      expect(result).toBeInstanceOf(InvariantError);
      expect((result as InvariantError).statusCode).toBe(400);
      expect(result.message).toContain('kedaluwarsa');
      expect(result.message).toContain('Production Order');
    });
  });
});
