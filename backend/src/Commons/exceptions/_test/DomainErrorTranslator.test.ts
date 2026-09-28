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
  });
});
