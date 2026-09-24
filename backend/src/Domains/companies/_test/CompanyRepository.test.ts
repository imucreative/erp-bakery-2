import { CompanyRepository } from '../CompanyRepository';
import { RegisterCompany } from '../entities/RegisterCompany';

/**
 * Tests that CompanyRepository abstract methods throw the correct
 * error when not implemented — mirrors sample-be UserRepository.test.js pattern.
 */
describe('CompanyRepository (abstract contract)', () => {
  class TestCompanyRepository extends CompanyRepository {
    async addCompany(_data: RegisterCompany): Promise<never> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async verifyAvailableSlug(_slug: string): Promise<never> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async getCompanyById(_id: string): Promise<never> {
      throw new Error('NOT_IMPLEMENTED');
    }
    async generateCompanyCode(): Promise<never> {
      throw new Error('NOT_IMPLEMENTED');
    }
  }

  const repo = new TestCompanyRepository();
  const dummyRegisterCompany = new RegisterCompany({
    name: 'Test',
    slug: 'test',
    ownerName: 'Owner',
    ownerEmail: 'owner@test.com',
    ownerPassword: 'Secret123',
  });

  it('addCompany should throw when not implemented', async () => {
    await expect(repo.addCompany(dummyRegisterCompany)).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('verifyAvailableSlug should throw when not implemented', async () => {
    await expect(repo.verifyAvailableSlug('slug')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('getCompanyById should throw when not implemented', async () => {
    await expect(repo.getCompanyById('id')).rejects.toThrow('NOT_IMPLEMENTED');
  });

  it('generateCompanyCode should throw when not implemented', async () => {
    await expect(repo.generateCompanyCode()).rejects.toThrow('NOT_IMPLEMENTED');
  });
});
