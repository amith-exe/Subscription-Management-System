import { validate } from 'class-validator';
import { SignupDto } from './auth.dto';

describe('StrongPassword', () => {
  it('accepts a password with all required character classes', async () => { const dto = Object.assign(new SignupDto(), { email: 'a@example.com', name: 'A', password: 'ValidPass!9' }); expect(await validate(dto)).toHaveLength(0); });
  it('rejects weak passwords with a clear rule', async () => { const dto = Object.assign(new SignupDto(), { email: 'a@example.com', name: 'A', password: 'weakpassword' }); const errors = await validate(dto); expect(errors.some((error) => error.constraints?.strongPassword?.includes('uppercase'))).toBe(true); });
});
