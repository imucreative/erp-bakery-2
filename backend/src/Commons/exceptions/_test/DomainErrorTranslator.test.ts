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
  });
});
